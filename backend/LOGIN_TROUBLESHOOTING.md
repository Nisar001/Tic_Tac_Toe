# Login Troubleshooting Guide

## Current Error Analysis
The error `Invalid email or password` at line 40 in login.controller.ts indicates that either:
1. No user exists with the provided email
2. The password comparison is failing

## Step-by-Step Solution

### 1. First, Register a User in Postman

**Endpoint:** `POST {{baseUrl}}/auth/register`

**Request Body:**
```json
{
  "username": "testuser001",
  "email": "test@example.com",
  "password": "Test123!",
  "phoneNumber": "+1234567890"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "email": "test@example.com",
      "username": "testuser001",
      ...
    }
  }
}
```

### 2. Then, Login with the Same Credentials

**Endpoint:** `POST {{baseUrl}}/auth/login`

**Request Body:**
```json
{
  "email": "test@example.com",
  "password": "Test123!"
}
```

### 3. Check Console Logs

After the login attempt, check your server console for debug messages like:
- "Login attempt for user: test@example.com, provider: manual"
- "Password validation result (user.comparePassword): true/false"
- "Password validation result (AuthUtils.comparePassword): true/false"

### 4. Common Issues & Solutions

#### Issue: "No user found with email"
**Solution:** Register the user first using the registration endpoint

#### Issue: "User has no password set"
**Solution:** The user was created via social login. Use social login or create a manual user

#### Issue: "Password validation result: false"
**Solutions:**
- Make sure you're using the exact same password used during registration
- Check if the password meets requirements (6+ chars, letters and numbers)
- Verify the user was created with provider: 'manual'

#### Issue: "Email verification required"
**Solution:** The email verification check is temporarily disabled. If re-enabled, you'll need to verify the email first.

### 5. Test Sequence in Postman

1. **Clear any existing environment variables**
2. **Run "Register User" request** with the test data above
3. **Copy the email from the registration response**
4. **Run "Login User" request** with the same email/password
5. **Check that tokens are stored in environment variables**

### 6. Alternative Test Data

If the above doesn't work, try with:
```json
{
  "username": "debuguser",
  "email": "debug@test.com", 
  "password": "Debug123!",
  "phoneNumber": "+1987654321"
}
```

### 7. Debugging Commands

Run these in your backend directory:

```bash
# Check if MongoDB is connected
node -e "console.log('MongoDB URI:', process.env.MONGO_URI || 'Not set')"

# Check if server is running
curl http://localhost:3000/api

# View server logs for detailed error info
```

## Current Login Controller Changes

I've added debugging logs to help identify the issue:
- Logs when no user is found
- Logs when user has no password
- Logs password validation results from both methods
- Shows user email and provider type

These logs will appear in your server console when you make login requests.
