/**
 * API-Level Tests for Email Marketer
 * Fast tests that don't require a browser
 */

const request = require('supertest');
const express = require('express');

// Need to test against running server
const BASE_URL = 'http://localhost:3080';

describe('Email Marketer API Tests', () => {
  let testContactId = null;
  let testListId = null;
  let testTemplateId = null;
  let testCampaignId = null;

  // ========== CONTACTS API ==========
  describe('Contacts API', () => {
    test('POST /api/contacts - should create contact', async () => {
      const res = await request(BASE_URL)
        .post('/api/contacts')
        .send({
          email: `api-test-${Date.now()}@example.com`,
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
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        // Verify tags are arrays, not JSON strings
        expect(Array.isArray(res.body[0].tags)).toBe(true);
      }
    });

    test('GET /api/contacts?search= - should search contacts', async () => {
      const res = await request(BASE_URL)
        .get('/api/contacts?search=nonexistent-xyz')
        .expect(200);

      expect(res.body.length).toBe(0);
    });

    test('GET /api/contacts?tag= - should filter by tag', async () => {
      const res = await request(BASE_URL)
        .get('/api/contacts?tag=test')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /api/contacts/:id - should return single contact', async () => {
      if (!testContactId) return;
      const res = await request(BASE_URL)
        .get(`/api/contacts/${testContactId}`)
        .expect(200);

      expect(res.body.id).toBe(testContactId);
      expect(Array.isArray(res.body.tags)).toBe(true);
    });

    test('PUT /api/contacts/:id - should update contact', async () => {
      if (!testContactId) return;
      const res = await request(BASE_URL)
        .put(`/api/contacts/${testContactId}`)
        .send({ email: `updated-${Date.now()}@example.com`, name: 'Updated Name', tags: ['updated'] })
        .expect(200);

      expect(res.body.name).toBe('Updated Name');
      expect(res.body.tags).toContain('updated');
    });

    test('POST /api/contacts - should reject invalid email', async () => {
      await request(BASE_URL)
        .post('/api/contacts')
        .send({ email: 'invalid-email', name: 'Test' })
        .expect(400);
    });

    test('POST /api/contacts - should require email', async () => {
      await request(BASE_URL)
        .post('/api/contacts')
        .send({ name: 'Test' })
        .expect(400);
    });

    test('DELETE /api/contacts/:id - should delete contact', async () => {
      // Create a contact to delete
      const createRes = await request(BASE_URL)
        .post('/api/contacts')
        .send({ email: `delete-test-${Date.now()}@example.com`, name: 'To Delete' });

      await request(BASE_URL)
        .delete(`/api/contacts/${createRes.body.id}`)
        .expect(200);
    });
  });

  // ========== LISTS API ==========
  describe('Lists API', () => {
    test('POST /api/lists - should create list', async () => {
      const res = await request(BASE_URL)
        .post('/api/lists')
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
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0].stats).toBeDefined();
        expect(typeof res.body[0].stats.totalContacts).toBe('number');
      }
    });

    test('GET /api/lists/:id - should return list with contacts', async () => {
      if (!testListId) return;
      const res = await request(BASE_URL)
        .get(`/api/lists/${testListId}`)
        .expect(200);

      expect(res.body.id).toBe(testListId);
      expect(Array.isArray(res.body.contacts)).toBe(true);
      expect(res.body.stats).toBeDefined();
    });

    test('POST /api/lists - should require name', async () => {
      await request(BASE_URL)
        .post('/api/lists')
        .send({ description: 'No name' })
        .expect(400);
    });

    test('PUT /api/lists/:id - should update list', async () => {
      if (!testListId) return;
      const res = await request(BASE_URL)
        .put(`/api/lists/${testListId}`)
        .send({ name: 'Updated List Name', description: 'Updated desc' })
        .expect(200);

      expect(res.body.name).toBe('Updated List Name');
    });

    test('POST /api/lists/:id/contacts - should add contact to list', async () => {
      if (!testListId || !testContactId) return;

      const res = await request(BASE_URL)
        .post(`/api/lists/${testListId}/contacts`)
        .send({ contactId: testContactId })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    test('GET /api/lists/:id - should reflect added contact in stats', async () => {
      if (!testListId) return;
      const res = await request(BASE_URL)
        .get(`/api/lists/${testListId}`)
        .expect(200);

      expect(res.body.stats.totalContacts).toBeGreaterThan(0);
    });

    test('DELETE /api/lists/:id/contacts/:contactId - should remove contact', async () => {
      if (!testListId || !testContactId) return;

      await request(BASE_URL)
        .delete(`/api/lists/${testListId}/contacts/${testContactId}`)
        .expect(200);
    });
  });

  // ========== TEMPLATES API ==========
  describe('Templates API', () => {
    test('POST /api/templates - should create template', async () => {
      const res = await request(BASE_URL)
        .post('/api/templates')
        .send({
          name: `API Test Template ${Date.now()}`,
          subject: 'Test Subject',
          html_content: '<p>Test content</p>',
          plain_text: 'Test content'
        })
        .expect(201);

      expect(res.body.name).toBeDefined();
      expect(res.body.subject).toBe('Test Subject');
      testTemplateId = res.body.id;
    });

    test('GET /api/templates - should return templates', async () => {
      const res = await request(BASE_URL)
        .get('/api/templates')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    test('POST /api/templates - should require name, subject, html', async () => {
      await request(BASE_URL)
        .post('/api/templates')
        .send({ name: 'Incomplete' })
        .expect(400);
    });

    test('PUT /api/templates/:id - should update template', async () => {
      if (!testTemplateId) return;
      const res = await request(BASE_URL)
        .put(`/api/templates/${testTemplateId}`)
        .send({
          name: 'Updated Template',
          subject: 'Updated Subject',
          html_content: '<p>Updated</p>'
        })
        .expect(200);

      expect(res.body.name).toBe('Updated Template');
    });
  });

  // ========== CAMPAIGNS API ==========
  describe('Campaigns API', () => {
    test('POST /api/campaigns - should create campaign', async () => {
      const res = await request(BASE_URL)
        .post('/api/campaigns')
        .send({
          name: `API Test Campaign ${Date.now()}`,
          subject: 'Campaign Subject',
          html_content: '<p>Campaign content</p>',
          plain_text: 'Campaign content',
          list_id: testListId
        })
        .expect(201);

      expect(res.body.name).toBeDefined();
      expect(res.body.status).toBe('draft');
      testCampaignId = res.body.id;
    });

    test('GET /api/campaigns - should return campaigns with stats', async () => {
      const res = await request(BASE_URL)
        .get('/api/campaigns')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0].stats).toBeDefined();
      }
    });

    test('PUT /api/campaigns/:id - should update campaign', async () => {
      if (!testCampaignId) return;
      const res = await request(BASE_URL)
        .put(`/api/campaigns/${testCampaignId}`)
        .send({
          name: 'Updated Campaign',
          subject: 'Updated Subject',
          html_content: '<p>Updated</p>'
        })
        .expect(200);

      expect(res.body.name).toBe('Updated Campaign');
    });
  });

  // ========== STATS API ==========
  describe('Stats API', () => {
    test('GET /api/stats - should return dashboard stats', async () => {
      const res = await request(BASE_URL)
        .get('/api/stats')
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
        .send({
          mailgun_domain: 'mg.example.com'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    test('GET /api/settings - should return settings', async () => {
      const res = await request(BASE_URL)
        .get('/api/settings')
        .expect(200);

      expect(res.body.mailgun_domain).toBeDefined();
    });
  });

  // Cleanup
  afterAll(async () => {
    // Delete test resources
    if (testCampaignId) {
      await request(BASE_URL).delete(`/api/campaigns/${testCampaignId}`);
    }
    if (testTemplateId) {
      await request(BASE_URL).delete(`/api/templates/${testTemplateId}`);
    }
    if (testListId) {
      await request(BASE_URL).delete(`/api/lists/${testListId}`);
    }
    if (testContactId) {
      await request(BASE_URL).delete(`/api/contacts/${testContactId}`);
    }
  });
});
