const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function debugProfile() {
  try {
    console.log('🔐 Logging in first...');
    
    // Login first
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'testuser@example.com',
      password: 'password123'
    });
    
    console.log('Login success:', loginResponse.data.success);
    const token = loginResponse.data.data.accessToken;
    
    console.log('🔧 Attempting profile update...');
    
    // Try profile update
    const updateResponse = await axios.patch(`${BASE_URL}/auth/profile`, {
      bio: 'Updated bio from debug test'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Profile update success:', updateResponse.data);
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Server is not running! Please start the server with: npm run dev');
    } else {
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        code: error.code
      });
    }
  }
}

console.log('Please make sure the server is running on port 3001 first!');
debugProfile();
