# Social Login Redirect URIs - Quick Reference

## Development (localhost)

### Backend API Base: `http://localhost:3000`
### Frontend App Base: `http://localhost:3001`

## Provider Callback URLs (for Developer Consoles)

### Google OAuth 2.0
```
http://localhost:3000/api/auth/google/callback
```

### Facebook Login
```
http://localhost:3000/api/auth/facebook/callback
```

### Twitter OAuth 2.0
```
http://localhost:3000/api/auth/twitter/callback
```

### Instagram Basic Display
```
http://localhost:3000/api/auth/instagram/callback
```

## Frontend Redirect URLs

### Success Page
```
http://localhost:3001/auth/success
```

### Error Page
```
http://localhost:3001/auth/error
```

## Production URLs (replace with your domains)

### Backend API Base: `https://your-domain.com`
### Frontend App Base: `https://your-frontend-domain.com`

### Provider Callbacks (Production)
```
https://your-domain.com/api/auth/google/callback
https://your-domain.com/api/auth/facebook/callback
https://your-domain.com/api/auth/twitter/callback
https://your-domain.com/api/auth/instagram/callback
```

### Frontend Redirects (Production)
```
https://your-frontend-domain.com/auth/success
https://your-frontend-domain.com/auth/error
```

## Authentication Flow URLs

### Initiate Social Login
```
GET http://localhost:3000/api/auth/google
GET http://localhost:3000/api/auth/facebook
GET http://localhost:3000/api/auth/twitter
GET http://localhost:3000/api/auth/instagram
```

### After Successful Authentication
Users will be redirected to:
```
http://localhost:3001/auth/success?token={jwt_token}&refreshToken={refresh_token}&provider={provider_name}
```

### After Failed Authentication
Users will be redirected to:
```
http://localhost:3001/auth/error?message={error_message}
```

## Configuration in Provider Consoles

1. **Google Cloud Console**: Add to "Authorized redirect URIs"
2. **Facebook Developers**: Add to "Valid OAuth Redirect URIs"
3. **Twitter Developer Portal**: Add to "Callback URLs"
4. **Instagram (Facebook)**: Add to "Valid OAuth Redirect URIs"

## Environment Variables Required

```env
# Base URLs
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001

# Google
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Facebook
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret

# Twitter
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret

# Instagram
INSTAGRAM_CLIENT_ID=your_client_id
INSTAGRAM_CLIENT_SECRET=your_client_secret
```
