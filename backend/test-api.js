#!/usr/bin/env node

/**
 * Backend API Test Script
 * Tests basic server functionality and API endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test configuration
const testConfig = {
  timeout: 10000,
  maxRetries: 3
};

// Test data
const testUser = {
  username: 'testuser123',
  email: 'test@example.com',
  password: 'testpassword123',
  confirmPassword: 'testpassword123'
};

let authToken = '';

// Helper function to make API calls with retry logic
async function apiCall(method, endpoint, data = null, headers = {}) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    timeout: testConfig.timeout,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

// Test functions
async function testHealthCheck() {
  console.log('🏥 Testing health check...');
  const result = await apiCall('GET', '/health');
  
  if (result.success) {
    console.log('✅ Health check passed');
    console.log(`   Status: ${result.data.status}`);
    console.log(`   Database: ${result.data.database}`);
    return true;
  } else {
    console.log('❌ Health check failed:', result.error);
    return false;
  }
}

async function testAPIInfo() {
  console.log('📋 Testing API info endpoint...');
  const result = await apiCall('GET', '/api/');
  
  if (result.success) {
    console.log('✅ API info endpoint working');
    console.log(`   Version: ${result.data.version}`);
    return true;
  } else {
    console.log('❌ API info failed:', result.error);
    return false;
  }
}

async function testUserRegistration() {
  console.log('👤 Testing user registration...');
  const result = await apiCall('POST', '/api/auth/register', testUser);
  
  if (result.success) {
    console.log('✅ User registration successful');
    return true;
  } else {
    console.log('❌ User registration failed:', result.error);
    // Registration might fail if user already exists, which is okay for testing
    return result.status === 409; // Conflict - user already exists
  }
}

async function testUserLogin() {
  console.log('🔐 Testing user login...');
  const loginData = {
    email: testUser.email,
    password: testUser.password
  };
  
  const result = await apiCall('POST', '/api/auth/login', loginData);
  
  if (result.success && result.data.accessToken) {
    console.log('✅ User login successful');
    authToken = result.data.accessToken;
    return true;
  } else {
    console.log('❌ User login failed:', result.error);
    return false;
  }
}

async function testProtectedEndpoint() {
  console.log('🔒 Testing protected endpoint...');
  const headers = { Authorization: `Bearer ${authToken}` };
  const result = await apiCall('GET', '/api/auth/profile', null, headers);
  
  if (result.success) {
    console.log('✅ Protected endpoint working');
    console.log(`   User: ${result.data.user?.username || 'Unknown'}`);
    return true;
  } else {
    console.log('❌ Protected endpoint failed:', result.error);
    return false;
  }
}

async function testGameEndpoints() {
  console.log('🎮 Testing game endpoints...');
  const headers = { Authorization: `Bearer ${authToken}` };
  
  // Test get active games
  const result = await apiCall('GET', '/api/game/active', null, headers);
  
  if (result.success) {
    console.log('✅ Game endpoints working');
    return true;
  } else {
    console.log('❌ Game endpoints failed:', result.error);
    return false;
  }
}

async function testChatEndpoints() {
  console.log('💬 Testing chat endpoints...');
  const headers = { Authorization: `Bearer ${authToken}` };
  
  // Test get chat rooms
  const result = await apiCall('GET', '/api/chat/rooms', null, headers);
  
  if (result.success) {
    console.log('✅ Chat endpoints working');
    return true;
  } else {
    console.log('❌ Chat endpoints failed:', result.error);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Backend API Tests...\n');
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'API Info', fn: testAPIInfo },
    { name: 'User Registration', fn: testUserRegistration },
    { name: 'User Login', fn: testUserLogin },
    { name: 'Protected Endpoint', fn: testProtectedEndpoint },
    { name: 'Game Endpoints', fn: testGameEndpoints },
    { name: 'Chat Endpoints', fn: testChatEndpoints }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} threw an error:`, error.message);
      failed++;
    }
    console.log(''); // Empty line for readability
  }
  
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Backend is working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check the server logs for more details.');
    process.exit(1);
  }
}

// Check if server is running
async function waitForServer() {
  console.log('⏳ Checking if server is running...');
  
  for (let i = 0; i < testConfig.maxRetries; i++) {
    try {
      const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
      console.log('✅ Server is running!\n');
      return true;
    } catch (error) {
      console.log(`   Attempt ${i + 1}/${testConfig.maxRetries} failed`);
      if (i < testConfig.maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  console.log('❌ Server is not responding. Please start the server first.');
  console.log('   Run: npm run dev');
  process.exit(1);
}

// Start tests
(async () => {
  try {
    await waitForServer();
    await runTests();
  } catch (error) {
    console.error('💥 Test runner failed:', error.message);
    process.exit(1);
  }
})();
