// API Base URL
const API_BASE = '';

// Global state
let currentView = 'dashboard';
let editingContactId = null;
let editingListId = null;
let editingTemplateId = null;
let editingCampaignId = null;
let selectedContacts = new Set();

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  initializeNavigation();
  loadDashboard();
  loadSettings();
  initializeMobileNav();
});

// Navigation
function initializeNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      switchView(view);
    });
  });
}

// Initialize mobile navigation
function initializeMobileNav() {
  const mobileNavItems = document.querySelectorAll('.mobile-nav-item, .mobile-bottom-nav-item');
  mobileNavItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      switchView(view);
      closeMobileMenu();
    });
  });
}

// Close mobile menu
function closeMobileMenu() {
  document.getElementById('mobile-sidebar').classList.remove('open');
  document.getElementById('mobile-menu-overlay').classList.remove('open');
}

// Toggle mobile menu
window.toggleMobileMenu = function() {
  const sidebar = document.getElementById('mobile-sidebar');
  const overlay = document.getElementById('mobile-menu-overlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('open');
};

// Update mobile nav active state
window.updateMobileNav = function(view) {
  document.querySelectorAll('.mobile-nav-item, .mobile-bottom-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === view);
  });
};

function switchView(view) {
  // Update navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === view);
  });

  // Update mobile nav
  updateMobileNav(view);

  // Update views
  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('active', v.id === `${view}-view`);
  });

  currentView = view;

  // Load view data
  switch (view) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'contacts':
      loadContacts();
      break;
    case 'lists':
      loadLists();
      break;
    case 'templates':
      loadTemplates();
      break;
    case 'campaigns':
      loadCampaigns();
      break;
    case 'settings':
      loadSettings();
      break;
  }
}

// Dashboard
async function loadDashboard() {
  try {
    const response = await fetch(`${API_BASE}/api/stats`);
    const stats = await response.json();

    document.getElementById('stat-contacts').textContent = stats.contacts || 0;
    document.getElementById('stat-lists').textContent = stats.lists || 0;
    document.getElementById('stat-campaigns').textContent = stats.campaigns || 0;
    document.getElementById('stat-sent').textContent = stats.totalEmailsSent || 0;

    // Load recent campaigns
    const campaignsContainer = document.getElementById('recent-campaigns');
    if (stats.recentCampaigns && stats.recentCampaigns.length > 0) {
      campaignsContainer.innerHTML = `
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Sent</th>
              <th>Opened</th>
              <th>Clicked</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${stats.recentCampaigns.map(c => `
              <tr>
                <td>${escapeHtml(c.name)}</td>
                <td><span class="badge ${getStatusBadgeClass(c.status)}">${c.status}</span></td>
                <td>${c.stats?.sent || 0}</td>
                <td>${c.stats?.opened || 0}</td>
                <td>${c.stats?.clicked || 0}</td>
                <td>${formatDate(c.created_at)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      campaignsContainer.innerHTML = '<div class="empty-state">No campaigns yet</div>';
    }
  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

// Contacts
async function loadContacts() {
  const search = document.getElementById('contact-search')?.value || '';
  const tag = document.getElementById('contact-tag-filter')?.value || '';

  try {
    const url = new URL('/api/contacts', window.location.origin);
    if (search) url.searchParams.set('search', search);
    if (tag) url.searchParams.set('tag', tag);

    const response = await fetch(url.toString());
    const contacts = await response.json();

    const container = document.getElementById('contacts-list');
    if (contacts.length > 0) {
      container.innerHTML = `
        <table class="table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" id="select-all-contacts" onchange="toggleSelectAll(this)">
              </th>
              <th>Email</th>
              <th>Name</th>
              <th>Tags</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${contacts.map(c => `
              <tr>
                <td>
                  <input type="checkbox" class="contact-checkbox" data-id="${c.id}" onchange="toggleContactSelect(${c.id})">
                </td>
                <td>${escapeHtml(c.email)}</td>
                <td>${escapeHtml(c.name || '-')}</td>
                <td>${renderTags(c.tags)}</td>
                <td>${formatDate(c.created_at)}</td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-small" onclick="editContact(${c.id})">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="deleteContact(${c.id})">Delete</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      container.innerHTML = '<div class="empty-state">No contacts found</div>';
    }
  } catch (err) {
    console.error('Failed to load contacts:', err);
  }
}

// Contact selection
window.toggleSelectAll = function(checkbox) {
  const checkboxes = document.querySelectorAll('.contact-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = checkbox.checked;
    const id = parseInt(cb.dataset.id);
    if (checkbox.checked) {
      selectedContacts.add(id);
    } else {
      selectedContacts.delete(id);
    }
  });
  updateBulkActions();
};

window.toggleContactSelect = function(id) {
  const checkbox = document.querySelector(`.contact-checkbox[data-id="${id}"]`);
  if (checkbox.checked) {
    selectedContacts.add(id);
  } else {
    selectedContacts.delete(id);
  }
  updateBulkActions();
};

function updateBulkActions() {
  const bulkActions = document.getElementById('bulk-actions');
  const count = selectedContacts.size;
  if (count > 0) {
    bulkActions.style.display = 'flex';
    document.getElementById('selected-count').textContent = `${count} selected`;
  } else {
    bulkActions.style.display = 'none';
  }
}

window.clearSelection = function() {
  selectedContacts.clear();
  const checkboxes = document.querySelectorAll('.contact-checkbox');
  checkboxes.forEach(cb => cb.checked = false);
  document.getElementById('select-all-contacts').checked = false;
  updateBulkActions();
};

window.getSelectedContacts = function() {
  return Array.from(selectedContacts);
};

function showContactModal(contact = null) {
  editingContactId = contact ? contact.id : null;

  document.getElementById('contact-modal-title').textContent = contact ? 'Edit Contact' : 'Add Contact';
  document.getElementById('contact-email').value = contact?.email || '';
  document.getElementById('contact-name').value = contact?.name || '';
  document.getElementById('contact-tags').value = contact?.tags?.join(', ') || '';

  document.getElementById('contact-modal').classList.add('active');
}

function hideContactModal() {
  document.getElementById('contact-modal').classList.remove('active');
  editingContactId = null;
}

async function saveContact() {
  const email = document.getElementById('contact-email').value.trim();
  const name = document.getElementById('contact-name').value.trim();
  const tagsStr = document.getElementById('contact-tags').value;
  const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);

  if (!email) {
    showToast('Email is required', 'error');
    return;
  }

  // Email validation
  if (!isValidEmail(email)) {
    showToast('Please enter a valid email address', 'error');
    return;
  }

  try {
    const method = editingContactId ? 'PUT' : 'POST';
    const url = editingContactId
      ? `${API_BASE}/api/contacts/${editingContactId}`
      : `${API_BASE}/api/contacts`;

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, tags })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save contact');
    }

    hideContactModal();
    showToast(editingContactId ? 'Contact updated!' : 'Contact added!', 'success');
    loadContacts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function editContact(id) {
  try {
    const response = await fetch(`${API_BASE}/api/contacts/${id}`);
    const contact = await response.json();
    showContactModal(contact);
  } catch (err) {
    console.error('Failed to load contact:', err);
  }
}

async function deleteContact(id) {
  if (!confirm('Are you sure you want to delete this contact?')) return;

  try {
    const response = await fetch(`${API_BASE}/api/contacts/${id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      showToast('Contact deleted', 'success');
      loadContacts();
    }
  } catch (err) {
    console.error('Failed to delete contact:', err);
  }
}

// Bulk delete
window.bulkDeleteContacts = async function() {
  const contacts = getSelectedContacts();
  if (contacts.length === 0) {
    showToast('No contacts selected', 'error');
    return;
  }

  if (!confirm(`Delete ${contacts.length} selected contacts?`)) return;

  for (const id of contacts) {
    await fetch(`${API_BASE}/api/contacts/${id}`, { method: 'DELETE' });
  }

  showToast(`Deleted ${contacts.length} contacts`, 'success');
  clearSelection();
  loadContacts();
};

// Export selected contacts
window.exportContacts = async function() {
  const contacts = getSelectedContacts();
  if (contacts.length === 0) {
    showToast('No contacts selected', 'error');
    return;
  }

  const contactData = contacts.map(id => {
    const row = document.querySelector(`.contact-checkbox[data-id="${id}"]`);
    if (row) {
      const tr = row.closest('tr');
      return {
        email: tr.cells[1].textContent,
        name: tr.cells[2].textContent,
        tags: tr.cells[3].textContent
      };
    }
    return null;
  }).filter(c => c);

  downloadCSV(contactData, 'selected-contacts.csv');
  showToast(`Exported ${contacts.length} contacts`, 'success');
};

// Export all contacts
window.exportAllContacts = async function() {
  try {
    const response = await fetch(`${API_BASE}/api/contacts`);
    const contacts = await response.json();

    downloadCSV(contacts, 'all-contacts.csv');
    showToast(`Exported ${contacts.length} contacts`, 'success');
  } catch (err) {
    showToast('Error exporting contacts', 'error');
  }
};

// Import contacts from CSV
window.importContacts = async function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    const csv = e.target.result;
    const lines = csv.split('\n');
    let imported = 0;
    let errors = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || i === 0) continue; // Skip header and empty lines

      const [email, name, tags] = line.split(',').map(s => s.trim().replace(/"/g, ''));
      if (email && isValidEmail(email)) {
        try {
          await fetch(`${API_BASE}/api/contacts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              name,
              tags: tags ? [tags] : []
            })
          });
          imported++;
        } catch (err) {
          errors++;
        }
      }
    }

    showToast(`Imported ${imported} contacts${errors > 0 ? `, ${errors} errors` : ''}`, imported > 0 ? 'success' : 'error');
    loadContacts();
  };
  reader.readAsText(file);
  event.target.value = '';
};

// Download CSV helper
function downloadCSV(data, filename) {
  if (typeof data === 'string') {
    // Already CSV string
    const blob = new Blob([data], { type: 'text/csv' });
    downloadBlob(blob, filename);
  } else {
    // Array of objects
    const headers = Object.keys(data[0] || {});
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const val = row[h] || '';
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    downloadBlob(blob, filename);
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Email validation
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Lists
async function loadLists() {
  try {
    const response = await fetch(`${API_BASE}/api/lists`);
    const lists = await response.json();

    const container = document.getElementById('lists-grid');
    if (lists.length > 0) {
      container.innerHTML = lists.map(list => `
        <div class="list-card">
          <h4>${escapeHtml(list.name)}</h4>
          <p>${escapeHtml(list.description || 'No description')}</p>
          <div class="list-stats">
            <span class="list-stat"><strong>${list.stats?.totalContacts || 0}</strong> contacts</span>
          </div>
          <div style="margin-top: 16px;">
            <button class="btn btn-small" onclick="viewList(${list.id})">View Contacts</button>
            <button class="btn btn-small" onclick="editList(${list.id})">Edit</button>
            <button class="btn btn-small btn-danger" onclick="deleteList(${list.id})">Delete</button>
          </div>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<div class="empty-state">No lists yet. Create your first list!</div>';
    }
  } catch (err) {
    console.error('Failed to load lists:', err);
  }
}

function showListModal(list = null) {
  editingListId = list ? list.id : null;

  document.getElementById('list-modal-title').textContent = list ? 'Edit List' : 'Create List';
  document.getElementById('list-name').value = list?.name || '';
  document.getElementById('list-description').value = list?.description || '';

  document.getElementById('list-modal').classList.add('active');
}

function hideListModal() {
  document.getElementById('list-modal').classList.remove('active');
  editingListId = null;
}

async function saveList() {
  const name = document.getElementById('list-name').value.trim();
  const description = document.getElementById('list-description').value.trim();

  if (!name) {
    showToast('List name is required', 'error');
    return;
  }

  try {
    const method = editingListId ? 'PUT' : 'POST';
    const url = editingListId
      ? `${API_BASE}/api/lists/${editingListId}`
      : `${API_BASE}/api/lists`;

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description })
    });

    if (!response.ok) {
      throw new Error('Failed to save list');
    }

    hideListModal();
    showToast(editingListId ? 'List updated!' : 'List created!', 'success');
    loadLists();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function viewList(id) {
  try {
    const response = await fetch(`${API_BASE}/api/lists/${id}`);
    const list = await response.json();

    document.getElementById('list-detail-title').textContent = list.name;
    document.getElementById('list-detail-description').textContent = list.description || 'No description';
    document.getElementById('list-detail-count').textContent = `${list.stats?.totalContacts || 0} contacts`;
    document.getElementById('list-detail-id').value = list.id;

    // Load available contacts for dropdown
    const contactsResponse = await fetch(`${API_BASE}/api/contacts`);
    const allContacts = await contactsResponse.json();
    const listContactIds = list.contacts?.map(c => c.id) || [];
    const availableContacts = allContacts.filter(c => !listContactIds.includes(c.id));
    
    const select = document.getElementById('add-contact-select');
    select.innerHTML = '<option value="">-- Select contact to add --</option>' +
      availableContacts.map(c => `<option value="${c.id}">${escapeHtml(c.email)} (${escapeHtml(c.name || 'No name')})</option>`).join('');

    const contactsContainer = document.getElementById('list-detail-contacts');
    if (list.contacts && list.contacts.length > 0) {
      contactsContainer.innerHTML = `
        <table class="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Tags</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list.contacts.map(c => `
              <tr>
                <td>${escapeHtml(c.email)}</td>
                <td>${escapeHtml(c.name || '-')}</td>
                <td>${renderTags(c.tags)}</td>
                <td>
                  <button class="btn btn-small btn-danger" onclick="removeContactFromList(${list.id}, ${c.id})">Remove</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      contactsContainer.innerHTML = '<div class="empty-state">No contacts in this list</div>';
    }

    document.getElementById('list-detail-modal').classList.add('active');
  } catch (err) {
    console.error('Failed to load list:', err);
  }
}

async function addSelectedContactToList() {
  const listId = document.getElementById('list-detail-id').value;
  const contactId = document.getElementById('add-contact-select').value;

  if (!contactId) {
    showToast('Please select a contact', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/lists/${listId}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId: parseInt(contactId) })
    });

    if (response.ok) {
      showToast('Contact added to list', 'success');
      viewList(listId);
      loadLists(); // Refresh the main lists grid
    } else {
      showToast('Failed to add contact', 'error');
    }
  } catch (err) {
    showToast('Error adding contact', 'error');
  }
}

function hideListDetailModal() {
  document.getElementById('list-detail-modal').classList.remove('active');
}

async function removeContactFromList(listId, contactId) {
  try {
    await fetch(`${API_BASE}/api/lists/${listId}/contacts/${contactId}`, {
      method: 'DELETE'
    });
    showToast('Contact removed from list', 'success');
    viewList(listId);
    loadLists(); // Refresh the main lists grid
  } catch (err) {
    console.error('Failed to remove contact:', err);
  }
}

async function editList(id) {
  try {
    const response = await fetch(`${API_BASE}/api/lists/${id}`);
    const list = await response.json();
    showListModal(list);
  } catch (err) {
    console.error('Failed to load list:', err);
  }
}

async function deleteList(id) {
  if (!confirm('Are you sure you want to delete this list?')) return;

  try {
    const response = await fetch(`${API_BASE}/api/lists/${id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      showToast('List deleted', 'success');
      loadLists();
    }
  } catch (err) {
    console.error('Failed to delete list:', err);
  }
}

// Templates
async function loadTemplates() {
  try {
    const response = await fetch(`${API_BASE}/api/templates`);
    const templates = await response.json();

    const container = document.getElementById('templates-grid');
    if (templates.length > 0) {
      container.innerHTML = templates.map(template => `
        <div class="template-card">
          <h4>${escapeHtml(template.name)}</h4>
          <p>Subject: ${escapeHtml(template.subject)}</p>
          <p>${escapeHtml(template.html_content.substring(0, 100))}...</p>
          <div style="margin-top: 16px;">
            <button class="btn btn-small" onclick="editTemplate(${template.id})">Edit</button>
            <button class="btn btn-small btn-danger" onclick="deleteTemplate(${template.id})">Delete</button>
          </div>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<div class="empty-state">No templates yet. Create your first template!</div>';
    }
  } catch (err) {
    console.error('Failed to load templates:', err);
  }
}

async function showTemplateModal(template = null) {
  editingTemplateId = template ? template.id : null;

  document.getElementById('template-modal-title').textContent = template ? 'Edit Template' : 'Create Template';
  document.getElementById('template-name').value = template?.name || '';
  document.getElementById('template-subject').value = template?.subject || '';

  // Initialize Editor.js
  const blocks = template?.editor_blocks || (template?.html_content ? null : null);
  await initTemplateEditor(blocks);

  document.getElementById('template-modal').classList.add('active');
}

function hideTemplateModal() {
  document.getElementById('template-modal').classList.remove('active');
  editingTemplateId = null;
}

async function saveTemplate() {
  const name = document.getElementById('template-name').value.trim();
  const subject = document.getElementById('template-subject').value.trim();

  // Get content from Editor.js
  const content = await getTemplateEditorContent();
  if (!content) {
    showToast('Failed to get editor content', 'error');
    return;
  }

  if (!name || !subject || !content.html) {
    showToast('Template name, subject, and content are required', 'error');
    return;
  }

  try {
    const method = editingTemplateId ? 'PUT' : 'POST';
    const url = editingTemplateId
      ? `${API_BASE}/api/templates/${editingTemplateId}`
      : `${API_BASE}/api/templates`;

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        subject,
        html_content: content.html,
        plain_text: content.plainText,
        editor_blocks: content.blocks
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save template');
    }

    hideTemplateModal();
    showToast(editingTemplateId ? 'Template updated!' : 'Template created!', 'success');
    loadTemplates();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function editTemplate(id) {
  try {
    const response = await fetch(`${API_BASE}/api/templates/${id}`);
    const template = await response.json();
    showTemplateModal(template);
  } catch (err) {
    console.error('Failed to load template:', err);
  }
}

async function deleteTemplate(id) {
  if (!confirm('Are you sure you want to delete this template?')) return;

  try {
    const response = await fetch(`${API_BASE}/api/templates/${id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      showToast('Template deleted', 'success');
      loadTemplates();
    }
  } catch (err) {
    console.error('Failed to delete template:', err);
  }
}

// Campaigns
async function loadCampaigns() {
  try {
    const response = await fetch(`${API_BASE}/api/campaigns`);
    const campaigns = await response.json();

    const container = document.getElementById('campaigns-list');
    if (campaigns.length > 0) {
      container.innerHTML = `
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Sent</th>
              <th>Opened</th>
              <th>Clicked</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${campaigns.map(c => `
              <tr>
                <td>${escapeHtml(c.name)}</td>
                <td>${escapeHtml(c.subject)}</td>
                <td><span class="badge ${getStatusBadgeClass(c.status)}">${c.status}</span></td>
                <td>${c.stats?.sent || 0}</td>
                <td>${c.stats?.opened || 0}</td>
                <td>${c.stats?.clicked || 0}</td>
                <td>${formatDate(c.created_at)}</td>
                <td>
                  <div class="table-actions">
                    ${c.status === 'draft' ? `
                      <button class="btn btn-small btn-primary" onclick="sendCampaign(${c.id})">Send</button>
                      <button class="btn btn-small" onclick="editCampaign(${c.id})">Edit</button>
                      <button class="btn btn-small btn-danger" onclick="deleteCampaign(${c.id})">Delete</button>
                    ` : `
                      <button class="btn btn-small" onclick="viewCampaignStats(${c.id})">Stats</button>
                    `}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      container.innerHTML = '<div class="empty-state">No campaigns yet. Create your first campaign!</div>';
    }
  } catch (err) {
    console.error('Failed to load campaigns:', err);
  }
}

let selectedTemplateId = null;

async function showCampaignModal(campaign = null) {
  editingCampaignId = campaign ? campaign.id : null;
  selectedTemplateId = campaign?.template_id || null;

  document.getElementById('campaign-modal-title').textContent = campaign ? 'Edit Campaign' : 'Create Campaign';
  document.getElementById('campaign-name').value = campaign?.name || '';
  document.getElementById('campaign-subject').value = campaign?.subject || '';

  // Initialize Editor.js with campaign content or empty
  const blocks = campaign?.editor_blocks || null;
  await initCampaignEditor(blocks);

  // Load lists
  const listsPromise = fetch(`${API_BASE}/api/lists`)
    .then(r => r.json())
    .then(lists => {
      const select = document.getElementById('campaign-list');
      select.innerHTML = '<option value="">-- Select a list --</option>' +
        lists.map(l => `<option value="${l.id}" ${campaign?.list_id === l.id ? 'selected' : ''}>${escapeHtml(l.name)}</option>`).join('');
    });

  // Load templates
  const templatesPromise = fetch(`${API_BASE}/api/templates`)
    .then(r => r.json())
    .then(templates => {
      const select = document.getElementById('campaign-template');
      let options = '<option value="">-- Choose a template --</option>';
      options += '<option value="blank" ' + (!campaign?.template_id && campaign ? 'selected' : '') + '>Blank (start from scratch)</option>';
      options += templates.map(t => 
        `<option value="${t.id}" ${campaign?.template_id === t.id ? 'selected' : ''}>${escapeHtml(t.name)}</option>`
      ).join('');
      select.innerHTML = options;
      
      // If editing an existing campaign with a template, load the template content
      if (campaign?.template_id && !campaign?.editor_blocks) {
        loadTemplateIntoCampaign(campaign.template_id);
      }
    });

  await Promise.all([listsPromise, templatesPromise]);
  document.getElementById('campaign-modal').classList.add('active');
}

async function loadTemplateIntoCampaign(templateId = null) {
  const select = document.getElementById('campaign-template');
  const id = templateId || select.value;
  
  if (!id || id === 'blank') {
    selectedTemplateId = null;
    // Clear editor and start fresh
    await initCampaignEditor([]);
    document.getElementById('campaign-subject').value = '';
    return;
  }
  
  selectedTemplateId = parseInt(id);
  
  try {
    const response = await fetch(`${API_BASE}/api/templates/${id}`);
    const template = await response.json();
    
    // Load template content into editor
    if (template.editor_blocks) {
      await initCampaignEditor(template.editor_blocks);
    } else if (template.html_content) {
      // Convert HTML to blocks (simplified - just create a paragraph with the HTML)
      await initCampaignEditor([{
        type: 'paragraph',
        data: { text: template.html_content.replace(/<[^>]+>/g, '') }
      }]);
    }
    
    // Pre-fill subject if empty
    const subjectField = document.getElementById('campaign-subject');
    if (!subjectField.value) {
      subjectField.value = template.subject || '';
    }
    
  } catch (err) {
    console.error('Failed to load template:', err);
    showToast('Failed to load template content', 'error');
  }
}

function hideCampaignModal() {
  document.getElementById('campaign-modal').classList.remove('active');
  editingCampaignId = null;
}

async function saveCampaignAsDraft() {
  const name = document.getElementById('campaign-name').value.trim();
  const subject = document.getElementById('campaign-subject').value.trim();
  const listId = document.getElementById('campaign-list').value || null;
  const templateSelect = document.getElementById('campaign-template');
  const templateId = templateSelect.value === 'blank' ? null : (selectedTemplateId || (templateSelect.value ? parseInt(templateSelect.value) : null));

  if (!listId) {
    showToast('Please select a list to send to', 'error');
    return;
  }

  if (!templateId && templateSelect.value !== 'blank') {
    showToast('Please select a template or choose "Blank"', 'error');
    return;
  }

  // Get content from Editor.js
  const content = await getCampaignEditorContent();
  if (!content) {
    showToast('Failed to get editor content', 'error');
    return;
  }

  if (!name || !subject || !content.html) {
    showToast('Campaign name, subject, and content are required', 'error');
    return;
  }

  try {
    const method = editingCampaignId ? 'PUT' : 'POST';
    const url = editingCampaignId
      ? `${API_BASE}/api/campaigns/${editingCampaignId}`
      : `${API_BASE}/api/campaigns`;

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        subject,
        html_content: content.html,
        plain_text: content.plainText,
        list_id: listId,
        template_id: templateId,
        editor_blocks: content.blocks
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save campaign');
    }

    hideCampaignModal();
    showToast('Campaign saved as draft', 'success');
    loadCampaigns();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function sendCampaign(id) {
  editingCampaignId = id;
  document.getElementById('send-modal').classList.add('active');
}

function hideSendModal() {
  document.getElementById('send-modal').classList.remove('active');
  editingCampaignId = null;
}

async function confirmSendCampaign() {
  if (!editingCampaignId) return;

  const btn = document.getElementById('confirm-send-btn');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    const response = await fetch(`${API_BASE}/api/campaigns/${editingCampaignId}/send`, {
      method: 'POST'
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send campaign');
    }

    showToast(`Campaign sent! ${result.sent} emails queued, ${result.failed} failed.`, 'success');
    hideSendModal();
    loadCampaigns();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Now';
  }
}

async function editCampaign(id) {
  try {
    const response = await fetch(`${API_BASE}/api/campaigns/${id}`);
    const campaign = await response.json();
    showCampaignModal(campaign);
  } catch (err) {
    console.error('Failed to load campaign:', err);
  }
}

async function deleteCampaign(id) {
  if (!confirm('Are you sure you want to delete this campaign?')) return;

  try {
    const response = await fetch(`${API_BASE}/api/campaigns/${id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      showToast('Campaign deleted', 'success');
      loadCampaigns();
    }
  } catch (err) {
    console.error('Failed to delete campaign:', err);
  }
}

async function viewCampaignStats(id) {
  showToast('Campaign stats coming soon!', 'success');
  loadCampaigns();
}

// Settings
async function loadSettings() {
  try {
    const response = await fetch(`${API_BASE}/api/settings`);
    const settings = await response.json();

    document.getElementById('mailgun-api-key').value = '';
    document.getElementById('mailgun-domain').value = settings.mailgun_domain || '';
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

async function saveSettings() {
  const apiKey = document.getElementById('mailgun-api-key').value;
  const domain = document.getElementById('mailgun-domain').value.trim();

  if (!domain) {
    showToast('Domain is required', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mailgun_api_key: apiKey || undefined,
        mailgun_domain: domain
      })
    });

    if (response.ok) {
      showToast('Settings saved successfully!', 'success');
    } else {
      throw new Error('Failed to save settings');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Utility functions
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function renderTags(tags) {
  if (!tags || tags.length === 0) return '-';
  return tags.map(t => `<span class="badge badge-secondary">${escapeHtml(t)}</span>`).join(' ');
}

function getStatusBadgeClass(status) {
  const classes = {
    'draft': 'badge-secondary',
    'sending': 'badge-warning',
    'sent': 'badge-success',
    'delivered': 'badge-success',
    'opened': 'badge-primary',
    'clicked': 'badge-primary',
    'bounced': 'badge-danger',
    'complained': 'badge-danger'
  };
  return classes[status] || 'badge-secondary';
}

// Make functions globally available
window.showContactModal = showContactModal;
window.hideContactModal = hideContactModal;
window.saveContact = saveContact;
window.editContact = editContact;
window.deleteContact = deleteContact;
window.showListModal = showListModal;
window.hideListModal = hideListModal;
window.saveList = saveList;
window.viewList = viewList;
window.hideListDetailModal = hideListDetailModal;
window.removeContactFromList = removeContactFromList;
window.addSelectedContactToList = addSelectedContactToList;
window.editList = editList;
window.deleteList = deleteList;
window.showTemplateModal = showTemplateModal;
window.hideTemplateModal = hideTemplateModal;
window.saveTemplate = saveTemplate;
window.editTemplate = editTemplate;
window.deleteTemplate = deleteTemplate;
window.showCampaignModal = showCampaignModal;
window.hideCampaignModal = hideCampaignModal;
window.saveCampaignAsDraft = saveCampaignAsDraft;
window.sendCampaign = sendCampaign;
window.hideSendModal = hideSendModal;
window.confirmSendCampaign = confirmSendCampaign;
window.editCampaign = editCampaign;
window.deleteCampaign = deleteCampaign;
window.viewCampaignStats = viewCampaignStats;
window.saveSettings = saveSettings;
window.importContacts = importContacts;
window.exportContacts = exportContacts;
window.exportAllContacts = exportAllContacts;
window.bulkDeleteContacts = bulkDeleteContacts;
window.clearSelection = clearSelection;
window.getSelectedContacts = getSelectedContacts;