/**
 * Comprehensive API Tests for Email Marketer
 * Tests all features including authentication, sharing, and all CRUD operations
 */

const request = require('supertest');
const BASE_URL = 'http://localhost:3080';

describe('Email Marketer API Tests', () => {
  let authToken = null;
  let testUserId = null;
  let testContactId = null;
  let testListId = null;
  let testTemplateId = null;
  let testCampaignId = null;
  let shareId = null;

  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'password123';

  // ========== AUTHENTICATION ==========
  describe('Authentication API', () => {
    test('POST /api/auth/register - should register new user', async () => {
      const res = await request(BASE_URL)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          name: 'Test User'
        })
        .expect(201);

      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(testEmail);
      authToken = res.body.token;
      testUserId = res.body.user.id;
    });

    test('POST /api/auth/login - should login user', async () => {
      const res = await request(BASE_URL)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        })
        .expect(200);

      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(testEmail);
      authToken = res.body.token;
    });

    test('GET /api/auth/me - should return current user', async () => {
      const res = await request(BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.email).toBe(testEmail);
      expect(res.body.id).toBe(testUserId);
    });

    test('POST /api/auth/login - should reject invalid credentials', async () => {
      await request(BASE_URL)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'wrongpassword'
        })
        .expect(401);
    });

    test('GET /api/contacts - should reject requests without auth', async () => {
      await request(BASE_URL)
        .get('/api/contacts')
        .expect(401);
    });
  });

  // ========== CONTACTS API ==========
  describe('Contacts API', () => {
    test('POST /api/contacts - should create contact', async () => {
      const res = await request(BASE_URL)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: `contact-${Date.now()}@example.com`,
          name: 'API Test User',
          tags: ['test', 'api']
        })
        .expect(201);

      expect(res.body.email).toBeDefined();
      expect(Array.isArray(res.body.tags)).toBe(true);
      expect(res.body.tags).toContain('test');
      testContactId = res.body.id;
    });

    test('GET /api/contacts - should return contacts with parsed tags', async () => {
      const res = await request(BASE_URL)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(Array.isArray(res.body[0].tags)).toBe(true);
      }
    });

    test('GET /api/contacts?search= - should search contacts', async () => {
      const res = await request(BASE_URL)
        .get('/api/contacts?search=nonexistent-xyz')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.length).toBe(0);
    });

    test('GET /api/contacts/:id - should return single contact', async () => {
      const res = await request(BASE_URL)
        .get(`/api/contacts/${testContactId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.id).toBe(testContactId);
      expect(Array.isArray(res.body.tags)).toBe(true);
    });

    test('PUT /api/contacts/:id - should update contact', async () => {
      const res = await request(BASE_URL)
        .put(`/api/contacts/${testContactId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: `updated-${Date.now()}@example.com`, name: 'Updated Name', tags: ['updated'] })
        .expect(200);

      expect(res.body.name).toBe('Updated Name');
      expect(res.body.tags).toContain('updated');
    });

    test('DELETE /api/contacts/:id - should delete contact', async () => {
      // Create a contact to delete
      const createRes = await request(BASE_URL)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: `delete-test-${Date.now()}@example.com`, name: 'To Delete' });

      await request(BASE_URL)
        .delete(`/api/contacts/${createRes.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  // ========== LISTS API ==========
  describe('Lists API', () => {
    test('POST /api/lists - should create list', async () => {
      const res = await request(BASE_URL)
        .post('/api/lists')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `API Test List ${Date.now()}`,
          description: 'Test description'
        })
        .expect(201);

      expect(res.body.name).toBeDefined();
      expect(res.body.id).toBeDefined();
      testListId = res.body.id;
    });

    test('GET /api/lists - should return lists with stats', async () => {
      const res = await request(BASE_URL)
        .get('/api/lists')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0].stats).toBeDefined();
        expect(typeof res.body[0].stats.totalContacts).toBe('number');
      }
    });

    test('POST /api/lists/:id/contacts - should add contact to list', async () => {
      const res = await request(BASE_URL)
        .post(`/api/lists/${testListId}/contacts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactId: testContactId })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    test('GET /api/lists/:id - should reflect added contact in stats', async () => {
      const res = await request(BASE_URL)
        .get(`/api/lists/${testListId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.stats.totalContacts).toBeGreaterThan(0);
    });

    test('GET /api/lists/:id - should return list with contacts array', async () => {
      const res = await request(BASE_URL)
        .get(`/api/lists/${testListId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.id).toBe(testListId);
      expect(Array.isArray(res.body.contacts)).toBe(true);
      expect(res.body.stats).toBeDefined();
    });

    test('DELETE /api/lists/:id/contacts/:contactId - should remove contact', async () => {
      await request(BASE_URL)
        .delete(`/api/lists/${testListId}/contacts/${testContactId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  // ========== TEMPLATES API ==========
  describe('Templates API', () => {
    test('POST /api/templates - should create template', async () => {
      const res = await request(BASE_URL)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `API Test Template ${Date.now()}`,
          subject: 'Test Subject',
          html_content: '<p>Test content</p>',
          plain_text: 'Test content',
          editor_blocks: [{ type: 'paragraph', data: { text: 'Test' } }]
        })
        .expect(201);

      expect(res.body.name).toBeDefined();
      expect(res.body.subject).toBe('Test Subject');
      testTemplateId = res.body.id;
    });

    test('GET /api/templates - should return templates', async () => {
      const res = await request(BASE_URL)
        .get('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /api/templates/:id - should return template with editor_blocks', async () => {
      const res = await request(BASE_URL)
        .get(`/api/templates/${testTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.id).toBe(testTemplateId);
      expect(res.body.html_content).toBeDefined();
    });
  });

  // ========== CAMPAIGNS API ==========
  describe('Campaigns API', () => {
    test('POST /api/campaigns - should create campaign with template', async () => {
      const res = await request(BASE_URL)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `API Test Campaign ${Date.now()}`,
          subject: 'Campaign Subject',
          html_content: '<p>Campaign content</p>',
          plain_text: 'Campaign content',
          list_id: testListId,
          template_id: testTemplateId,
          editor_blocks: [{ type: 'paragraph', data: { text: 'Campaign' } }]
        })
        .expect(201);

      expect(res.body.name).toBeDefined();
      expect(res.body.status).toBe('draft');
      expect(res.body.template_id).toBe(testTemplateId);
      testCampaignId = res.body.id;
    });

    test('GET /api/campaigns - should return campaigns with stats', async () => {
      const res = await request(BASE_URL)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0].stats).toBeDefined();
      }
    });
  });

  // ========== SHARING API ==========
  describe('Sharing API', () => {
    test('POST /api/shares - should share a list', async () => {
      // First create a second test user
      const user2Res = await request(BASE_URL)
        .post('/api/auth/register')
        .send({
          email: `user2-${Date.now()}@example.com`,
          password: 'password123',
          name: 'User 2'
        });

      const res = await request(BASE_URL)
        .post('/api/shares')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          resourceType: 'lists',
          resourceId: testListId,
          sharedWithEmail: user2Res.body.user.email,
          permission: 'view'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.shares).toBeDefined();
      shareId = res.body.shares[0]?.id;
    });

    test('GET /api/shares/:resourceType/:resourceId - should list shares', async () => {
      const res = await request(BASE_URL)
        .get(`/api/shares/lists/${testListId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    test('DELETE /api/shares/:shareId - should remove share', async () => {
      if (shareId) {
        await request(BASE_URL)
          .delete(`/api/shares/${shareId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      }
    });
  });

  // ========== STATS API ==========
  describe('Stats API', () => {
    test('GET /api/stats - should return dashboard stats', async () => {
      const res = await request(BASE_URL)
        .get('/api/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(typeof res.body.contacts).toBe('number');
      expect(typeof res.body.lists).toBe('number');
      expect(typeof res.body.campaigns).toBe('number');
      expect(typeof res.body.totalEmailsSent).toBe('number');
      expect(Array.isArray(res.body.recentCampaigns)).toBe(true);
    });
  });

  // ========== SETTINGS API ==========
  describe('Settings API', () => {
    test('POST /api/settings - should save settings', async () => {
      const res = await request(BASE_URL)
        .post('/api/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mailgun_domain: 'mg.example.com'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    test('GET /api/settings - should return settings', async () => {
      const res = await request(BASE_URL)
        .get('/api/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.mailgun_domain).toBeDefined();
    });
  });

  // ========== IMAGE UPLOAD API ==========
  describe('Image Upload API', () => {
    test('POST /api/upload-image - should handle image upload', async () => {
      // Base64 encoded 1x1 pixel PNG
      const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      
      const res = await request(BASE_URL)
        .post('/api/upload-image')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          image: base64Image,
          campaignId: testCampaignId
        })
        .expect(200);

      expect(res.body.success).toBe(1);
      expect(res.body.file.url).toBeDefined();
    });
  });

  // Cleanup
  afterAll(async () => {
    // Clean up test resources
    if (testCampaignId) {
      await request(BASE_URL)
        .delete(`/api/campaigns/${testCampaignId}`)
        .set('Authorization', `Bearer ${authToken}`);
    }
    if (testTemplateId) {
      await request(BASE_URL)
        .delete(`/api/templates/${testTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`);
    }
    if (testListId) {
      await request(BASE_URL)
        .delete(`/api/lists/${testListId}`)
        .set('Authorization', `Bearer ${authToken}`);
    }
    if (testContactId) {
      await request(BASE_URL)
        .delete(`/api/contacts/${testContactId}`)
        .set('Authorization', `Bearer ${authToken}`);
    }
  });
});