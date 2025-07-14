const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function debugCreateGame() {
  try {
    // Login first
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.tokens.accessToken;
    console.log('✅ Login successful');
    
    // Try create game
    const createResponse = await axios.post(`${BASE_URL}/game/create`, {
      gameConfig: {
        gameMode: 'classic',
        isPrivate: false,
        maxPlayers: 2,
        timeLimit: 300,
        gameName: 'Test Game Room'
      }
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Create game success:', createResponse.data);
    
  } catch (error) {
    console.error('❌ Error details:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
  }
}

debugCreateGame();
