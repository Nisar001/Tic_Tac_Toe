const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function debugChangePassword() {
  try {
    // Login first
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.tokens.accessToken;
    console.log('✅ Login successful');
    
    // Try change password
    const changeResponse = await axios.post(`${BASE_URL}/auth/change-password`, {
      currentPassword: 'password123',
      newPassword: 'newpassword123',
      confirmPassword: 'newpassword123'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Change password success:', changeResponse.data);
    
  } catch (error) {
    console.error('❌ Error details:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
  }
}

debugChangePassword();
