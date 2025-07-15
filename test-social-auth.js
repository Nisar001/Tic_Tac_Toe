// Simple test script to check social auth endpoints
const https = require('https');

const baseURL = 'https://tic-tac-toe-uf5h.onrender.com';

async function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'tic-tac-toe-uf5h.onrender.com',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Test Script'
      }
    };

    const req = https.request(options, (res) => {
      console.log(`Testing ${path}:`);
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Response: ${data}`);
        console.log('---\n');
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.error(`Error testing ${path}:`, error);
      reject(error);
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing Social Auth Endpoints...\n');
  
  try {
    // Test API root
    await testEndpoint('/api');
    
    // Test health endpoint
    await testEndpoint('/api/health');
    
    // Test social auth endpoints
    await testEndpoint('/api/auth/social/google');
    await testEndpoint('/api/auth/social/facebook');
    
    console.log('All tests completed.');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTests();
