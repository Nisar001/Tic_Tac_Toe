# Social Login Redirect URIs Configuration

This document provides the redirect URIs that need to be configured in each social provider's developer console for the Tic Tac Toe application.

## Overview

The application uses OAuth 2.0 flow for social authentication with the following providers:
- Google OAuth 2.0
- Facebook Login
- Twitter OAuth 2.0
- Instagram Basic Display API

## Environment Configuration

### Development Environment
- **Backend API**: `http://localhost:3000`
- **Frontend App**: `http://localhost:3001`

### Production Environment
- **Backend API**: `https://your-domain.com`
- **Frontend App**: `https://your-frontend-domain.com`

## Redirect URIs by Provider

### 1. Google OAuth 2.0

**Google Cloud Console Configuration:**
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Select your project or create a new one
- Navigate to APIs & Services > Credentials
- Create or edit OAuth 2.0 Client ID

**Authorized Redirect URIs:**

**Development:**
```
http://localhost:3000/api/auth/google/callback
http://localhost:3001/auth/success
http://localhost:3001/auth/error
```

**Production:**
```
https://your-domain.com/api/auth/google/callback
https://your-frontend-domain.com/auth/success
https://your-frontend-domain.com/auth/error
```

**Environment Variables:**
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 2. Facebook Login

**Facebook Developers Configuration:**
- Go to [Facebook Developers](https://developers.facebook.com/)
- Select your app or create a new one
- Navigate to Facebook Login > Settings

**Valid OAuth Redirect URIs:**

**Development:**
```
http://localhost:3000/api/auth/facebook/callback
http://localhost:3001/auth/success
http://localhost:3001/auth/error
```

**Production:**
```
https://your-domain.com/api/auth/facebook/callback
https://your-frontend-domain.com/auth/success
https://your-frontend-domain.com/auth/error
```

**Environment Variables:**
```env
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
```

### 3. Twitter OAuth 2.0

**Twitter Developer Portal Configuration:**
- Go to [Twitter Developer Portal](https://developer.twitter.com/)
- Select your app or create a new one
- Navigate to App Details > Authentication settings

**Callback URLs:**

**Development:**
```
http://localhost:3000/api/auth/twitter/callback
http://localhost:3001/auth/success
http://localhost:3001/auth/error
```

**Production:**
```
https://your-domain.com/api/auth/twitter/callback
https://your-frontend-domain.com/auth/success
https://your-frontend-domain.com/auth/error
```

**Environment Variables:**
```env
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
```

### 4. Instagram Basic Display

**Facebook Developers Configuration (Instagram):**
- Go to [Facebook Developers](https://developers.facebook.com/)
- Select your app and add Instagram Basic Display product
- Navigate to Instagram Basic Display > Basic Display

**Valid OAuth Redirect URIs:**

**Development:**
```
http://localhost:3000/api/auth/instagram/callback
http://localhost:3001/auth/success
http://localhost:3001/auth/error
```

**Production:**
```
https://your-domain.com/api/auth/instagram/callback
https://your-frontend-domain.com/auth/success
https://your-frontend-domain.com/auth/error
```

**Environment Variables:**
```env
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret
```

## Complete Environment Variables File

Create a `.env` file in your backend directory with the following variables:

```env
# Application Configuration
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001

# Database
MONGO_URI=mongodb://localhost:27017/tictactoe

# JWT Secrets
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Facebook OAuth
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Twitter OAuth
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret

# Instagram OAuth
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password

# Other configurations...
```

## Authentication Flow

### 1. Initiate Authentication
```
GET /api/auth/{provider}
```
Examples:
- `GET /api/auth/google`
- `GET /api/auth/facebook`
- `GET /api/auth/twitter`
- `GET /api/auth/instagram`

### 2. Callback Handling
After user authorization, the provider redirects to:
```
GET /api/auth/{provider}/callback?code=...&state=...
```

### 3. Frontend Redirects
After successful authentication:
- **Success**: Redirects to `{FRONTEND_URL}/auth/success?token=jwt_token`
- **Error**: Redirects to `{FRONTEND_URL}/auth/error?message=error_message`

## Testing the Integration

### 1. Development Testing
1. Start your backend server on `http://localhost:3000`
2. Start your frontend application on `http://localhost:3001`
3. Visit `http://localhost:3000/api/auth/google` to test Google login
4. Check that you're redirected properly through the OAuth flow

### 2. Production Testing
1. Deploy your backend to your production domain
2. Deploy your frontend to your frontend domain
3. Update all redirect URIs in provider consoles
4. Test the complete OAuth flow

## Security Considerations

1. **HTTPS in Production**: Always use HTTPS for production redirect URIs
2. **Domain Validation**: Ensure redirect URIs match exactly what's configured
3. **State Parameter**: The application should validate the state parameter to prevent CSRF attacks
4. **Token Security**: JWT tokens should be transmitted securely and stored safely

## Troubleshooting

### Common Issues:

1. **Redirect URI Mismatch**: Ensure the URIs in provider consoles match exactly
2. **CORS Issues**: Configure CORS properly for your frontend domain
3. **Environment Variables**: Verify all required environment variables are set
4. **Provider Configuration**: Check that all necessary scopes and permissions are configured

### Debug Steps:

1. Check browser network tab for redirect URLs
2. Verify environment variables are loaded correctly
3. Check server logs for authentication errors
4. Ensure provider apps are configured correctly

## Provider-Specific Notes

### Google
- Requires verified domain for production
- Email scope is required for user identification

### Facebook
- Requires app review for certain permissions
- Privacy Policy and Terms of Service URLs required

### Twitter
- Callback URLs must be exact matches
- Email permission requires additional approval

### Instagram
- Limited to Instagram Basic Display API
- Requires Facebook app configuration

## Support

If you encounter issues with social authentication:

1. Check provider-specific documentation
2. Verify redirect URI configuration
3. Review server logs for detailed error messages
4. Ensure all environment variables are properly set
