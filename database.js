const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'email-marketer.db');
let db = null;

// Initialize database
async function initDatabase() {
  const SQL = await initSqlJs();

  // Create data directory if it doesn't exist
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS list_members (
      list_id INTEGER NOT NULL,
      contact_id INTEGER NOT NULL,
      PRIMARY KEY (list_id, contact_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      html_content TEXT NOT NULL,
      plain_text TEXT,
      editor_blocks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      template_id INTEGER,
      list_id INTEGER,
      subject TEXT NOT NULL,
      html_content TEXT NOT NULL,
      plain_text TEXT,
      editor_blocks TEXT,
      status TEXT DEFAULT 'draft',
      sent_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sent_at DATETIME
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS email_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      contact_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      status TEXT DEFAULT 'queued',
      mailgun_message_id TEXT,
      sent_at DATETIME,
      delivered_at DATETIME,
      opened_at DATETIME,
      clicked_at DATETIME,
      bounced_at DATETIME,
      complained_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Users table for authentication
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'user',
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add user_id to existing tables for multi-tenancy
  try {
    db.run('ALTER TABLE contacts ADD COLUMN user_id INTEGER');
  } catch (err) {}
  try {
    db.run('ALTER TABLE lists ADD COLUMN user_id INTEGER');
  } catch (err) {}
  try {
    db.run('ALTER TABLE templates ADD COLUMN user_id INTEGER');
  } catch (err) {}
  try {
    db.run('ALTER TABLE campaigns ADD COLUMN user_id INTEGER');
  } catch (err) {}

  // Migration: Add editor_blocks column to templates if it doesn't exist
  try {
    db.run('ALTER TABLE templates ADD COLUMN editor_blocks TEXT');
  } catch (err) {
    // Column already exists, ignore error
  }

  // Migration: Add editor_blocks column to campaigns if it doesn't exist
  try {
    db.run('ALTER TABLE campaigns ADD COLUMN editor_blocks TEXT');
  } catch (err) {
    // Column already exists, ignore error
  }

  // Shares table for collaboration
  db.run(`
    CREATE TABLE IF NOT EXISTS shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_type TEXT NOT NULL,
      resource_id INTEGER NOT NULL,
      owner_id INTEGER NOT NULL,
      shared_with_id INTEGER NOT NULL,
      permission TEXT DEFAULT 'view',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(resource_type, resource_id, shared_with_id)
    )
  `);

  saveDatabase();
}

// Save database to file
function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

// Helper function to run query and return results
function runQuery(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (err) {
    console.error('Query error:', sql, err);
    throw err;
  }
}

// Contact functions
function getContacts(options = {}) {
  const { search, tag, limit = 100, offset = 0, userId } = options;
  let sql = 'SELECT * FROM contacts WHERE 1=1';
  const params = [];

  if (userId) {
    sql += ' AND (user_id = ? OR user_id IS NULL)';
    params.push(userId);
  }

  if (search) {
    sql += ' AND (email LIKE ? OR name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (tag) {
    sql += ' AND tags LIKE ?';
    params.push(`%"${tag}"%`);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return runQuery(sql, params);
}

function getContact(id) {
  const results = runQuery('SELECT * FROM contacts WHERE id = ?', [id]);
  if (results.length === 0) return null;
  return results[0];
}

function getContactByEmail(email) {
  const results = runQuery('SELECT * FROM contacts WHERE email = ?', [email]);
  if (results.length === 0) return null;
  return results[0];
}

function createContact(email, name = '', tags = [], userId = null) {
  const tagsJson = JSON.stringify(tags);
  if (userId) {
    db.run('INSERT INTO contacts (email, name, tags, user_id) VALUES (?, ?, ?, ?)', [email, name, tagsJson, userId]);
  } else {
    db.run('INSERT INTO contacts (email, name, tags) VALUES (?, ?, ?)', [email, name, tagsJson]);
  }
  return getContactByEmail(email);
}

function updateContact(id, email, name = null, tags = null) {
  let sql = 'UPDATE contacts SET updated_at = CURRENT_TIMESTAMP';
  const params = [];

  if (email !== undefined) {
    sql += ', email = ?';
    params.push(email);
  }
  if (name !== null) {
    sql += ', name = ?';
    params.push(name);
  }
  if (tags !== null) {
    sql += ', tags = ?';
    params.push(JSON.stringify(tags));
  }

  sql += ' WHERE id = ?';
  params.push(id);

  db.run(sql, params);
  return getContact(id);
}

function deleteContact(id) {
  db.run('DELETE FROM contacts WHERE id = ?', [id]);
}

// List functions
function getLists(userId = null) {
  if (userId) {
    return runQuery('SELECT * FROM lists WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC', [userId]);
  }
  return runQuery('SELECT * FROM lists ORDER BY created_at DESC');
}

function getList(id) {
  const results = runQuery('SELECT * FROM lists WHERE id = ?', [id]);
  if (results.length === 0) return null;
  return results[0];
}

function createList(name, description = '') {
  db.run('INSERT INTO lists (name, description) VALUES (?, ?)', [name, description]);
  const results = runQuery("SELECT last_insert_rowid()"); return getList(results[0]["last_insert_rowid()"]);
}

function updateList(id, name, description = null) {
  let sql = 'UPDATE lists SET updated_at = CURRENT_TIMESTAMP, name = ?';
  const params = [name];

  if (description !== null) {
    sql += ', description = ?';
    params.push(description);
  }

  sql += ' WHERE id = ?';
  params.push(id);

  db.run(sql, params);
  return getList(id);
}

function deleteList(id) {
  // Delete list members first
  db.run('DELETE FROM list_members WHERE list_id = ?', [id]);
  db.run('DELETE FROM lists WHERE id = ?', [id]);
}

// List members functions
function addContactToList(listId, contactId) {
  try {
    db.run('INSERT OR IGNORE INTO list_members (list_id, contact_id) VALUES (?, ?)', [listId, contactId]);
    saveDatabase();
  } catch (err) {
    // Ignore duplicate entry errors
    if (!err.message.includes('UNIQUE constraint failed')) {
      throw err;
    }
  }
}

function removeContactFromList(listId, contactId) {
  db.run('DELETE FROM list_members WHERE list_id = ? AND contact_id = ?', [listId, contactId]);
  saveDatabase();
}

function getListContacts(listId) {
  return runQuery(`
    SELECT c.* FROM contacts c
    JOIN list_members lm ON c.id = lm.contact_id
    WHERE lm.list_id = ?
    ORDER BY c.created_at DESC
  `, [listId]);
}

function getListStats(listId) {
  const results = runQuery('SELECT COUNT(*) as count FROM list_members WHERE list_id = ?', [listId]);
  return { totalContacts: results[0]?.count || 0 };
}

// Template functions
function getTemplates(userId = null) {
  if (userId) {
    return runQuery('SELECT * FROM templates WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC', [userId]);
  }
  return runQuery('SELECT * FROM templates ORDER BY created_at DESC');
}

function getTemplate(id) {
  const results = runQuery('SELECT * FROM templates WHERE id = ?', [id]);
  if (results.length === 0) return null;
  return results[0];
}

function createTemplate(name, subject, htmlContent, plainText = '', editorBlocks = null) {
  const blocksJson = editorBlocks ? JSON.stringify(editorBlocks) : null;
  db.run('INSERT INTO templates (name, subject, html_content, plain_text, editor_blocks) VALUES (?, ?, ?, ?, ?)', [name, subject, htmlContent, plainText, blocksJson]);
  const tResults = runQuery("SELECT last_insert_rowid()"); return getTemplate(tResults[0]["last_insert_rowid()"]);
}

function updateTemplate(id, name, subject, htmlContent, plainText = null, editorBlocks = null) {
  let sql = 'UPDATE templates SET updated_at = CURRENT_TIMESTAMP';
  const params = [];

  if (name !== undefined) {
    sql += ', name = ?';
    params.push(name);
  }
  if (subject !== undefined) {
    sql += ', subject = ?';
    params.push(subject);
  }
  if (htmlContent !== undefined) {
    sql += ', html_content = ?';
    params.push(htmlContent);
  }
  if (plainText !== null && plainText !== undefined) {
    sql += ', plain_text = ?';
    params.push(plainText);
  }
  if (editorBlocks !== null && editorBlocks !== undefined) {
    sql += ', editor_blocks = ?';
    params.push(JSON.stringify(editorBlocks));
  }

  sql += ' WHERE id = ?';
  params.push(id);

  db.run(sql, params);
  return getTemplate(id);
}

function deleteTemplate(id) {
  db.run('DELETE FROM templates WHERE id = ?', [id]);
}

// Campaign functions
function getCampaigns() {
  return runQuery('SELECT * FROM campaigns ORDER BY created_at DESC');
}

function getCampaign(id) {
  const results = runQuery('SELECT * FROM campaigns WHERE id = ?', [id]);
  if (results.length === 0) return null;
  return results[0];
}

function createCampaign(name, subject, htmlContent, plainText = '', listId = null, templateId = null, editorBlocks = null) {
  const blocksJson = editorBlocks ? JSON.stringify(editorBlocks) : null;
  db.run('INSERT INTO campaigns (name, subject, html_content, plain_text, list_id, template_id, editor_blocks) VALUES (?, ?, ?, ?, ?, ?, ?)', [name, subject, htmlContent, plainText, listId, templateId, blocksJson]);
  const cResults = runQuery("SELECT last_insert_rowid()"); return getCampaign(cResults[0]["last_insert_rowid()"]);
}

function updateCampaign(id, name, subject, htmlContent, plainText = null, editorBlocks = null) {
  let sql = 'UPDATE campaigns SET updated_at = CURRENT_TIMESTAMP';
  const params = [];

  if (name !== undefined) {
    sql += ', name = ?';
    params.push(name);
  }
  if (subject !== undefined) {
    sql += ', subject = ?';
    params.push(subject);
  }
  if (htmlContent !== undefined) {
    sql += ', html_content = ?';
    params.push(htmlContent);
  }
  if (plainText !== null && plainText !== undefined) {
    sql += ', plain_text = ?';
    params.push(plainText);
  }
  if (editorBlocks !== null && editorBlocks !== undefined) {
    sql += ', editor_blocks = ?';
    params.push(JSON.stringify(editorBlocks));
  }

  sql += ' WHERE id = ?';
  params.push(id);

  db.run(sql, params);
  return getCampaign(id);
}

function updateCampaignStatus(id, status) {
  const sentAt = status === 'sent' ? "datetime('now')" : 'NULL';
  db.run(`UPDATE campaigns SET status = ?, sent_at = ${sentAt}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, id]);
  return getCampaign(id);
}

function deleteCampaign(id) {
  // Delete email tracking records first
  db.run('DELETE FROM email_tracking WHERE campaign_id = ?', [id]);
  db.run('DELETE FROM campaigns WHERE id = ?', [id]);
}

function incrementCampaignSentCount(id, count = 1) {
  db.run('UPDATE campaigns SET sent_count = sent_count + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [count, id]);
}

// Email tracking functions
function createEmailRecord(campaignId, contactId, email) {
  db.run('INSERT INTO email_tracking (campaign_id, contact_id, email, status) VALUES (?, ?, ?, ?)', [campaignId, contactId, email, 'queued']);
  const results = runQuery('SELECT last_insert_rowid()');
  return results[0]['last_insert_rowid()'];
}

function getEmailRecord(id) {
  const results = runQuery('SELECT * FROM email_tracking WHERE id = ?', [id]);
  if (results.length === 0) return null;
  return results[0];
}

function getEmailRecordByMessageId(messageId) {
  const results = runQuery('SELECT * FROM email_tracking WHERE mailgun_message_id = ?', [messageId]);
  if (results.length === 0) return null;
  return results[0];
}

function getCampaignStats(campaignId) {
  const results = runQuery(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN status = 'opened' THEN 1 ELSE 0 END) as opened,
      SUM(CASE WHEN status = 'clicked' THEN 1 ELSE 0 END) as clicked,
      SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced,
      SUM(CASE WHEN status = 'complained' THEN 1 ELSE 0 END) as complained
    FROM email_tracking
    WHERE campaign_id = ?
  `, [campaignId]);
  return results[0] || {};
}

function updateEmailStatus(id, status, messageId = null) {
  let sql = 'UPDATE email_tracking SET status = ?, updated_at = CURRENT_TIMESTAMP';
  const params = [status];

  if (messageId) {
    sql += ', mailgun_message_id = ?';
    params.push(messageId);
  }

  // Set timestamp based on status
  const timestampFields = {
    'sent': 'sent_at',
    'delivered': 'delivered_at',
    'opened': 'opened_at',
    'clicked': 'clicked_at',
    'bounced': 'bounced_at',
    'complained': 'complained_at'
  };

  if (timestampFields[status]) {
    sql += `, ${timestampFields[status]} = datetime('now')`;
  }

  sql += ' WHERE id = ?';
  params.push(id);

  db.run(sql, params);
  return getEmailRecord(id);
}

// Settings functions
function getSetting(key) {
  const results = runQuery('SELECT value FROM settings WHERE key = ?', [key]);
  if (results.length === 0) return null;
  try {
    return JSON.parse(results[0].value);
  } catch {
    return null;
  }
}

function setSetting(key, value) {
  db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
  saveDatabase();
}

// User functions
function createUser(email, passwordHash, name = '') {
  db.run('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)', [email, passwordHash, name]);
  return getUserByEmail(email);
}

function getUserByEmail(email) {
  const results = runQuery('SELECT * FROM users WHERE email = ?', [email]);
  if (results.length === 0) return null;
  return results[0];
}

function getUserById(id) {
  const results = runQuery('SELECT * FROM users WHERE id = ?', [id]);
  if (results.length === 0) return null;
  return results[0];
}

function updateUser(id, updates) {
  const allowedFields = ['name', 'password_hash', 'role', 'active'];
  const fields = [];
  const params = [];
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      params.push(value);
    }
  }
  
  if (fields.length === 0) return getUserById(id);
  
  params.push(id);
  db.run(`UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
  return getUserById(id);
}

function deleteUser(id) {
  db.run('DELETE FROM users WHERE id = ?', [id]);
}

// Share functions
function createShare(resourceType, resourceId, ownerId, sharedWithId, permission = 'view') {
  db.run('INSERT OR REPLACE INTO shares (resource_type, resource_id, owner_id, shared_with_id, permission) VALUES (?, ?, ?, ?, ?)', 
    [resourceType, resourceId, ownerId, sharedWithId, permission]);
  return getSharesForResource(resourceType, resourceId, ownerId);
}

function getSharesForResource(resourceType, resourceId, ownerId) {
  return runQuery(`
    SELECT s.*, u.email, u.name 
    FROM shares s
    JOIN users u ON s.shared_with_id = u.id
    WHERE s.resource_type = ? AND s.resource_id = ? AND s.owner_id = ?
  `, [resourceType, resourceId, ownerId]);
}

function getSharedResourcesForUser(userId, resourceType) {
  return runQuery(`
    SELECT s.*, u.email as owner_email, u.name as owner_name
    FROM shares s
    JOIN users u ON s.owner_id = u.id
    WHERE s.shared_with_id = ? AND s.resource_type = ?
  `, [userId, resourceType]);
}

function deleteShare(shareId) {
  db.run('DELETE FROM shares WHERE id = ?', [shareId]);
}

function canAccessResource(resourceType, resourceId, userId) {
  // Check if user is owner
  const ownerCheck = runQuery(`
    SELECT 1 FROM ${resourceType} WHERE id = ? AND (user_id = ? OR user_id IS NULL)
  `, [resourceId, userId]);
  
  if (ownerCheck.length > 0) return { canAccess: true, isOwner: true };
  
  // Check if shared with user
  const shareCheck = runQuery(`
    SELECT permission FROM shares 
    WHERE resource_type = ? AND resource_id = ? AND shared_with_id = ?
  `, [resourceType, resourceId, userId]);
  
  if (shareCheck.length > 0) return { canAccess: true, isOwner: false, permission: shareCheck[0].permission };
  
  return { canAccess: false };
}

// Save database on module load and periodically
initDatabase().then(() => {
  console.log('Database initialized');
  saveDatabase();
});

// Export functions
module.exports = {
  initDatabase,
  createUser,
  getUserByEmail,
  getUserById,
  updateUser,
  deleteUser,
  createShare,
  getSharesForResource,
  getSharedResourcesForUser,
  deleteShare,
  canAccessResource,
  getContacts,
  getContact,
  getContactByEmail,
  createContact,
  updateContact,
  deleteContact,
  getLists,
  getList,
  createList,
  updateList,
  deleteList,
  addContactToList,
  removeContactFromList,
  getListContacts,
  getListStats,
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  updateCampaignStatus,
  deleteCampaign,
  incrementCampaignSentCount,
  createEmailRecord,
  getEmailRecord,
  getEmailRecordByMessageId,
  getCampaignStats,
  updateEmailStatus,
  getSetting,
  setSetting
};