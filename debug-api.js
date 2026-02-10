const http = require('http');

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost', port: 3080, path: path, method: method,
      headers: { 'Content-Type': 'application/json' }
    };
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

async function debug() {
  console.log('=== Debug API Issues ===\n');
  
  // Create a contact
  console.log('1. Creating contact...');
  const contact = await apiRequest('POST', '/api/contacts', {
    email: 'debug@example.com', name: 'Debug User'
  });
  console.log('Status:', contact.statusCode, 'ID:', contact.body?.id);
  
  if (contact.body?.id) {
    // Try to update it
    console.log('\n2. Updating contact...');
    const update = await apiRequest('PUT', `/api/contacts/${contact.body.id}`, {
      name: 'Updated Debug'
    });
    console.log('Status:', update.statusCode);
    console.log('Response:', update.body);
    
    // Clean up
    await apiRequest('DELETE', `/api/contacts/${contact.body.id}`);
  }
  
  // Create a list and try to add contact
  console.log('\n3. Creating list...');
  const list = await apiRequest('POST', '/api/lists', {
    name: 'Debug List'
  });
  console.log('Status:', list.statusCode, 'ID:', list.body?.id);
  
  if (list.body?.id && contact.body?.id) {
    console.log('\n4. Adding contact to list...');
    const add = await apiRequest('POST', `/api/lists/${list.body.id}/contacts`, {
      contactId: contact.body.id
    });
    console.log('Status:', add.statusCode);
    console.log('Response:', add.body);
    
    // Clean up
    await apiRequest('DELETE', `/api/lists/${list.body.id}`);
  }
}

debug().catch(console.error);
