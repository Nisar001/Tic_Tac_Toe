# Tic Tac Toe API - Postman Collection Documentation

## Overview

This comprehensive Postman collection provides complete testing coverage for the Tic Tac Toe API, including authentication, game management, chat functionality, and administrative endpoints.

## Files Included

1. **postman_collection_comprehensive.json** - Main Postman collection file
2. **postman_environment.json** - Environment variables configuration
3. **postman_test_data.json** - Test data and scenarios
4. **POSTMAN_COLLECTION_DOCS.md** - This documentation file

## Quick Start

### 1. Import Collection and Environment

1. Open Postman
2. Click "Import" button
3. Import `postman_collection_comprehensive.json`
4. Import `postman_environment.json`
5. Select the "Tic Tac Toe API Environment" from the environment dropdown

### 2. Configure Environment Variables

Update the following variables in your environment:

- **baseUrl**: Set to your API server URL (default: `http://localhost:3000`)
- **adminApiKey**: Set your admin API key for administrative endpoints
- **googleAccessToken**: Set for Google OAuth testing
- **facebookAccessToken**: Set for Facebook OAuth testing

### 3. Run Basic Authentication Flow

1. Run "Register User" to create a test account
2. Run "Login User" to authenticate (tokens will be automatically stored)
3. Run "Get Profile" to verify authentication

## Collection Structure

### 📁 Authentication
- **Register User** - Create new user account
- **Login User** - Authenticate and get tokens
- **Get Profile** - Retrieve user profile information
- **Update Profile** - Modify user profile data
- **Change Password** - Update user password
- **Refresh Token** - Refresh authentication token
- **Logout** - End current session

### 📁 Social Authentication
- **Google OAuth Login** - Authenticate with Google
- **Facebook OAuth Login** - Authenticate with Facebook

### 📁 Game Management
- **Create Custom Game** - Create new game room
- **Get Game State** - Retrieve current game state
- **Make Move** - Make a move in the game
- **Get Active Games** - List all active games
- **Get User Game Stats** - Get player statistics
- **Get Leaderboard** - Retrieve game leaderboard
- **Forfeit Game** - Surrender current game

### 📁 Matchmaking
- **Join Matchmaking Queue** - Enter matchmaking
- **Get Matchmaking Status** - Check queue status
- **Leave Matchmaking Queue** - Exit matchmaking
- **Get Queue Stats** - View matchmaking statistics

### 📁 Chat
- **Get Chat Rooms** - List available chat rooms
- **Join Chat Room** - Enter a chat room
- **Send Message** - Send chat message
- **Get Chat History** - Retrieve message history
- **Get Chat Room Users** - List room participants
- **Leave Chat Room** - Exit chat room

### 📁 Admin Endpoints
- **Force Match** - Force match between players (Admin)
- **Cleanup Queue** - Clean matchmaking queue (Admin)

### 📁 Password Reset Flow
- **Request Password Reset** - Request reset email
- **Reset Password** - Reset with token
- **Verify Email** - Verify email address
- **Resend Verification** - Resend verification email

## Automated Features

### Pre-request Scripts
- Automatic timestamp generation
- Authentication token validation
- Request logging and debugging

### Test Scripts
- Response validation (status codes, response time, JSON structure)
- Automatic token storage and management
- Data extraction and environment variable updates
- Comprehensive assertion testing

### Environment Variable Management
- **authToken** - Automatically stored on login
- **refreshToken** - Automatically stored on login
- **userId** - Extracted from user data
- **testGameId** - Stored when creating games
- **testRoomId** - Stored for game interactions
- **testChatRoomId** - Used for chat testing

## Test Data Usage

The `postman_test_data.json` file contains:

### User Test Data
```json
{
  "validUser": {
    "username": "testuser_001",
    "email": "testuser001@example.com",
    "password": "SecurePass123!"
  }
}
```

### Game Configuration
```json
{
  "classicGame": {
    "gameConfig": {
      "gameMode": "classic",
      "isPrivate": false,
      "maxPlayers": 2,
      "timeLimit": 300
    }
  }
}
```

### Chat Messages
```json
{
  "validMessages": [
    {
      "message": "Hello everyone!",
      "messageType": "text"
    }
  ]
}
```

## Testing Scenarios

### Complete Game Flow
1. Register two users
2. Login both users
3. User 1 creates a game
4. User 2 joins the game
5. Play complete game with moves
6. Verify game completion
7. Check game stats

### Authentication Flow
1. Register user
2. Verify email (if required)
3. Login user
4. Get profile
5. Update profile
6. Change password
7. Refresh token
8. Logout

### Error Handling
1. Test invalid registration data
2. Test invalid login credentials
3. Test unauthorized access
4. Test invalid game moves
5. Test rate limiting

## API Endpoints Reference

### Base URL Structure
```
{{baseUrl}}/api/auth/*     - Authentication endpoints
{{baseUrl}}/api/game/*     - Game management endpoints
{{baseUrl}}/api/chat/*     - Chat functionality endpoints
```

### Authentication Required
Most endpoints require the `Authorization: Bearer {{authToken}}` header, which is automatically handled by the collection.

### Rate Limiting
The API implements rate limiting:
- Registration: 5 attempts per hour
- Login: 10 attempts per minute
- Game Creation: 5 games per hour
- Chat: 30 messages per minute

## Environment Configuration

### Development Environment
```json
{
  "baseUrl": "http://localhost:3000",
  "socketUrl": "ws://localhost:3000"
}
```

### Production Environment
```json
{
  "baseUrl": "https://api.tictactoe.com",
  "socketUrl": "wss://api.tictactoe.com"
}
```

## Advanced Usage

### Running Collections with Newman
```bash
newman run postman_collection_comprehensive.json \
  -e postman_environment.json \
  --reporters cli,html \
  --reporter-html-export report.html
```

### Continuous Integration
The collection can be integrated into CI/CD pipelines using Newman for automated API testing.

### Custom Test Scripts
You can extend the existing test scripts or add new ones:

```javascript
pm.test("Custom validation", function () {
    const responseJson = pm.response.json();
    pm.expect(responseJson.data).to.have.property('customField');
});
```

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Ensure you've run the login request first
   - Check that the authToken variable is populated
   - Verify the token hasn't expired

2. **Game Creation Failures**
   - Check that you have sufficient energy
   - Verify authentication token is valid
   - Ensure game configuration is valid

3. **Chat Issues**
   - Verify you've joined a chat room first
   - Check room ID is valid
   - Ensure message format is correct

### Debug Tips

1. Enable Postman Console for detailed request/response logs
2. Check environment variables are properly set
3. Review pre-request and test script outputs
4. Verify API server is running and accessible

## Security Considerations

1. **API Keys**: Store admin API keys securely
2. **Tokens**: Tokens are automatically managed but ensure environment is private
3. **Test Data**: Use test data only, avoid real user information
4. **Rate Limiting**: Respect API rate limits to avoid blocking

## Contributing

To extend this collection:

1. Add new requests following the existing naming convention
2. Include appropriate test scripts for validation
3. Update environment variables as needed
4. Document any new features in this README

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API server logs
3. Verify environment configuration
4. Test individual requests in isolation

---

**Note**: This collection is designed for testing purposes. Always use appropriate test data and never test against production systems without proper authorization.
