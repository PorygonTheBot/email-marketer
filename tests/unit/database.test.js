/**
 * Unit tests for database operations
 */

const path = require('path');

// Mock database operations
const dbPath = path.join(__dirname, '..', '..', 'data', 'test.db');

// Import database module
const {
  initDatabase,
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
  getTemplates,
  getTemplate,
  createTemplate,
  deleteTemplate,
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaignStatus,
  deleteCampaign,
  getSetting,
  setSetting
} = require('../../database');

describe('Database Operations', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  afterAll(() => {
    // Clean up test database
    const fs = require('fs');
    const testDbPath = path.join(__dirname, '..', '..', 'data', 'test.db');
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Contacts', () => {
    test('should create a new contact', async () => {
      const contact = await createContact('test@example.com', 'Test User', ['vip', 'newsletter']);
      expect(contact).toBeDefined();
      expect(contact.email).toBe('test@example.com');
      expect(contact.name).toBe('Test User');
      expect(contact.tags).toContain('vip');
      expect(contact.tags).toContain('newsletter');
    });

    test('should get contact by email', async () => {
      const contact = await getContactByEmail('test@example.com');
      expect(contact).toBeDefined();
      expect(contact.email).toBe('test@example.com');
    });

    test('should get all contacts', async () => {
      const contacts = await getContacts();
      expect(Array.isArray(contacts)).toBe(true);
      expect(contacts.length).toBeGreaterThan(0);
    });

    test('should search contacts', async () => {
      const contacts = await getContacts({ search: 'test' });
      expect(Array.isArray(contacts)).toBe(true);
      expect(contacts.length).toBeGreaterThan(0);
    });

    test('should filter contacts by tag', async () => {
      const contacts = await getContacts({ tag: 'vip' });
      expect(Array.isArray(contacts)).toBe(true);
    });

    test('should update contact', async () => {
      const contacts = await getContacts({ search: 'test' });
      if (contacts.length > 0) {
        const updated = await updateContact(contacts[0].id, 'updated@example.com', 'Updated User');
        expect(updated.email).toBe('updated@example.com');
      }
    });

    test('should delete contact', async () => {
      const contacts = await getContacts({ search: 'updated' });
      if (contacts.length > 0) {
        await deleteContact(contacts[0].id);
        const deleted = await getContact(contacts[0].id);
        expect(deleted).toBeNull();
      }
    });
  });

  describe('Lists', () => {
    let listId;

    test('should create a new list', async () => {
      const list = await createList('Test List', 'A test mailing list');
      expect(list).toBeDefined();
      expect(list.name).toBe('Test List');
      expect(list.description).toBe('A test mailing list');
      listId = list.id;
    });

    test('should get all lists', async () => {
      const lists = await getLists();
      expect(Array.isArray(lists)).toBe(true);
      expect(lists.length).toBeGreaterThan(0);
    });

    test('should get list by id', async () => {
      if (listId) {
        const list = await getList(listId);
        expect(list).toBeDefined();
        expect(list.name).toBe('Test List');
      }
    });

    test('should update list', async () => {
      if (listId) {
        const updated = await updateList(listId, 'Updated List', 'Updated description');
        expect(updated.name).toBe('Updated List');
      }
    });

    test('should delete list', async () => {
      if (listId) {
        await deleteList(listId);
        const deleted = await getList(listId);
        expect(deleted).toBeNull();
      }
    });
  });

  describe('Templates', () => {
    let templateId;

    test('should create a new template', async () => {
      const template = await createTemplate(
        'Test Template',
        'Test Subject',
        '<h1>Hello {{name}}</h1>',
        'Hello {{name}}'
      );
      expect(template).toBeDefined();
      expect(template.name).toBe('Test Template');
      expect(template.subject).toBe('Test Subject');
      templateId = template.id;
    });

    test('should get all templates', async () => {
      const templates = await getTemplates();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    test('should get template by id', async () => {
      if (templateId) {
        const template = await getTemplate(templateId);
        expect(template).toBeDefined();
        expect(template.name).toBe('Test Template');
      }
    });

    test('should delete template', async () => {
      if (templateId) {
        await deleteTemplate(templateId);
        const deleted = await getTemplate(templateId);
        expect(deleted).toBeNull();
      }
    });
  });

  describe('Campaigns', () => {
    let campaignId;

    test('should create a new campaign', async () => {
      const campaign = await createCampaign(
        'Test Campaign',
        'Test Subject',
        '<h1>Hello {{name}}</h1>',
        'Hello {{name}}'
      );
      expect(campaign).toBeDefined();
      expect(campaign.name).toBe('Test Campaign');
      expect(campaign.status).toBe('draft');
      campaignId = campaign.id;
    });

    test('should get all campaigns', async () => {
      const campaigns = await getCampaigns();
      expect(Array.isArray(campaigns)).toBe(true);
      expect(campaigns.length).toBeGreaterThan(0);
    });

    test('should get campaign by id', async () => {
      if (campaignId) {
        const campaign = await getCampaign(campaignId);
        expect(campaign).toBeDefined();
        expect(campaign.name).toBe('Test Campaign');
      }
    });

    test('should update campaign status', async () => {
      if (campaignId) {
        const updated = await updateCampaignStatus(campaignId, 'sent');
        expect(updated.status).toBe('sent');
      }
    });

    test('should delete campaign', async () => {
      if (campaignId) {
        await deleteCampaign(campaignId);
        const deleted = await getCampaign(campaignId);
        expect(deleted).toBeNull();
      }
    });
  });

  describe('Settings', () => {
    test('should set and get setting', async () => {
      await setSetting('test_key', { value: 'test_value' });
      const value = await getSetting('test_key');
      expect(value).toEqual({ value: 'test_value' });
    });
  });
});