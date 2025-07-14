const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let authToken = '';
let refreshToken = '';
let gameId = null;
let roomId = null;

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

const newUser = {
  username: `testuser${Date.now()}`,
  email: `testuser${Date.now()}@example.com`,
  password: 'TestPass123!',
  confirmPassword: 'TestPass123!'
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: [],
  modules: {
    system: { passed: 0, failed: 0, total: 0 },
    auth: { passed: 0, failed: 0, total: 0 },
    social: { passed: 0, failed: 0, total: 0 },
    game: { passed: 0, failed: 0, total: 0 },
    chat: { passed: 0, failed: 0, total: 0 }
  }
};

function addResult(name, status, message, module = 'other') {
  results.tests.push({ name, status, message, module });
  if (status === 'PASS') {
    results.passed++;
    if (results.modules[module]) results.modules[module].passed++;
  } else {
    results.failed++;
    if (results.modules[module]) results.modules[module].failed++;
  }
  if (results.modules[module]) results.modules[module].total++;
}

async function testAPI(name, method, endpoint, data = null, headers = {}, customUrl = null, module = 'other') {
  try {
    // Add small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const config = {
      method,
      url: customUrl || `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 15000,
      ...(data && (method === 'POST' || method === 'PUT' || method === 'PATCH') ? { data } : {}),
      ...(data && method === 'GET' ? { params: data } : {})
    };
    
    const response = await axios(config);
    const message = response.data?.message || response.data?.status || 'Success';
    addResult(name, 'PASS', `${response.status} - ${message}`, module);
    console.log(`✅ ${name}: ${response.status} - ${message}`);
    return response.data;
  } catch (error) {
    const status = error.response?.status || error.code || 'NO_RESPONSE';
    const message = error.response?.data?.message || error.message || 'Unknown error';
    addResult(name, 'FAIL', `${status} - ${message}`, module);
    console.log(`❌ ${name}: ${status} - ${message}`);
    return null;
  }
}

async function runCompleteAPITest() {
  console.log('🧪 COMPLETE API TEST - ALL 34+ ENDPOINTS');
  console.log('==========================================');
  console.log('Testing every discoverable API endpoint in the system\n');

  // ================================================================
  // SYSTEM ENDPOINTS (3)
  // ================================================================
  console.log('📋 SYSTEM ENDPOINTS (3)');
  console.log('========================');

  await testAPI(
    'SYSTEM-01: API Root Info',
    'GET',
    '/',
    null,
    {},
    null,
    'system'
  );

  await testAPI(
    'SYSTEM-02: Health Check',
    'GET',
    '',
    null,
    {},
    'http://localhost:5000/health',
    'system'
  );

  await testAPI(
    'SYSTEM-03: Metrics',
    'GET',
    '',
    null,
    {},
    'http://localhost:5000/metrics',
    'system'
  );

  // ================================================================
  // AUTHENTICATION MODULE (14)
  // ================================================================
  console.log('\n📋 AUTHENTICATION MODULE (14)');
  console.log('===============================');

  // AUTH-01: Login (Required for other tests)
  const loginResult = await testAPI(
    'AUTH-01: User Login',
    'POST',
    '/auth/login',
    testUser,
    {},
    null,
    'auth'
  );
  
  if (loginResult && loginResult.data && loginResult.data.tokens) {
    authToken = loginResult.data.tokens.accessToken;
    refreshToken = loginResult.data.tokens.refreshToken;
    console.log('🔑 Authentication token obtained for protected routes');
  }

  // AUTH-02: User Registration
  await testAPI(
    'AUTH-02: User Registration',
    'POST',
    '/auth/register',
    newUser,
    {},
    null,
    'auth'
  );

  // AUTH-03: Email Verification
  await testAPI(
    'AUTH-03: Verify Email',
    'POST',
    '/auth/verify-email',
    { token: 'test-verification-token' },
    {},
    null,
    'auth'
  );

  // AUTH-04: Resend Verification
  await testAPI(
    'AUTH-04: Resend Verification',
    'POST',
    '/auth/resend-verification',
    { email: newUser.email },
    {},
    null,
    'auth'
  );

  // AUTH-05: Request Password Reset
  await testAPI(
    'AUTH-05: Request Password Reset',
    'POST',
    '/auth/request-password-reset',
    { email: testUser.email },
    {},
    null,
    'auth'
  );

  // AUTH-06: Reset Password
  await testAPI(
    'AUTH-06: Reset Password',
    'POST',
    '/auth/reset-password',
    { 
      token: 'test-reset-token',
      newPassword: 'NewPassword123!',
      confirmPassword: 'NewPassword123!'
    },
    {},
    null,
    'auth'
  );

  // AUTH-07: Refresh Token
  if (refreshToken) {
    await testAPI(
      'AUTH-07: Refresh Token',
      'POST',
      '/auth/refresh-token',
      { refreshToken },
      {},
      null,
      'auth'
    );
  }

  // AUTH-08: Emergency Password Reset
  await testAPI(
    'AUTH-08: Emergency Password Reset',
    'POST',
    '/auth/emergency-reset',
    { email: testUser.email, newPassword: 'Emergency123!' },
    {},
    null,
    'auth'
  );

  // Protected Authentication Routes
  if (authToken) {
    const authHeaders = { Authorization: `Bearer ${authToken}` };

    // AUTH-09: Get Profile
    await testAPI(
      'AUTH-09: Get Profile',
      'GET',
      '/auth/profile',
      null,
      authHeaders,
      null,
      'auth'
    );

    // AUTH-10: Update Profile
    await testAPI(
      'AUTH-10: Update Profile',
      'PATCH',
      '/auth/profile',
      {
        bio: 'Updated from comprehensive API test',
        phoneNumber: '+1234567890'
      },
      authHeaders,
      null,
      'auth'
    );

    // AUTH-11: Change Password
    await testAPI(
      'AUTH-11: Change Password',
      'POST',
      '/auth/change-password',
      {
        currentPassword: testUser.password,
        newPassword: 'UpdatedPass123!',
        confirmPassword: 'UpdatedPass123!'
      },
      authHeaders,
      null,
      'auth'
    );

    // AUTH-12: Logout All Devices
    await testAPI(
      'AUTH-12: Logout All Devices',
      'POST',
      '/auth/logout-all',
      {},
      authHeaders,
      null,
      'auth'
    );

    // AUTH-13: Logout
    await testAPI(
      'AUTH-13: Logout',
      'POST',
      '/auth/logout',
      { refreshToken },
      authHeaders,
      null,
      'auth'
    );

    // AUTH-14: Delete Account (commented to preserve test account)
    // await testAPI(
    //   'AUTH-14: Delete Account',
    //   'DELETE',
    //   '/auth/account',
    //   {},
    //   authHeaders,
    //   null,
    //   'auth'
    // );
  }

  // ================================================================
  // SOCIAL AUTHENTICATION MODULE (12)
  // ================================================================
  console.log('\n📋 SOCIAL AUTHENTICATION MODULE (12)');
  console.log('======================================');

  // Google OAuth (3 endpoints)
  await testAPI(
    'SOCIAL-01: Google OAuth Initiate',
    'GET',
    '/auth/social/google',
    null,
    {},
    null,
    'social'
  );

  await testAPI(
    'SOCIAL-02: Google OAuth Callback',
    'GET',
    '/auth/social/google/callback',
    { code: 'test_google_code' },
    {},
    null,
    'social'
  );

  await testAPI(
    'SOCIAL-03: Google Token Login',
    'POST',
    '/auth/social/google',
    { accessToken: 'test_google_token' },
    {},
    null,
    'social'
  );

  // Facebook OAuth (3 endpoints)
  await testAPI(
    'SOCIAL-04: Facebook OAuth Initiate',
    'GET',
    '/auth/social/facebook',
    null,
    {},
    null,
    'social'
  );

  await testAPI(
    'SOCIAL-05: Facebook OAuth Callback',
    'GET',
    '/auth/social/facebook/callback',
    { code: 'test_facebook_code' },
    {},
    null,
    'social'
  );

  await testAPI(
    'SOCIAL-06: Facebook Token Login',
    'POST',
    '/auth/social/facebook',
    { accessToken: 'test_facebook_token' },
    {},
    null,
    'social'
  );

  // Twitter OAuth (3 endpoints)
  await testAPI(
    'SOCIAL-07: Twitter OAuth Initiate',
    'GET',
    '/auth/social/twitter',
    null,
    {},
    null,
    'social'
  );

  await testAPI(
    'SOCIAL-08: Twitter OAuth Callback',
    'GET',
    '/auth/social/twitter/callback',
    { oauth_token: 'test_token', oauth_verifier: 'test_verifier' },
    {},
    null,
    'social'
  );

  await testAPI(
    'SOCIAL-09: Twitter Token Login',
    'POST',
    '/auth/social/twitter',
    { accessToken: 'test_twitter_token' },
    {},
    null,
    'social'
  );

  // Instagram OAuth (3 endpoints)
  await testAPI(
    'SOCIAL-10: Instagram OAuth Initiate',
    'GET',
    '/auth/social/instagram',
    null,
    {},
    null,
    'social'
  );

  await testAPI(
    'SOCIAL-11: Instagram OAuth Callback',
    'GET',
    '/auth/social/instagram/callback',
    { code: 'test_instagram_code' },
    {},
    null,
    'social'
  );

  await testAPI(
    'SOCIAL-12: Instagram Token Login',
    'POST',
    '/auth/social/instagram',
    { accessToken: 'test_instagram_token' },
    {},
    null,
    'social'
  );

  // ================================================================
  // GAME MODULE (15)
  // ================================================================
  console.log('\n📋 GAME MODULE (15)');
  console.log('====================');

  if (authToken) {
    const authHeaders = { Authorization: `Bearer ${authToken}` };

    // GAME-01: Create Custom Game
    const gameResult = await testAPI(
      'GAME-01: Create Custom Game',
      'POST',
      '/game/create',
      {
        gameConfig: {
          gameMode: 'classic',
          isPrivate: false,
          maxPlayers: 2,
          timeLimit: 300,
          gameName: 'Complete API Test Game'
        }
      },
      authHeaders,
      null,
      'game'
    );

    if (gameResult && gameResult.data) {
      gameId = gameResult.data.gameId;
      roomId = gameResult.data.roomId || gameResult.data.gameId;
      console.log(`🎮 Game created: ${gameId}`);
    }

    // GAME-02: Get Game State
    if (roomId) {
      await testAPI(
        'GAME-02: Get Game State',
        'GET',
        `/game/state/${roomId}`,
        null,
        authHeaders,
        null,
        'game'
      );
    }

    // GAME-03: Get Active Games
    await testAPI(
      'GAME-03: Get Active Games',
      'GET',
      '/game/active',
      null,
      authHeaders,
      null,
      'game'
    );

    // GAME-04: Get User Game Stats
    await testAPI(
      'GAME-04: Get User Game Stats',
      'GET',
      '/game/stats',
      null,
      authHeaders,
      null,
      'game'
    );

    // GAME-05: Get Leaderboard
    await testAPI(
      'GAME-05: Get Leaderboard',
      'GET',
      '/game/leaderboard',
      { page: 1, limit: 10 },
      authHeaders,
      null,
      'game'
    );

    // GAME-06: Join Matchmaking Queue
    await testAPI(
      'GAME-06: Join Matchmaking Queue',
      'POST',
      '/game/matchmaking/join',
      { gameMode: 'classic' },
      authHeaders,
      null,
      'game'
    );

    // GAME-07: Get Matchmaking Status
    await testAPI(
      'GAME-07: Get Matchmaking Status',
      'GET',
      '/game/matchmaking/status',
      null,
      authHeaders,
      null,
      'game'
    );

    // GAME-08: Get Queue Stats
    await testAPI(
      'GAME-08: Get Queue Stats',
      'GET',
      '/game/matchmaking/stats',
      null,
      authHeaders,
      null,
      'game'
    );

    // GAME-09: Leave Matchmaking Queue
    await testAPI(
      'GAME-09: Leave Matchmaking Queue',
      'POST',
      '/game/matchmaking/leave',
      {},
      authHeaders,
      null,
      'game'
    );

    // GAME-10: Make Move
    if (roomId) {
      await testAPI(
        'GAME-10: Make Move',
        'POST',
        `/game/move/${roomId}`,
        { position: 0, player: 'X' },
        authHeaders,
        null,
        'game'
      );
    }

    // GAME-11: Forfeit Game
    if (roomId) {
      await testAPI(
        'GAME-11: Forfeit Game',
        'POST',
        `/game/forfeit/${roomId}`,
        {},
        authHeaders,
        null,
        'game'
      );
    }

    // GAME-12: Force Match (Admin)
    await testAPI(
      'GAME-12: Force Match (Admin)',
      'POST',
      '/game/admin/force-match',
      { users: ['user1', 'user2'] },
      { 'x-api-key': 'test-admin-key' },
      null,
      'game'
    );

    // GAME-13: Cleanup Queue (Admin)
    await testAPI(
      'GAME-13: Cleanup Queue (Admin)',
      'POST',
      '/game/admin/cleanup-queue',
      {},
      { 'x-api-key': 'test-admin-key' },
      null,
      'game'
    );

    // GAME-14: Get Game History (if exists)
    await testAPI(
      'GAME-14: Get Game History',
      'GET',
      '/game/history',
      { page: 1, limit: 10 },
      authHeaders,
      null,
      'game'
    );

    // GAME-15: Join Game (if exists)
    if (roomId) {
      await testAPI(
        'GAME-15: Join Game',
        'POST',
        `/game/join/${roomId}`,
        {},
        authHeaders,
        null,
        'game'
      );
    }
  }

  // ================================================================
  // CHAT MODULE (10)
  // ================================================================
  console.log('\n📋 CHAT MODULE (10)');
  console.log('====================');

  if (authToken) {
    const authHeaders = { Authorization: `Bearer ${authToken}` };

    // CHAT-01: Get Chat Rooms
    await testAPI(
      'CHAT-01: Get Chat Rooms',
      'GET',
      '/chat/rooms',
      null,
      authHeaders,
      null,
      'chat'
    );

    // CHAT-02: Join Chat Room
    await testAPI(
      'CHAT-02: Join Chat Room',
      'POST',
      '/chat/rooms/global/join',
      {},
      authHeaders,
      null,
      'chat'
    );

    // CHAT-03: Get Chat Room Users
    await testAPI(
      'CHAT-03: Get Chat Room Users',
      'GET',
      '/chat/rooms/global/users',
      null,
      authHeaders,
      null,
      'chat'
    );

    // CHAT-04: Get Chat History
    await testAPI(
      'CHAT-04: Get Chat History',
      'GET',
      '/chat/rooms/global/messages',
      { page: 1, limit: 20 },
      authHeaders,
      null,
      'chat'
    );

    // CHAT-05: Send Message
    await testAPI(
      'CHAT-05: Send Message',
      'POST',
      '/chat/rooms/global/messages',
      { message: 'Hello from complete API test!' },
      authHeaders,
      null,
      'chat'
    );

    // CHAT-06: Leave Chat Room
    await testAPI(
      'CHAT-06: Leave Chat Room',
      'POST',
      '/chat/rooms/global/leave',
      {},
      authHeaders,
      null,
      'chat'
    );

    // CHAT-07: Get Chat History (Legacy)
    await testAPI(
      'CHAT-07: Get Chat History (Legacy)',
      'GET',
      '/chat/history/global',
      { page: 1, limit: 20 },
      authHeaders,
      null,
      'chat'
    );

    // Small delay to avoid rate limiting on message sending
    await new Promise(resolve => setTimeout(resolve, 2000));

    // CHAT-08: Send Message (Legacy)
    await testAPI(
      'CHAT-08: Send Message (Legacy)',
      'POST',
      '/chat/send',
      {
        roomId: 'global',
        message: 'Hello from legacy chat route!'
      },
      authHeaders,
      null,
      'chat'
    );

    // CHAT-09: Create Chat Room (if exists)
    await testAPI(
      'CHAT-09: Create Chat Room',
      'POST',
      '/chat/rooms',
      {
        name: 'test-room',
        description: 'Test room created by API test'
      },
      authHeaders,
      null,
      'chat'
    );

    // CHAT-10: Delete Chat Room (if exists)
    await testAPI(
      'CHAT-10: Delete Chat Room',
      'DELETE',
      '/chat/rooms/test-room',
      {},
      authHeaders,
      null,
      'chat'
    );
  }

  // ================================================================
  // FINAL SUMMARY
  // ================================================================
  console.log('\n📊 COMPLETE API TEST RESULTS');
  console.log('===============================');
  console.log(`🎯 Total APIs Tested: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Overall Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  console.log('\n📋 Results by Module:');
  Object.entries(results.modules).forEach(([module, stats]) => {
    if (stats.total > 0) {
      const successRate = ((stats.passed / stats.total) * 100).toFixed(1);
      console.log(`  ${module.toUpperCase()}: ${stats.passed}/${stats.total} (${successRate}%)`);
    }
  });

  console.log('\n🔍 Detailed Results:');
  results.tests.forEach(test => {
    const status = test.status === 'PASS' ? '✅' : '❌';
    console.log(`  ${status} ${test.name}: ${test.message}`);
  });

  if (results.failed > 0) {
    console.log('\n🚨 Failed Tests Summary:');
    results.tests.filter(t => t.status === 'FAIL').forEach(test => {
      console.log(`   ❌ ${test.name}: ${test.message}`);
    });
  }

  console.log('\n🎉 Complete API Testing Finished!');
  console.log('📊 This test covered ALL discoverable endpoints in the project');
  
  return {
    totalTested: results.passed + results.failed,
    passed: results.passed,
    failed: results.failed,
    successRate: ((results.passed / (results.passed + results.failed)) * 100).toFixed(1),
    moduleResults: results.modules
  };
}

// Run the complete test
runCompleteAPITest().then(summary => {
  console.log(`\n🏁 FINAL SUMMARY: ${summary.passed}/${summary.totalTested} APIs working (${summary.successRate}%)`);
}).catch(error => {
  console.error('❌ Test execution failed:', error.message);
});
