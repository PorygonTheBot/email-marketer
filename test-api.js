const http = require('http');

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

async function runTests() {
  console.log('=== API Integration Tests ===\n');
  
  // Test 1: Create a list
  console.log('Test 1: Create List');
  const listResult = await apiRequest('POST', '/api/lists', {
    name: 'Test List ' + Date.now(),
    description: 'Test description'
  });
  console.log('Status:', listResult.statusCode);
  console.log('Response:', JSON.stringify(listResult.body, null, 2));
  
  // Test 2: Create a template
  console.log('\nTest 2: Create Template');
  const templateResult = await apiRequest('POST', '/api/templates', {
    name: 'Test Template ' + Date.now(),
    subject: 'Test Subject',
    html_content: '<h1>Test</h1>',
    plain_text: 'Test'
  });
  console.log('Status:', templateResult.statusCode);
  console.log('Response:', JSON.stringify(templateResult.body, null, 2));
  
  // Test 3: Get all lists
  console.log('\nTest 3: Get All Lists');
  const listsResult = await apiRequest('GET', '/api/lists');
  console.log('Status:', listsResult.statusCode);
  console.log('Count:', listsResult.body?.length || 0);
  
  // Test 4: Get all templates
  console.log('\nTest 4: Get All Templates');
  const templatesResult = await apiRequest('GET', '/api/templates');
  console.log('Status:', templatesResult.statusCode);
  console.log('Count:', templatesResult.body?.length || 0);
}

runTests().catch(console.error);
