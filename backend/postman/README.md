# Tic Tac Toe API - Postman Collection

This repository contains a comprehensive Postman collection for testing the Tic Tac Toe game API. The collection includes all API endpoints with pre-configured test scripts, environment variables, and automated workflows.

## 📁 Files Overview

- `Tic_Tac_Toe_API_Complete.postman_collection.json` - Complete API collection with all endpoints
- `Tic_Tac_Toe_API.postman_collection.json` - Original API collection (legacy)
- `Tic_Tac_Toe_API_Updated.postman_collection.json` - Updated API collection
- `Test_Data_Setup.postman_collection.json` - Test data setup collection
- `Tic_Tac_Toe_Development.postman_environment.json` - Development environment variables
- `Tic_Tac_Toe_Staging.postman_environment.json` - Staging environment variables
- `Tic_Tac_Toe_Production.postman_environment.json` - Production environment variables
- `newman-config.json` - Newman configuration for automated testing
- `run-tests.ps1` - PowerShell script for running tests
- `run-tests.bat` - Batch script for running tests

## 🚀 Quick Start

### 1. Import Collection and Environment

1. Open Postman
2. Click "Import" in the top left
3. Drag and drop or select the following files:
   - `Tic_Tac_Toe_API_Complete.postman_collection.json` (recommended - most comprehensive)
   - `Tic_Tac_Toe_Development.postman_environment.json` (or your preferred environment)

### 2. Select Environment

1. In the top right corner of Postman, select the environment you imported
2. For local development, use "Tic Tac Toe - Development"

### 3. Start Testing

1. Ensure your backend server is running on `http://localhost:5000` (for development)
2. Start with the "Health Check" folder to verify connectivity
3. Use the "Authentication" folder to register/login and get auth tokens
4. Explore other endpoints as needed

## 📋 Collection Structure

### 🏥 Health Check
- **Health Check** - Verify server status and database connectivity
- **Metrics** - Get server performance metrics

### 📖 API Info
- **API Documentation** - Get API documentation and available endpoints

### 🔐 Authentication
- **Register User** - Create new user account
- **Login User** - Authenticate and get tokens
- **Get Profile** - Retrieve user profile information
- **Update Profile** - Modify user profile data
- **Refresh Token** - Refresh authentication token
- **Logout** - Invalidate user session

### 🌐 Social Authentication
- **Google Login** - Authenticate via Google OAuth
- **Facebook Login** - Authenticate via Facebook OAuth

### 🎮 Game Management
- **Create Custom Game** - Start a new custom game
- **Get Active Games** - Retrieve user's active games
- **Get Game State** - Get current state of a specific game
- **Get User Game Stats** - Retrieve user's game statistics
- **Get Leaderboard** - Get game leaderboard
- **Make Move** - Make a move in a game
- **Forfeit Game** - Forfeit an active game

### 👥 Friend Management
- **Send Friend Request** - Send friend request to another user
- **Get Friend Requests** - Retrieve pending friend requests
- **Accept Friend Request** - Accept a friend request
- **Reject Friend Request** - Reject a friend request
- **Get Friends List** - Get list of user's friends
- **Remove Friend** - Remove a friend from friends list

### 💬 Chat System
- **Send Message** - Send a chat message
- **Get Chat History** - Retrieve chat history for a room
- **Get Chat Rooms** - Get list of user's chat rooms

## 🔧 Environment Variables

Each environment file contains the following variables:

### Base Configuration
- `baseUrl` - API base URL (changes per environment)
- `testEmail` - Primary test user email
- `testPassword` - Primary test user password
- `testUsername` - Primary test user username
- `adminApiKey` - Admin API key for privileged operations

### Session Variables (Auto-populated)
- `authToken` - JWT authentication token (set automatically after login)
- `refreshToken` - Token refresh token (set automatically after login)
- `userId` - Current user ID (set automatically after login)
- `gameId` - Current game ID (set automatically when creating/joining games)
- `friendId` - Friend user ID (for friend-related operations)
- `chatRoomId` - Chat room ID (for chat operations)

### Secondary Test User
- `testEmail2` - Secondary test user email
- `testPassword2` - Secondary test user password
- `testUsername2` - Secondary test user username

## 🧪 Automated Testing

The collection includes comprehensive test scripts that:

### Global Tests (Run for every request)
- Verify response time is under 5 seconds
- Check proper Content-Type header
- Validate JSON response structure

### Endpoint-Specific Tests
- **Authentication**: Token validation, user data verification
- **Game Management**: Game state validation, move validation
- **Friend System**: Request status verification, relationship validation
- **Chat**: Message delivery confirmation, history retrieval

### Pre-request Scripts
- Automatic token refresh when expired
- Environment variable initialization
- Request data validation

## 🔄 Automated Workflows

### Complete User Journey
1. Run "Register User" to create account
2. Run "Login User" to authenticate (tokens auto-saved)
3. Run "Get Profile" to verify login
4. Create games, send friend requests, chat, etc.

### Token Management
- Tokens are automatically captured from login responses
- Refresh token is used automatically when main token expires
- Logout clears all stored tokens

## 🌍 Environment-Specific Usage

### Development
- Use `Tic_Tac_Toe_Development.postman_environment.json`
- Points to `http://localhost:5000`
- Contains safe test credentials

### Staging
- Use `Tic_Tac_Toe_Staging.postman_environment.json`
- Points to staging server URL
- Contains staging-specific credentials

### Production
- Use `Tic_Tac_Toe_Production.postman_environment.json`
- Points to production server URL
- Contains production credentials (keep secure!)

## 🔒 Security Notes

### For Production Environment
1. **Never commit production credentials to version control**
2. Use Postman's "secret" variable type for sensitive data
3. Regularly rotate API keys and passwords
4. Use environment-specific credentials

### Best Practices
- Always use the appropriate environment
- Don't share production environment files
- Regularly update test credentials
- Monitor API usage and rate limits

## 🚨 Troubleshooting

### Common Issues

#### "Could not get response" error
- Verify the backend server is running
- Check the `baseUrl` in your selected environment
- Ensure no firewall/proxy blocking the requests

#### Authentication errors
- Verify credentials in environment variables
- Check if tokens have expired (they auto-refresh)
- Try running "Login User" again

#### Test failures
- Check server logs for detailed error messages
- Verify request body format matches API expectations
- Ensure required environment variables are set

### Debug Tips
1. Check the Postman console (View → Show Postman Console)
2. Review the "Tests" tab results for detailed assertions
3. Verify environment variable values in the top-right dropdown
4. Use "Preview" tab to see formatted response data

## 📊 Running Collection via Newman (CLI)

You can also run this collection via Newman (Postman's CLI tool):

```bash
# Install Newman
npm install -g newman

# Run the entire collection
newman run Tic_Tac_Toe_API.postman_collection.json -e Tic_Tac_Toe_Development.postman_environment.json

# Run specific folder
newman run Tic_Tac_Toe_API.postman_collection.json -e Tic_Tac_Toe_Development.postman_environment.json --folder "Authentication"

# Generate HTML report
newman run Tic_Tac_Toe_API.postman_collection.json -e Tic_Tac_Toe_Development.postman_environment.json --reporters html --reporter-html-export report.html
```

## 🤝 Contributing

When adding new endpoints to the API:

1. Add the corresponding request to the appropriate folder
2. Include comprehensive test scripts
3. Update environment variables if needed
4. Add documentation to this README
5. Test in all environments before committing

## 📝 Notes

- The collection is designed to be self-contained and includes sample data
- All requests include proper error handling and validation
- The collection follows RESTful API testing best practices
- Test scripts provide detailed feedback on API behavior

## 🆘 Support

If you encounter issues with the Postman collection:

1. Check this README for troubleshooting tips
2. Verify your environment setup
3. Review the API documentation
4. Check the backend server logs for detailed error messages

Happy testing! 🎯
