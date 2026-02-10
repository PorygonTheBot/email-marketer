/**
 * Comprehensive Integration Tests for Email Marketer
 * Tests all API endpoints and functionality
 */

const http = require('http');

// Test tracking
let passed = 0;
let failed = 0;
const failures = [];

// Helper function to make API requests
function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3080,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Test helper
async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${err.message}`);
    failures.push({ name, error: err.message });
    failed++;
  }
}

// Assert helpers
function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error(message || 'Expected true, got false');
  }
}

// Store IDs for cleanup
const testData = {
  contacts: [],
  lists: [],
  templates: [],
  campaigns: []
};

async function runAllTests() {
  console.log('\n========================================');
  console.log('  Email Marketer Integration Tests');
  console.log('========================================\n');

  // ========== CONTACTS TESTS ==========
  console.log('\n📇 CONTACTS TESTS\n');

  const timestamp = Date.now();
  
  await test('Create contact with all fields', async () => {
    const result = await apiRequest('POST', '/api/contacts', {
      email: `test${timestamp}@example.com`,
      name: 'Test User',
      tags: ['test', 'automation']
    });
    assertEqual(result.statusCode, 201, 'Status code');
    assertTrue(result.body.id, 'Should have ID');
    assertEqual(result.body.email, `test${timestamp}@example.com`, 'Email');
    assertEqual(result.body.name, 'Test User', 'Name');
    testData.contacts.push(result.body.id);
  });

  await test('Create contact with email only', async () => {
    const result = await apiRequest('POST', '/api/contacts', {
      email: `minimal${timestamp}@example.com`
    });
    assertEqual(result.statusCode, 201, 'Status code');
    testData.contacts.push(result.body.id);
  });

  await test('Reject contact without email', async () => {
    const result = await apiRequest('POST', '/api/contacts', {
      name: 'No Email User'
    });
    assertEqual(result.statusCode, 400, 'Should reject without email');
  });

  await test('Get all contacts', async () => {
    const result = await apiRequest('GET', '/api/contacts');
    assertEqual(result.statusCode, 200, 'Status code');
    assertTrue(Array.isArray(result.body), 'Should return array');
    assertTrue(result.body.length >= 2, 'Should have at least 2 contacts');
  });

  await test('Update contact', async () => {
    const result = await apiRequest('PUT', `/api/contacts/${testData.contacts[0]}`, {
      name: 'Updated Name',
      tags: ['updated', 'tags']
    });
    assertEqual(result.statusCode, 200, 'Status code');
    assertEqual(result.body.name, 'Updated Name', 'Name should be updated');
  });

  // ========== LISTS TESTS ==========
  console.log('\n📋 LISTS TESTS\n');

  await test('Create list', async () => {
    const result = await apiRequest('POST', '/api/lists', {
      name: 'Test List',
      description: 'Test description'
    });
    assertEqual(result.statusCode, 201, 'Status code');
    assertTrue(result.body.id, 'Should have ID');
    testData.lists.push(result.body.id);
  });

  await test('Reject list without name', async () => {
    const result = await apiRequest('POST', '/api/lists', {
      description: 'No name list'
    });
    assertEqual(result.statusCode, 400, 'Should reject without name');
  });

  await test('Get all lists', async () => {
    const result = await apiRequest('GET', '/api/lists');
    assertEqual(result.statusCode, 200, 'Status code');
    assertTrue(Array.isArray(result.body), 'Should return array');
  });

  await test('Add contact to list', async () => {
    const result = await apiRequest('POST', `/api/lists/${testData.lists[0]}/contacts`, {
      contactId: testData.contacts[0]
    });
    assertEqual(result.statusCode, 200, 'Status code');
  });

  await test('Update list', async () => {
    const result = await apiRequest('PUT', `/api/lists/${testData.lists[0]}`, {
      name: 'Updated List Name',
      description: 'Updated description'
    });
    assertEqual(result.statusCode, 200, 'Status code');
    assertEqual(result.body.name, 'Updated List Name', 'Name should be updated');
  });

  // ========== TEMPLATES TESTS ==========
  console.log('\n📝 TEMPLATES TESTS\n');

  await test('Create template with camelCase', async () => {
    const result = await apiRequest('POST', '/api/templates', {
      name: 'Test Template Camel',
      subject: 'Test Subject',
      htmlContent: '<h1>Hello</h1>',
      plainText: 'Hello'
    });
    assertEqual(result.statusCode, 201, 'Status code');
    assertTrue(result.body.id, 'Should have ID');
    testData.templates.push(result.body.id);
  });

  await test('Create template with snake_case', async () => {
    const result = await apiRequest('POST', '/api/templates', {
      name: 'Test Template Snake',
      subject: 'Test Subject',
      html_content: '<h1>Hello Snake</h1>',
      plain_text: 'Hello Snake'
    });
    assertEqual(result.statusCode, 201, 'Status code');
    testData.templates.push(result.body.id);
  });

  await test('Reject template without required fields', async () => {
    const result = await apiRequest('POST', '/api/templates', {
      name: 'Incomplete'
    });
    assertEqual(result.statusCode, 400, 'Should reject incomplete template');
  });

  await test('Get all templates', async () => {
    const result = await apiRequest('GET', '/api/templates');
    assertEqual(result.statusCode, 200, 'Status code');
    assertTrue(Array.isArray(result.body), 'Should return array');
  });

  await test('Update template', async () => {
    const result = await apiRequest('PUT', `/api/templates/${testData.templates[0]}`, {
      name: 'Updated Template',
      subject: 'Updated Subject'
    });
    assertEqual(result.statusCode, 200, 'Status code');
  });

  // ========== CAMPAIGNS TESTS ==========
  console.log('\n🚀 CAMPAIGNS TESTS\n');

  await test('Create campaign', async () => {
    const result = await apiRequest('POST', '/api/campaigns', {
      name: 'Test Campaign',
      subject: 'Test Subject',
      html_content: '<h1>Campaign</h1>',
      plain_text: 'Campaign',
      list_id: testData.lists[0]
    });
    assertEqual(result.statusCode, 201, 'Status code');
    assertTrue(result.body.id, 'Should have ID');
    testData.campaigns.push(result.body.id);
  });

  await test('Get all campaigns', async () => {
    const result = await apiRequest('GET', '/api/campaigns');
    assertEqual(result.statusCode, 200, 'Status code');
    assertTrue(Array.isArray(result.body), 'Should return array');
  });

  await test('Update campaign', async () => {
    const result = await apiRequest('PUT', `/api/campaigns/${testData.campaigns[0]}`, {
      name: 'Updated Campaign',
      subject: 'Updated Subject'
    });
    assertEqual(result.statusCode, 200, 'Status code');
  });

  // ========== STATS TESTS ==========
  console.log('\n📊 STATS TESTS\n');

  await test('Get dashboard stats', async () => {
    const result = await apiRequest('GET', '/api/stats');
    assertEqual(result.statusCode, 200, 'Status code');
    assertTrue(typeof result.body.contacts === 'number', 'Should have contacts count');
    assertTrue(typeof result.body.lists === 'number', 'Should have lists count');
    assertTrue(typeof result.body.campaigns === 'number', 'Should have campaigns count');
  });

  // ========== SETTINGS TESTS ==========
  console.log('\n⚙️ SETTINGS TESTS\n');

  await test('Get settings', async () => {
    const result = await apiRequest('GET', '/api/settings');
    assertEqual(result.statusCode, 200, 'Status code');
    assertTrue(result.body.hasOwnProperty('mailgun_domain'), 'Should have mailgun_domain');
  });

  await test('Save settings', async () => {
    const result = await apiRequest('POST', '/api/settings', {
      mailgun_domain: 'test.example.com',
      mailgun_api_key: 'test-key'
    });
    assertEqual(result.statusCode, 200, 'Status code');
  });

  // ========== CLEANUP ==========
  console.log('\n🧹 CLEANUP\n');

  await test('Delete campaigns', async () => {
    for (const id of testData.campaigns) {
      const result = await apiRequest('DELETE', `/api/campaigns/${id}`);
      assertEqual(result.statusCode, 200, `Should delete campaign ${id}`);
    }
  });

  await test('Delete templates', async () => {
    for (const id of testData.templates) {
      const result = await apiRequest('DELETE', `/api/templates/${id}`);
      assertEqual(result.statusCode, 200, `Should delete template ${id}`);
    }
  });

  await test('Delete lists', async () => {
    for (const id of testData.lists) {
      const result = await apiRequest('DELETE', `/api/lists/${id}`);
      assertEqual(result.statusCode, 200, `Should delete list ${id}`);
    }
  });

  await test('Delete contacts', async () => {
    for (const id of testData.contacts) {
      const result = await apiRequest('DELETE', `/api/contacts/${id}`);
      assertEqual(result.statusCode, 200, `Should delete contact ${id}`);
    }
  });

  // ========== SUMMARY ==========
  console.log('\n========================================');
  console.log('  Test Summary');
  console.log('========================================');
  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);

  if (failed > 0) {
    console.log('\nFailed Tests:');
    failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  }

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});