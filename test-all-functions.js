const http = require('http');

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = { hostname: 'localhost', port: 3080, path: path, method: method,
      headers: { 'Content-Type': 'application/json' } };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ statusCode: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ statusCode: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testAll() {
  console.log('=== Testing All Functionality ===\n');
  
  // Test 1: Create a list
  console.log('1. Creating list...');
  const list = await apiRequest('POST', '/api/lists', { name: 'Test List', description: 'Test' });
  console.log('   Status:', list.statusCode, 'ID:', list.body?.id);
  
  // Test 2: Create a contact
  console.log('\n2. Creating contact...');
  const contact = await apiRequest('POST', '/api/contacts', { 
    email: `test${Date.now()}@example.com`, 
    name: 'Test User' 
  });
  console.log('   Status:', contact.statusCode, 'ID:', contact.body?.id);
  
  // Test 3: Add contact to list (THE ISSUE)
  console.log('\n3. Adding contact to list...');
  if (list.body?.id && contact.body?.id) {
    const addResult = await apiRequest('POST', `/api/lists/${list.body.id}/contacts`, {
      contactId: contact.body.id
    });
    console.log('   Status:', addResult.statusCode);
    console.log('   Response:', addResult.body);
  }
  
  // Test 4: Rename list (THE ISSUE)
  console.log('\n4. Renaming list...');
  if (list.body?.id) {
    const renameResult = await apiRequest('PUT', `/api/lists/${list.body.id}`, {
      name: 'Renamed List',
      description: 'Updated description'
    });
    console.log('   Status:', renameResult.statusCode);
    console.log('   Response:', renameResult.body);
  }
  
  // Test 5: Get list with contacts
  console.log('\n5. Getting list with contacts...');
  if (list.body?.id) {
    const getList = await apiRequest('GET', `/api/lists/${list.body.id}`);
    console.log('   Status:', getList.statusCode);
    console.log('   Contacts count:', getList.body?.contacts?.length || 0);
  }
  
  // Cleanup
  console.log('\n6. Cleanup...');
  if (contact.body?.id) await apiRequest('DELETE', `/api/contacts/${contact.body.id}`);
  if (list.body?.id) await apiRequest('DELETE', `/api/lists/${list.body.id}`);
  console.log('   Done');
}

testAll().catch(console.error);
