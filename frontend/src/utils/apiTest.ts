// Quick API Connection Test
// Run this in browser console or as a standalone script

const API_BASE_URL = 'https://tic-tac-toe-uf5h.onrender.com/api';

async function testAPIConnection() {
  console.log('🔍 Testing API Connection...');
  console.log('Backend URL:', API_BASE_URL);
  
  try {
    // Test basic health check
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Connection Successful!');
      console.log('Health Check Response:', data);
    } else {
      console.log('❌ API Connection Failed');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ API Connection Error:', error.message);
    } else {
      console.error('❌ API Connection Error:', error);
    }
  }
}

async function testSocialAuthEndpoints() {
  console.log('🔍 Testing Social Auth Endpoints...');
  
  const endpoints = [
    '/auth/social/google',
    '/auth/social/facebook',
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        redirect: 'manual', // Don't follow redirects
      });
      
      if (response.status === 0 || response.status === 302) {
        console.log(`✅ ${endpoint} - Ready (redirects to provider)`);
      } else {
        console.log(`⚠️ ${endpoint} - Status: ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.log(`❌ ${endpoint} - Error:`, error.message);
      } else {
        console.log(`❌ ${endpoint} - Error:`, error);
      }
    }
  }
}

// Run tests
testAPIConnection();
testSocialAuthEndpoints();

export { testAPIConnection, testSocialAuthEndpoints };
