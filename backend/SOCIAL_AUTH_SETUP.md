# Social Authentication Setup Guide

This guide explains how to set up social authentication for Google, Facebook, Twitter, and Instagram in your Tic Tac Toe application.

## Overview

The application supports social login/register through 4 providers:
- **Google OAuth 2.0**
- **Facebook OAuth 2.0** 
- **Twitter OAuth 2.0**
- **Instagram Basic Display API**

## Required Environment Variables

```env
# Google OAuth 2.0
GOOGLE_CLIENT_ID=your-google-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Facebook OAuth 2.0
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Twitter OAuth 2.0
TWITTER_CONSUMER_KEY=your-twitter-consumer-key
TWITTER_CONSUMER_SECRET=your-twitter-consumer-secret

# Instagram OAuth 2.0
INSTAGRAM_CLIENT_ID=your-instagram-client-id
INSTAGRAM_CLIENT_SECRET=your-instagram-client-secret

# Frontend URL for redirects
FRONTEND_URL=http://localhost:3000
```

## 🔧 Setup Instructions

### 1. Google OAuth 2.0 Setup

1. **Go to Google Cloud Console**: https://console.developers.google.com/
2. **Create a new project** or select existing one
3. **Enable Google+ API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" and enable it
4. **Create OAuth 2.0 credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Name: "Tic Tac Toe App"
5. **Configure redirect URIs**:
   ```
   Authorized JavaScript origins:
   - http://localhost:5000
   - http://localhost:3000
   
   Authorized redirect URIs:
   - http://localhost:5000/api/auth/social/google/callback
   ```
6. **Copy credentials** to your `.env` file:
   ```env
   GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here
   ```

### 2. Facebook OAuth 2.0 Setup

1. **Go to Facebook Developers**: https://developers.facebook.com/
2. **Create a new app**:
   - Click "Create App"
   - Select "Consumer" app type
   - Enter app name: "Tic Tac Toe Game"
3. **Add Facebook Login product**:
   - Go to "Products" → "Facebook Login" → "Setup"
   - Select "Web" platform
4. **Configure OAuth settings**:
   - Go to "Facebook Login" → "Settings"
   - Add redirect URI: `http://localhost:5000/api/auth/social/facebook/callback`
   - Add domain: `localhost`
5. **Get App credentials**:
   - Go to "Settings" → "Basic"
   - Copy App ID and App Secret
6. **Update `.env` file**:
   ```env
   FACEBOOK_APP_ID=1234567890123456
   FACEBOOK_APP_SECRET=your-facebook-app-secret
   ```

### 3. Twitter OAuth 2.0 Setup

1. **Go to Twitter Developer Portal**: https://developer.twitter.com/
2. **Apply for developer account** if needed
3. **Create a new app**:
   - Go to "Projects & Apps" → "Create App"
   - Enter app name: "Tic Tac Toe Game"
4. **Configure OAuth 2.0 settings**:
   - Go to your app → "Settings" → "Authentication settings"
   - Enable "OAuth 2.0"
   - Add callback URL: `http://localhost:5000/api/auth/social/twitter/callback`
   - Add website URL: `http://localhost:3000`
5. **Get API keys**:
   - Go to "Keys and tokens" tab
   - Copy Consumer Key and Consumer Secret
6. **Update `.env` file**:
   ```env
   TWITTER_CONSUMER_KEY=your-twitter-consumer-key
   TWITTER_CONSUMER_SECRET=your-twitter-consumer-secret
   ```

### 4. Instagram Basic Display API Setup

1. **Go to Facebook Developers**: https://developers.facebook.com/
2. **Use existing Facebook app** or create new one
3. **Add Instagram Basic Display product**:
   - Go to "Products" → "Instagram Basic Display" → "Setup"
4. **Create Instagram app**:
   - Click "Create New App"
   - Display name: "Tic Tac Toe Game"
5. **Configure OAuth settings**:
   - Add redirect URI: `http://localhost:5000/api/auth/social/instagram/callback`
   - Add deauthorize callback: `http://localhost:5000/api/auth/social/instagram/deauthorize`
   - Add data deletion request: `http://localhost:5000/api/auth/social/instagram/data-deletion`
6. **Get credentials**:
   - Copy Instagram App ID and Instagram App Secret
7. **Update `.env` file**:
   ```env
   INSTAGRAM_CLIENT_ID=your-instagram-client-id
   INSTAGRAM_CLIENT_SECRET=your-instagram-client-secret
   ```

## 🔗 API Endpoints

After setup, these endpoints will be available:

### Authentication Endpoints
```
GET  /api/auth/social/google          - Initiate Google login
GET  /api/auth/social/google/callback - Google callback

GET  /api/auth/social/facebook          - Initiate Facebook login  
GET  /api/auth/social/facebook/callback - Facebook callback

GET  /api/auth/social/twitter          - Initiate Twitter login
GET  /api/auth/social/twitter/callback - Twitter callback

GET  /api/auth/social/instagram          - Initiate Instagram login
GET  /api/auth/social/instagram/callback - Instagram callback
```

### Frontend Integration
```javascript
// Initiate social login
window.location.href = '/api/auth/social/google';

// Handle callback (frontend should listen for this)
// User will be redirected to: http://localhost:3000/auth/callback?provider=google&success=true
```

## 🧪 Testing Social Authentication

### 1. Manual Testing
1. Start your backend server: `npm run dev`
2. Navigate to: `http://localhost:5000/api/auth/social/google`
3. Complete OAuth flow
4. Verify redirect to frontend with success parameter

### 2. Postman Testing
Use the provided Postman collection:
- **Social Authentication** folder
- **Google Login** request
- **Facebook Login** request  
- **Twitter Login** request
- **Instagram Login** request

### 3. Integration Testing
```bash
# Run social auth tests
npm test -- --grep "social"
```

## 🔒 Security Considerations

### Production Setup
1. **Use HTTPS** for all redirect URIs in production
2. **Whitelist domains** in OAuth provider settings
3. **Store secrets securely** (use environment variables, never commit)
4. **Rotate secrets** regularly
5. **Monitor OAuth usage** for suspicious activity

### Environment-Specific URLs
```env
# Development
FRONTEND_URL=http://localhost:3000

# Staging  
FRONTEND_URL=https://staging.your-domain.com

# Production
FRONTEND_URL=https://your-domain.com
```

### Callback URLs by Environment
```
Development:
- http://localhost:5000/api/auth/social/{provider}/callback

Staging:
- https://api-staging.your-domain.com/api/auth/social/{provider}/callback

Production:  
- https://api.your-domain.com/api/auth/social/{provider}/callback
```

## 🐛 Troubleshooting

### Common Issues

#### "Invalid redirect URI"
- **Cause**: Callback URL not registered with OAuth provider
- **Solution**: Add exact callback URL to provider settings

#### "Invalid client ID"
- **Cause**: Wrong client ID or app not configured properly
- **Solution**: Verify credentials in provider dashboard

#### "Access denied"
- **Cause**: User denied permissions or app not approved
- **Solution**: Check required permissions and app review status

#### "CORS errors"
- **Cause**: Frontend domain not whitelisted
- **Solution**: Add frontend domain to OAuth provider settings

### Debug Tips
1. **Check logs**: Look for detailed error messages in console
2. **Verify environment variables**: Ensure all required vars are set
3. **Test callback URLs**: Use browser to test redirect URLs directly  
4. **Check provider status**: Verify OAuth apps are active in provider dashboards

## 📋 Checklist

Before going live, ensure:

- [ ] All OAuth apps created and configured
- [ ] Callback URLs updated for production domains
- [ ] Environment variables set for all environments
- [ ] HTTPS enabled for production
- [ ] Domain verification completed (where required)
- [ ] App review submitted (Facebook/Instagram if needed)
- [ ] Rate limiting configured appropriately
- [ ] Error handling tested for all failure scenarios
- [ ] User data handling complies with provider policies

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login/)
- [Twitter OAuth 2.0 Documentation](https://developer.twitter.com/en/docs/authentication/oauth-2-0)
- [Instagram Basic Display API](https://developers.facebook.com/docs/instagram-basic-display-api/)

## 🔄 User Flow

1. **User clicks social login** on frontend
2. **Frontend redirects** to `/api/auth/social/{provider}`
3. **Backend initiates** OAuth flow with provider
4. **User authorizes** app on provider's site
5. **Provider redirects** to callback URL with auth code
6. **Backend exchanges** auth code for access token
7. **Backend fetches** user profile from provider
8. **Backend creates/updates** user in database
9. **Backend generates** JWT token for user
10. **Backend redirects** to frontend with success status
11. **Frontend handles** authentication result

This setup provides a complete social authentication system for your Tic Tac Toe application!
