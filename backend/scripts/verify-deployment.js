#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Checks if the deployed application is working correctly
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.argv[2] || 'http://localhost:10000';

console.log(`🔍 Verifying deployment at: ${BASE_URL}`);

const tests = [
  {
    name: 'Health Check',
    path: '/health',
    expectedStatus: 200
  },
  {
    name: 'API Root',
    path: '/',
    expectedStatus: 200
  },
  {
    name: 'Auth Routes',
    path: '/api/auth/',
    expectedStatus: 404 // Should return 404 for GET on auth root
  }
];

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https://') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data,
          headers: res.headers
        });
      });
    }).on('error', reject);
  });
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const url = `${BASE_URL}${test.path}`;
      console.log(`\n🧪 Testing: ${test.name}`);
      console.log(`📡 URL: ${url}`);
      
      const response = await makeRequest(url);
      
      if (response.status === test.expectedStatus) {
        console.log(`✅ PASS - Status: ${response.status}`);
        passed++;
      } else {
        console.log(`❌ FAIL - Expected: ${test.expectedStatus}, Got: ${response.status}`);
        failed++;
      }
      
      // Show response preview for health check
      if (test.path === '/health' && response.data) {
        try {
          const healthData = JSON.parse(response.data);
          console.log(`📊 Health Status: ${healthData.status}`);
          console.log(`⏰ Uptime: ${healthData.uptime}s`);
        } catch (e) {
          console.log(`📄 Response: ${response.data.substring(0, 100)}...`);
        }
      }
      
    } catch (error) {
      console.log(`❌ ERROR - ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📈 Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);

  if (failed === 0) {
    console.log(`\n🎉 All tests passed! Deployment verified successfully.`);
    process.exit(0);
  } else {
    console.log(`\n⚠️  Some tests failed. Please check your deployment.`);
    process.exit(1);
  }
}

// Additional checks
async function checkEnvironment() {
  try {
    const url = `${BASE_URL}/health`;
    const response = await makeRequest(url);
    const data = JSON.parse(response.data);
    
    console.log(`\n🌍 Environment Information:`);
    console.log(`📝 Environment: ${data.environment || 'unknown'}`);
    console.log(`⏰ Server Time: ${data.timestamp || 'unknown'}`);
    console.log(`🚀 Uptime: ${data.uptime || 'unknown'}s`);
    
  } catch (error) {
    console.log(`⚠️  Could not fetch environment info: ${error.message}`);
  }
}

// Run verification
console.log(`🔄 Starting deployment verification...\n`);

runTests()
  .then(() => checkEnvironment())
  .catch(error => {
    console.error(`💥 Verification failed: ${error.message}`);
    process.exit(1);
  });
