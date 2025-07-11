# 📁 Postman Collection Documentation

## Overview

This directory contains a complete Postman testing suite for the Tic Tac Toe API. The collection provides comprehensive API testing capabilities with automated test scripts, environment management, and CI/CD integration.

## 📋 File Inventory

### Core Collection Files

| File | Purpose | Description |
|------|---------|-------------|
| `Tic_Tac_Toe_API_Complete.postman_collection.json` | Complete API Collection | Most comprehensive collection with all endpoints, social auth, and modern features |
| `Tic_Tac_Toe_API.postman_collection.json` | Legacy API Collection | Original collection for backward compatibility |
| `Tic_Tac_Toe_API_Updated.postman_collection.json` | Updated API Collection | Intermediate updated version |
| `Test_Data_Setup.postman_collection.json` | Test Data Generator | Helper collection to set up test users, games, and relationships |

### Environment Files

| File | Environment | Base URL | Purpose |
|------|-------------|----------|---------|
| `Tic_Tac_Toe_Development.postman_environment.json` | Development | `http://localhost:5000` | Local development testing |
| `Tic_Tac_Toe_Staging.postman_environment.json` | Staging | `https://staging-api.tictactoe.com` | Staging environment testing |
| `Tic_Tac_Toe_Production.postman_environment.json` | Production | `https://api.tictactoe.com` | Production environment testing |

### Automation & CI/CD Files

| File | Purpose | Platform |
|------|---------|----------|
| `run-tests.bat` | Test Runner Script | Windows Batch |
| `run-tests.ps1` | Test Runner Script | PowerShell |
| `newman-config.json` | Newman Configuration | CLI Testing |
| `github-actions-workflow.yml` | CI/CD Workflow | GitHub Actions |

### Documentation

| File | Purpose |
|------|---------|
| `README.md` | Comprehensive Usage Guide |
| `COLLECTION_OVERVIEW.md` | This overview document |

## 🎯 Quick Start Guide

### 1. Import Collections
```bash
# Import the complete collection (recommended)
Import: Tic_Tac_Toe_API_Complete.postman_collection.json

# Or import legacy collection for compatibility
Import: Tic_Tac_Toe_API.postman_collection.json

# Import test data setup (optional)
Import: Test_Data_Setup.postman_collection.json

# Import development environment
Import: Tic_Tac_Toe_Development.postman_environment.json
```

### 2. Select Environment
- Choose "Tic Tac Toe - Development" from the environment dropdown
- Verify `baseUrl` is set to `http://localhost:5000`

### 3. Start Testing
- Run "Health Check" folder first
- Use "Authentication" to register/login
- Explore other endpoints as needed

## 🔧 Automation Features

### Pre-request Scripts
- **Token Management**: Automatic token refresh when expired
- **Variable Setup**: Dynamic test data generation
- **Environment Check**: Validate required variables

### Test Scripts
- **Response Validation**: Status codes, response structure
- **Data Verification**: Business logic validation
- **Token Extraction**: Automatic token storage from auth responses
- **Error Handling**: Graceful failure handling

### Global Scripts
- **Performance Testing**: Response time validation
- **Content Validation**: JSON structure verification
- **Security Checks**: Header validation

## 📊 Collection Structure

```
Main Collection (Tic_Tac_Toe_API)
├── Health Check
│   ├── Health Check
│   └── Metrics
├── API Info
│   └── API Documentation
├── Authentication
│   ├── Register User
│   ├── Login User
│   ├── Get Profile
│   ├── Update Profile
│   ├── Refresh Token
│   └── Logout
├── Social Authentication
│   ├── Google Login
│   └── Facebook Login
├── Game Management
│   ├── Create Custom Game
│   ├── Get Active Games
│   ├── Get Game State
│   ├── Get User Game Stats
│   ├── Get Leaderboard
│   ├── Make Move
│   └── Forfeit Game
├── Friend Management
│   ├── Send Friend Request
│   ├── Get Friend Requests
│   ├── Accept Friend Request
│   ├── Reject Friend Request
│   ├── Get Friends List
│   └── Remove Friend
└── Chat System
    ├── Send Message
    ├── Get Chat History
    └── Get Chat Rooms
```

## 🔐 Environment Variables

### Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `baseUrl` | API base URL | `http://localhost:5000` |
| `testEmail` | Test user email | `test@example.com` |
| `testPassword` | Test user password | `TestPassword123!` |
| `testUsername` | Test username | `testuser` |

### Auto-populated Variables
| Variable | Description | Set By |
|----------|-------------|--------|
| `authToken` | JWT token | Login requests |
| `refreshToken` | Refresh token | Login requests |
| `userId` | Current user ID | Login requests |
| `gameId` | Current game ID | Game creation |

## 🧪 Testing Scenarios

### Complete User Journey
1. **Registration** → Create new user account
2. **Authentication** → Login and get tokens
3. **Profile Management** → View/update profile
4. **Game Creation** → Create and manage games
5. **Social Features** → Send friend requests, chat
6. **Game Play** → Make moves, check game state

### Error Testing
- Invalid credentials
- Expired tokens
- Missing required fields
- Invalid game moves
- Permission violations

### Performance Testing
- Response time validation
- Concurrent user simulation
- Load testing scenarios

## 🚀 CI/CD Integration

### GitHub Actions
- Automated testing on push/PR
- Multi-environment testing
- Test report generation
- Artifact upload

### Newman CLI
- Headless test execution
- Report generation (HTML, JSON, JUnit)
- Environment-specific testing
- Folder-specific testing

## 📈 Advanced Usage

### Newman Command Examples
```bash
# Run entire collection
newman run Tic_Tac_Toe_API.postman_collection.json -e Tic_Tac_Toe_Development.postman_environment.json

# Run specific folder
newman run Tic_Tac_Toe_API.postman_collection.json -e Tic_Tac_Toe_Development.postman_environment.json --folder "Authentication"

# Generate HTML report
newman run Tic_Tac_Toe_API.postman_collection.json -e Tic_Tac_Toe_Development.postman_environment.json --reporters html --reporter-html-export report.html
```

### PowerShell Script Usage
```powershell
# Run all tests on development
.\run-tests.ps1

# Run staging tests with HTML report
.\run-tests.ps1 -Environment staging -Report html

# Run specific folder tests
.\run-tests.ps1 -Folder "Authentication"

# Test all environments
.\run-tests.ps1 -Environment all -Report all
```

## 🔍 Monitoring & Reporting

### Available Reports
- **HTML Reports**: Visual test results
- **JSON Reports**: Machine-readable results
- **JUnit XML**: CI/CD integration
- **Console Output**: Real-time feedback

### Metrics Tracked
- Request success/failure rates
- Response times
- Test assertion results
- Error details and stack traces

## 🛠️ Customization

### Adding New Endpoints
1. Create new request in appropriate folder
2. Add comprehensive test scripts
3. Update environment variables if needed
4. Document in README

### Environment Setup
1. Copy existing environment file
2. Update base URL and credentials
3. Test connectivity
4. Document environment purpose

### Custom Test Scripts
1. Use Postman's test framework
2. Follow existing patterns
3. Include error handling
4. Add meaningful assertions

## 🚨 Troubleshooting

### Common Issues
- **Server not running**: Check baseUrl and server status
- **Authentication failures**: Verify credentials and token expiry
- **Test failures**: Check server logs and request format
- **Environment errors**: Verify variable configuration

### Debug Tools
- Postman Console (View → Show Postman Console)
- Test Results tab
- Network inspection
- Server logs

## 📚 Resources

### Documentation Links
- [Postman Documentation](https://learning.postman.com/)
- [Newman Documentation](https://github.com/postmanlabs/newman)
- [API Testing Best Practices](https://blog.postman.com/api-testing-best-practices/)

### Related Files
- `../src/` - Backend source code
- `../tests/` - Unit and integration tests
- `../.env.example` - Environment variables template

---

*This collection is designed to provide comprehensive API testing coverage while maintaining simplicity and automation capabilities. Regular updates ensure compatibility with API changes and testing best practices.*
