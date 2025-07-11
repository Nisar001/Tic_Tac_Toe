#!/usr/bin/env node

/**
 * Comprehensive API Test Runner for Tic Tac Toe Backend
 * 
 * This script runs a full test suite against the updated and error-free backend API.
 * It tests all major endpoints and workflows to ensure everything is working correctly.
 * 
 * Usage:
 *   node test-api-complete.js [baseUrl]
 * 
 * Example:
 *   node test-api-complete.js http://localhost:3000
 */

const axios = require('axios');
const chalk = require('chalk');

// Configuration
const BASE_URL = process.argv[2] || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Test data
const TEST_USER = {
  email: `test${Date.now()}@example.com`,
  password: 'TestPassword123!',
  username: `testuser${Date.now()}`,
  confirmPassword: 'TestPassword123!'
};

// Global state
let accessToken = '';
let refreshToken = '';
let userId = '';
let gameId = '';
let roomId = '';

// Utility functions
const log = {
  info: (msg) => console.log(chalk.blue(`ℹ ${msg}`)),
  success: (msg) => console.log(chalk.green(`✅ ${msg}`)),
  error: (msg) => console.log(chalk.red(`❌ ${msg}`)),
  warning: (msg) => console.log(chalk.yellow(`⚠ ${msg}`)),
  test: (msg) => console.log(chalk.cyan(`🧪 ${msg}`))
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// HTTP client with automatic token handling
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && refreshToken) {
      log.warning('Access token expired, attempting refresh...');
      // Note: In a real implementation, you'd handle token refresh here
    }
    return Promise.reject(error);
  }
);

// Test functions
async function testApiInfo() {
  log.test('Testing API Info endpoint...');
  try {
    const response = await api.get('/');
    if (response.status === 200 && response.data.message) {
      log.success('API Info endpoint working');
      return true;
    }
  } catch (error) {
    log.error(`API Info test failed: ${error.message}`);
  }
  return false;
}

async function testUserRegistration() {
  log.test('Testing user registration...');
  try {
    const response = await api.post('/auth/register', TEST_USER);
    if (response.status === 201 && response.data.success) {
      log.success('User registration successful');
      if (response.data.data?.user) {
        userId = response.data.data.user._id || response.data.data.user.id;
        log.info(`User ID: ${userId}`);
      }
      return true;
    }
  } catch (error) {
    log.error(`Registration test failed: ${error.response?.data?.message || error.message}`);
  }
  return false;
}

async function testUserLogin() {
  log.test('Testing user login...');
  try {
    const response = await api.post('/auth/login', {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    if (response.status === 200 && response.data.success) {
      const tokens = response.data.data?.tokens;
      if (tokens) {
        accessToken = tokens.accessToken;
        refreshToken = tokens.refreshToken;
        log.success('User login successful');
        log.info('Tokens received and stored');
        return true;
      }
    }
  } catch (error) {
    log.error(`Login test failed: ${error.response?.data?.message || error.message}`);
  }
  return false;
}

async function testGetProfile() {
  log.test('Testing get profile...');
  try {
    const response = await api.get('/auth/profile');
    if (response.status === 200 && response.data.success) {
      log.success('Get profile successful');
      const user = response.data.data?.user;
      if (user) {
        log.info(`Profile: ${user.username} (${user.email})`);
      }
      return true;
    }
  } catch (error) {
    log.error(`Get profile test failed: ${error.response?.data?.message || error.message}`);
  }
  return false;
}

async function testCreateGame() {
  log.test('Testing game creation...');
  try {
    const response = await api.post('/game/create', {
      gameMode: 'classic',
      isPrivate: false,
      maxPlayers: 2,
      timeLimit: 300000,
      gameName: 'Test Game'
    });
    
    if (response.status === 201 && response.data.success) {
      log.success('Game creation successful');
      const data = response.data.data;
      if (data?.roomId) {
        roomId = data.roomId;
        log.info(`Room ID: ${roomId}`);
      }
      if (data?.gameId) {
        gameId = data.gameId;
        log.info(`Game ID: ${gameId}`);
      }
      return true;
    }
  } catch (error) {
    log.error(`Game creation test failed: ${error.response?.data?.message || error.message}`);
  }
  return false;
}

async function testGetActiveGames() {
  log.test('Testing get active games...');
  try {
    const response = await api.get('/game/active?page=1&limit=10');
    if (response.status === 200 && response.data.success) {
      log.success('Get active games successful');
      const games = response.data.data?.games || [];
      log.info(`Found ${games.length} active games`);
      return true;
    }
  } catch (error) {
    log.error(`Get active games test failed: ${error.response?.data?.message || error.message}`);
  }
  return false;
}

async function testGetGameState() {
  if (!roomId) {
    log.warning('Skipping game state test - no room ID available');
    return false;
  }
  
  log.test('Testing get game state...');
  try {
    const response = await api.get(`/game/state/${roomId}`);
    if (response.status === 200 && response.data.success) {
      log.success('Get game state successful');
      const game = response.data.data?.game;
      if (game) {
        log.info(`Game status: ${game.status}`);
      }
      return true;
    }
  } catch (error) {
    log.error(`Get game state test failed: ${error.response?.data?.message || error.message}`);
  }
  return false;
}

async function testGetUserStats() {
  log.test('Testing get user stats...');
  try {
    const response = await api.get('/game/stats');
    if (response.status === 200 && response.data.success) {
      log.success('Get user stats successful');
      const stats = response.data.data?.stats;
      if (stats) {
        log.info(`Stats: ${stats.wins}W/${stats.losses}L/${stats.draws}D`);
      }
      return true;
    }
  } catch (error) {
    log.error(`Get user stats test failed: ${error.response?.data?.message || error.message}`);
  }
  return false;
}

async function testGetLeaderboard() {
  log.test('Testing get leaderboard...');
  try {
    const response = await api.get('/game/leaderboard?page=1&limit=10');
    if (response.status === 200 && response.data.success) {
      log.success('Get leaderboard successful');
      const leaderboard = response.data.data?.leaderboard || [];
      log.info(`Leaderboard has ${leaderboard.length} players`);
      return true;
    }
  } catch (error) {
    log.error(`Get leaderboard test failed: ${error.response?.data?.message || error.message}`);
  }
  return false;
}

async function testMatchmakingFlow() {
  log.test('Testing matchmaking flow...');
  try {
    // Join queue
    const joinResponse = await api.post('/game/matchmaking/join', {
      gameMode: 'classic',
      skillLevel: 5
    });
    
    if (joinResponse.status === 200) {
      log.success('Joined matchmaking queue');
      
      // Check status
      const statusResponse = await api.get('/game/matchmaking/status');
      if (statusResponse.status === 200) {
        log.success('Got matchmaking status');
      }
      
      // Leave queue
      const leaveResponse = await api.post('/game/matchmaking/leave');
      if (leaveResponse.status === 200) {
        log.success('Left matchmaking queue');
        return true;
      }
    }
  } catch (error) {
    log.error(`Matchmaking test failed: ${error.response?.data?.message || error.message}`);
  }
  return false;
}

async function testChatFlow() {
  if (!roomId) {
    log.warning('Skipping chat tests - no room ID available');
    return false;
  }
  
  log.test('Testing chat flow...');
  try {
    // Get chat rooms
    const roomsResponse = await api.get('/chat/rooms');
    if (roomsResponse.status === 200) {
      log.success('Got chat rooms');
    }
    
    // Join chat room
    const joinResponse = await api.post(`/chat/rooms/${roomId}/join`);
    if (joinResponse.status === 200) {
      log.success('Joined chat room');
    }
    
    // Send message
    const messageResponse = await api.post(`/chat/rooms/${roomId}/messages`, {
      message: 'Hello from API test!',
      messageType: 'text'
    });
    if (messageResponse.status === 201) {
      log.success('Sent chat message');
    }
    
    // Get chat history
    const historyResponse = await api.get(`/chat/rooms/${roomId}/messages?page=1&limit=10`);
    if (historyResponse.status === 200) {
      log.success('Got chat history');
      return true;
    }
  } catch (error) {
    log.error(`Chat test failed: ${error.response?.data?.message || error.message}`);
  }
  return false;
}

async function testTokenRefresh() {
  if (!refreshToken) {
    log.warning('Skipping token refresh test - no refresh token available');
    return false;
  }
  
  log.test('Testing token refresh...');
  try {
    const response = await api.post('/auth/refresh-token', {
      refreshToken: refreshToken
    });
    
    if (response.status === 200 && response.data.success) {
      log.success('Token refresh successful');
      const newAccessToken = response.data.data?.accessToken;
      if (newAccessToken) {
        accessToken = newAccessToken;
        log.info('New access token received');
      }
      return true;
    }
  } catch (error) {
    log.error(`Token refresh test failed: ${error.response?.data?.message || error.message}`);
  }
  return false;
}

async function testLogout() {
  log.test('Testing logout...');
  try {
    const response = await api.post('/auth/logout');
    if (response.status === 200 && response.data.success) {
      log.success('Logout successful');
      accessToken = '';
      refreshToken = '';
      return true;
    }
  } catch (error) {
    log.error(`Logout test failed: ${error.response?.data?.message || error.message}`);
  }
  return false;
}

// Main test runner
async function runAllTests() {
  console.log(chalk.bold.blue('🚀 Starting Comprehensive API Tests'));
  console.log(chalk.blue(`📍 Base URL: ${BASE_URL}`));
  console.log(chalk.blue(`📡 API URL: ${API_URL}`));
  console.log('');
  
  const results = [];
  const startTime = Date.now();
  
  // Test sequence
  const tests = [
    { name: 'API Info', fn: testApiInfo },
    { name: 'User Registration', fn: testUserRegistration },
    { name: 'User Login', fn: testUserLogin },
    { name: 'Get Profile', fn: testGetProfile },
    { name: 'Create Game', fn: testCreateGame },
    { name: 'Get Active Games', fn: testGetActiveGames },
    { name: 'Get Game State', fn: testGetGameState },
    { name: 'Get User Stats', fn: testGetUserStats },
    { name: 'Get Leaderboard', fn: testGetLeaderboard },
    { name: 'Matchmaking Flow', fn: testMatchmakingFlow },
    { name: 'Chat Flow', fn: testChatFlow },
    { name: 'Token Refresh', fn: testTokenRefresh },
    { name: 'Logout', fn: testLogout }
  ];
  
  for (const test of tests) {
    console.log('');
    const result = await test.fn();
    results.push({ name: test.name, passed: result });
    
    // Small delay between tests
    await sleep(500);
  }
  
  // Summary
  console.log('');
  console.log(chalk.bold.blue('📊 Test Results Summary'));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.passed ? chalk.green('PASS') : chalk.red('FAIL');
    console.log(`${status} ${result.name}`);
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  if (passed === total) {
    console.log(chalk.bold.green(`🎉 All tests passed! (${passed}/${total}) in ${duration}s`));
  } else {
    console.log(chalk.bold.yellow(`⚠ ${passed}/${total} tests passed in ${duration}s`));
  }
  
  console.log('');
  console.log(chalk.blue('💡 Tips:'));
  console.log('- Ensure the backend server is running on the specified URL');
  console.log('- Check environment variables and database connection');
  console.log('- Review failed test error messages for debugging');
  console.log('- Some tests depend on previous tests succeeding');
  
  process.exit(passed === total ? 0 : 1);
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  log.error(`Unhandled rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    log.error(`Test runner failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  TEST_USER,
  API_URL
};
