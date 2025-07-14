const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function getRooms() {
  try {
    // Login first
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    
    console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
    const token = loginResponse.data.data.tokens.accessToken;
    
    // Get rooms
    const roomsResponse = await axios.get(`${BASE_URL}/chat/rooms`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Available rooms:', JSON.stringify(roomsResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

getRooms();
