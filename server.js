const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3080;

// JWT Secret (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

// Optional auth middleware (for public routes that can also be authenticated)
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId;
      req.userEmail = decoded.email;
    } catch (err) {
      // Invalid token, continue without auth
    }
  }
  next();
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// IMAGE UPLOAD API
// ============================================

// Upload image by file (base64 data URL)
app.post('/api/upload-image', async (req, res) => {
  try {
    const { image, campaignId } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Extract base64 data from data URL
    const matches = image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    const ext = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const filepath = path.join(uploadsDir, filename);

    // Save file
    fs.writeFileSync(filepath, buffer);

    // Return URL
    const fileUrl = `/uploads/${filename}`;
    res.json({
      success: 1,
      file: {
        url: fileUrl,
        size: buffer.length,
        name: filename
      }
    });
  } catch (err) {
    console.error('Image upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Fetch image by URL (for external images)
app.post('/api/fetch-image', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'No URL provided' });
    }

    // For external URLs, just validate and return the same URL
    // In production, you might want to download and host the image yourself
    res.json({
      success: 1,
      file: {
        url: url
      }
    });
  } catch (err) {
    console.error('Image fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Fetch link preview (for link tool)
app.post('/api/fetch-link', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'No URL provided' });
    }

    // Simple response - in production, you'd fetch actual metadata
    res.json({
      success: 1,
      meta: {
        title: url,
        description: '',
        image: { url: '' }
      }
    });
  } catch (err) {
    console.error('Link fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// AUTHENTICATION API
// ============================================

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = db.createUser(email, passwordHash, name || '');

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const user = db.getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      created_at: user.created_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// SHARING API
// ============================================

// Share a resource with another user
app.post('/api/shares', authenticateToken, async (req, res) => {
  try {
    const { resourceType, resourceId, sharedWithEmail, permission } = req.body;
    
    if (!resourceType || !resourceId || !sharedWithEmail) {
      return res.status(400).json({ error: 'Resource type, resource ID, and shared with email are required' });
    }
    
    // Check if current user owns the resource
    const access = db.canAccessResource(resourceType, resourceId, req.userId);
    if (!access.canAccess || !access.isOwner) {
      return res.status(403).json({ error: 'You can only share resources you own' });
    }
    
    // Find user to share with
    const targetUser = db.getUserByEmail(sharedWithEmail);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found with that email' });
    }
    
    if (targetUser.id === req.userId) {
      return res.status(400).json({ error: 'Cannot share with yourself' });
    }
    
    // Create share
    const shares = db.createShare(
      resourceType, 
      resourceId, 
      req.userId, 
      targetUser.id, 
      permission || 'view'
    );
    
    res.json({ success: true, shares });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Already shared with this user' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get shares for a resource
app.get('/api/shares/:resourceType/:resourceId', authenticateToken, (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    
    // Check if user owns the resource
    const access = db.canAccessResource(resourceType, parseInt(resourceId), req.userId);
    if (!access.canAccess || !access.isOwner) {
      return res.status(403).json({ error: 'Only owners can view shares' });
    }
    
    const shares = db.getSharesForResource(resourceType, parseInt(resourceId), req.userId);
    res.json(shares);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a share
app.delete('/api/shares/:shareId', authenticateToken, (req, res) => {
  try {
    db.deleteShare(parseInt(req.params.shareId));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get resources shared with me
app.get('/api/shared-with-me', authenticateToken, (req, res) => {
  try {
    const lists = db.getSharedResourcesForUser(req.userId, 'lists');
    const templates = db.getSharedResourcesForUser(req.userId, 'templates');
    const campaigns = db.getSharedResourcesForUser(req.userId, 'campaigns');
    
    res.json({ lists, templates, campaigns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// CONTACTS API
// ============================================

app.get('/api/contacts', authenticateToken, (req, res) => {
  try {
    const { search, tag, limit, offset } = req.query;
    const contacts = db.getContacts({
      search,
      tag,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
      userId: req.userId
    });
    // Parse JSON tags for each contact
    const parsedContacts = contacts.map(c => ({
      ...c,
      tags: (() => {
        try {
          return JSON.parse(c.tags || '[]');
        } catch (e) {
          return [];
        }
      })()
    }));
    res.json(parsedContacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/contacts/:id', (req, res) => {
  try {
    const contact = db.getContact(parseInt(req.params.id));
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    contact.tags = JSON.parse(contact.tags || '[]');
    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contacts', authenticateToken, (req, res) => {
  try {
    const { email, name, tags } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const contact = db.createContact(email, name || '', tags || [], req.userId);
    contact.tags = JSON.parse(contact.tags || '[]');
    res.status(201).json(contact);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/contacts/:id', (req, res) => {
  try {
    const { email, name, tags } = req.body;
    const contact = db.updateContact(parseInt(parseInt(req.params.id)), email, name, tags);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    contact.tags = JSON.parse(contact.tags || '[]');
    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/contacts/:id', (req, res) => {
  try {
    db.deleteContact(parseInt(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// LISTS API
// ============================================

app.get('/api/lists', authenticateToken, (req, res) => {
  try {
    const lists = db.getLists(req.userId);
    res.json(lists.map(list => ({
      ...list,
      stats: db.getListStats(list.id)
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/lists/:id', (req, res) => {
  try {
    const list = db.getList(parseInt(req.params.id));
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    list.contacts = db.getListContacts(parseInt(req.params.id)).map(c => ({
      ...c,
      tags: JSON.parse(c.tags || '[]')
    }));
    list.stats = db.getListStats(parseInt(req.params.id));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/lists', (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'List name is required' });
    }
    const list = db.createList(name, description || '');
    res.status(201).json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/lists/:id', (req, res) => {
  try {
    const { name, description } = req.body;
    const list = db.updateList(parseInt(req.params.id), name, description);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/lists/:id', (req, res) => {
  try {
    db.deleteList(parseInt(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/lists/:id/contacts', (req, res) => {
  try {
    const { contactId } = req.body;
    if (!contactId) {
      return res.status(400).json({ error: 'Contact ID is required' });
    }
    db.addContactToList(parseInt(req.params.id), contactId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/lists/:listId/contacts/:contactId', (req, res) => {
  try {
    db.removeContactFromList(req.params.listId, req.params.contactId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// TEMPLATES API
// ============================================

app.get('/api/templates', authenticateToken, (req, res) => {
  try {
    const templates = db.getTemplates(req.userId);
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/templates/:id', (req, res) => {
  try {
    const template = db.getTemplate(parseInt(req.params.id));
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    // Parse editor_blocks if present
    if (template.editor_blocks) {
      try {
        template.editor_blocks = JSON.parse(template.editor_blocks);
      } catch (e) {
        template.editor_blocks = null;
      }
    }
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/templates', (req, res) => {
  try {
    // Support both camelCase and snake_case
    const name = req.body.name;
    const subject = req.body.subject;
    const htmlContent = req.body.htmlContent || req.body.html_content;
    const plainText = req.body.plainText || req.body.plain_text || '';
    const editorBlocks = req.body.editor_blocks || req.body.editorBlocks || null;
    if (!name || !subject || !htmlContent) {
      return res.status(400).json({ error: 'Name, subject, and HTML content are required' });
    }
    const template = db.createTemplate(name, subject, htmlContent, plainText, editorBlocks);
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/templates/:id', (req, res) => {
  try {
    const name = req.body.name;
    const subject = req.body.subject;
    const htmlContent = req.body.htmlContent || req.body.html_content;
    const plainText = req.body.plainText || req.body.plain_text;
    const editorBlocks = req.body.editor_blocks || req.body.editorBlocks || null;
    const template = db.updateTemplate(parseInt(req.params.id), name, subject, htmlContent, plainText, editorBlocks);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/templates/:id', (req, res) => {
  try {
    db.deleteTemplate(parseInt(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// CAMPAIGNS API
// ============================================

app.get('/api/campaigns', (req, res) => {
  try {
    const campaigns = db.getCampaigns();
    res.json(campaigns.map(c => ({
      ...c,
      stats: db.getCampaignStats(c.id)
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/campaigns/:id', (req, res) => {
  try {
    const campaign = db.getCampaign(parseInt(req.params.id));
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    campaign.stats = db.getCampaignStats(parseInt(req.params.id));
    // Parse editor_blocks if present
    if (campaign.editor_blocks) {
      try {
        campaign.editor_blocks = JSON.parse(campaign.editor_blocks);
      } catch (e) {
        campaign.editor_blocks = null;
      }
    }
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/campaigns', (req, res) => {
  try {
    const name = req.body.name;
    const subject = req.body.subject;
    const htmlContent = req.body.htmlContent || req.body.html_content;
    const plainText = req.body.plainText || req.body.plain_text || '';
    const listId = req.body.listId || req.body.list_id;
    const templateId = req.body.templateId || req.body.template_id;
    const editorBlocks = req.body.editor_blocks || req.body.editorBlocks || null;
    if (!name || !subject || !htmlContent) {
      return res.status(400).json({ error: 'Name, subject, and HTML content are required' });
    }
    const campaign = db.createCampaign(name, subject, htmlContent, plainText, listId, templateId, editorBlocks);
    res.status(201).json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/campaigns/:id', (req, res) => {
  try {
    const name = req.body.name;
    const subject = req.body.subject;
    const htmlContent = req.body.htmlContent || req.body.html_content;
    const plainText = req.body.plainText || req.body.plain_text;
    const editorBlocks = req.body.editor_blocks || req.body.editorBlocks || null;
    const campaign = db.updateCampaign(parseInt(req.params.id), name, subject, htmlContent, plainText, editorBlocks);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/campaigns/:id', (req, res) => {
  try {
    db.deleteCampaign(parseInt(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// EMAIL SENDING API (Mailgun)
// ============================================

async function sendEmailViaMailgun(to, subject, html, text, tags = []) {
  const apiKey = db.getSetting('mailgun_api_key');
  const domain = db.getSetting('mailgun_domain');

  if (!apiKey || !domain) {
    throw new Error('Mailgun not configured. Please set API key and domain.');
  }

  const Mailgun = require('mailgun.js');
  const formData = require('form-data');
  const mailgun = new Mailgun(formData);
  const client = mailgun.client({ username: 'api', key: apiKey });

  const data = {
    from: `Email Marketer <postmaster@${domain}>`,
    to: to,
    subject: subject,
    html: html,
    text: text,
    'h:X-Mailgun-Tagging': tags.join(', ')
  };

  const result = await client.messages.create(domain, data);
  return result;
}

app.post('/api/campaigns/:id/send', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const campaign = db.getCampaign(campaignId);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status === 'sent') {
      return res.status(400).json({ error: 'Campaign has already been sent' });
    }

    // Get list contacts
    const contacts = campaign.list_id ? db.getListContacts(campaign.list_id) : [];

    if (contacts.length === 0) {
      return res.status(400).json({ error: 'No contacts in the selected list' });
    }

    // Update campaign status
    db.updateCampaignStatus(campaignId, 'sending');

    // Create email records and send emails
    const results = { sent: 0, failed: 0, errors: [] };

    for (const contact of contacts) {
      try {
        // Create email tracking record
        const emailRecordId = db.createEmailRecord(campaignId, contact.id, contact.email);

        // Merge tags
        const mergedSubject = replaceMergeTags(campaign.subject, contact);
        const mergedHtml = replaceMergeTags(campaign.html_content, contact);
        const mergedText = replaceMergeTags(campaign.plain_text || '', contact);

        // Send email via Mailgun
        const result = await sendEmailViaMailgun(
          contact.email,
          mergedSubject,
          mergedHtml,
          mergedText,
          [campaign.name]
        );

        // Update email record with message ID
        db.updateEmailStatus(emailRecordId, 'sent', result.id || result.messageId);

        results.sent++;
      } catch (err) {
        results.failed++;
        results.errors.push({ email: contact.email, error: err.message });
      }
    }

    // Update campaign status and sent count
    db.updateCampaignStatus(campaignId, 'sent');
    db.incrementCampaignSentCount(campaignId, results.sent);

    res.json({
      success: true,
      campaign_id: campaignId,
      ...results
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function replaceMergeTags(content, contact) {
  let result = content;

  // Replace standard merge tags
  result = result.replace(/\{\{email\}\}/gi, contact.email);
  result = result.replace(/\{\{name\}\}/gi, contact.name || '');

  // Replace custom tags
  const tags = JSON.parse(contact.tags || '[]');
  tags.forEach((tag, index) => {
    result = result.replace(new RegExp(`\\{\\{tag${index + 1}\\}\\}`, 'gi'), tag);
    result = result.replace(new RegExp(`\\{\\{tag:${tag}\\}\\}`, 'gi'), tag);
  });

  return result;
}

// ============================================
// MAILGUN WEBHOOK
// ============================================

app.post('/api/webhooks/mailgun', (req, res) => {
  try {
    const event = req.body;

    if (!event['message-id'] && !event.event) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const messageId = event['message-id'];
    const eventType = event.event;

    // Find email record by message ID
    const emailRecord = db.getEmailRecordByMessageId(messageId);

    if (!emailRecord) {
      console.log(`Unknown message ID: ${messageId}`);
      return res.status(200).json({ received: true });
    }

    // Map Mailgun events to our status
    const statusMap = {
      'delivered': 'delivered',
      'opened': 'opened',
      'clicked': 'clicked',
      'bounced': 'bounced',
      'complained': 'complained',
      'unsubscribed': 'unsubscribed'
    };

    const newStatus = statusMap[eventType] || eventType;

    if (newStatus) {
      db.updateEmailStatus(emailRecord.id, newStatus, messageId);
    }

    console.log(`Mailgun event: ${eventType} for ${messageId}`);

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// SETTINGS API
// ============================================

app.get('/api/settings', (req, res) => {
  try {
    const settings = {
      mailgun_api_key: db.getSetting('mailgun_api_key') ? '****' : null,
      mailgun_domain: db.getSetting('mailgun_domain')
    };
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const { mailgun_api_key, mailgun_domain } = req.body;

    if (mailgun_api_key) {
      db.setSetting('mailgun_api_key', mailgun_api_key);
    }

    if (mailgun_domain) {
      db.setSetting('mailgun_domain', mailgun_domain);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// STATS API
// ============================================

app.get('/api/stats', (req, res) => {
  try {
    const contacts = db.getContacts();
    const lists = db.getLists();
    const campaigns = db.getCampaigns();

    const totalSent = campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0);

    // Get all email tracking records for stats
    const recentCampaigns = campaigns.slice(0, 10).map(c => ({
      ...c,
      stats: db.getCampaignStats(c.id)
    }));

    res.json({
      contacts: contacts.length,
      lists: lists.length,
      campaigns: campaigns.length,
      totalEmailsSent: totalSent,
      recentCampaigns
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server - bind to 0.0.0.0 for Docker compatibility
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Email Marketer app running at http://0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});