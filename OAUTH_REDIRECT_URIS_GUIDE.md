# OAuth Redirect URIs Configuration Guide

## 🌐 Deployment Scenarios

### If you're deploying frontend to a specific domain (e.g., Netlify, Vercel, etc.)
You'll need to add **4 redirect URIs** for each provider to support both development and production.

## 📋 Required OAuth Redirect URIs

### 🔴 GOOGLE OAUTH 2.0 CONFIGURATION
**Dashboard:** https://console.cloud.google.com/
**Path:** APIs & Services > Credentials > OAuth 2.0 Client ID

**Add these Authorized Redirect URIs:**

1. **Backend Development:** `http://localhost:5000/api/auth/social/google/callback`
2. **Backend Production:** `https://tic-tac-toe-uf5h.onrender.com/api/auth/social/google/callback`
3. **Frontend Development:** `http://localhost:3000/auth/callback`
4. **Frontend Production:** `https://YOUR-FRONTEND-DOMAIN.com/auth/callback`

### 🔵 FACEBOOK OAUTH CONFIGURATION
**Dashboard:** https://developers.facebook.com/
**Path:** Your App > Settings > Basic > Website > Site URL & Valid OAuth Redirect URIs

**Add these Valid OAuth Redirect URIs:**

1. **Backend Development:** `http://localhost:5000/api/auth/social/facebook/callback`
2. **Backend Production:** `https://tic-tac-toe-uf5h.onrender.com/api/auth/social/facebook/callback`
3. **Frontend Development:** `http://localhost:3000/auth/callback`
4. **Frontend Production:** `https://YOUR-FRONTEND-DOMAIN.com/auth/callback`

## 🏗️ Common Frontend Deployment Platforms

### Netlify
- Format: `https://your-app-name.netlify.app/auth/callback`
- Custom domain: `https://yourdomain.com/auth/callback`

### Vercel
- Format: `https://your-app-name.vercel.app/auth/callback`
- Custom domain: `https://yourdomain.com/auth/callback`

### GitHub Pages
- Format: `https://username.github.io/repository-name/auth/callback`

### Render
- Format: `https://your-app-name.onrender.com/auth/callback`

### Firebase Hosting
- Format: `https://your-project-id.web.app/auth/callback`
- Custom domain: `https://yourdomain.com/auth/callback`

## ⚙️ Update Your Configuration Files

### 1. Update Backend Environment (.env)
```env
# Update this line with your production frontend URL
FRONTEND_URL=https://YOUR-FRONTEND-DOMAIN.com
```

### 2. Update Frontend Environment (.env)
```env
# Update these lines with your production frontend URL
REACT_APP_GOOGLE_REDIRECT_URL=https://YOUR-FRONTEND-DOMAIN.com/auth/callback
REACT_APP_FACEBOOK_REDIRECT_URL=https://YOUR-FRONTEND-DOMAIN.com/auth/callback
```

## 📝 Step-by-Step Configuration

### Step 1: Deploy Your Frontend
1. Deploy your frontend to your chosen platform
2. Note down the production URL (e.g., `https://my-tic-tac-toe.netlify.app`)

### Step 2: Update Environment Variables
1. Update `FRONTEND_URL` in backend `.env`
2. Update redirect URLs in frontend `.env`
3. Redeploy both backend and frontend

### Step 3: Configure OAuth Providers

#### Google OAuth:
1. Go to https://console.cloud.google.com/
2. Navigate to APIs & Services > Credentials
3. Click on your OAuth 2.0 Client ID
4. Add all 4 redirect URIs listed above (replace YOUR-FRONTEND-DOMAIN.com with your actual domain)

#### Facebook OAuth:
1. Go to https://developers.facebook.com/
2. Select your app
3. Go to Settings > Basic
4. Add all 4 redirect URIs to "Valid OAuth Redirect URIs"

### Step 4: Test the Configuration
1. Test development: `http://localhost:3000/social-test`
2. Test production: `https://YOUR-FRONTEND-DOMAIN.com/social-test`

## 🎯 Example with Netlify Deployment

If you deploy to Netlify as `https://my-tic-tac-toe.netlify.app`, your complete OAuth redirect URIs would be:

### Google OAuth 2.0 Redirect URIs:
```
http://localhost:5000/api/auth/social/google/callback
https://tic-tac-toe-uf5h.onrender.com/api/auth/social/google/callback
http://localhost:3000/auth/callback
https://my-tic-tac-toe.netlify.app/auth/callback
```

### Facebook OAuth Redirect URIs:
```
http://localhost:5000/api/auth/social/facebook/callback
https://tic-tac-toe-uf5h.onrender.com/api/auth/social/facebook/callback
http://localhost:3000/auth/callback
https://my-tic-tac-toe.netlify.app/auth/callback
```

## ⚠️ Important Notes

1. **Exact Match Required:** OAuth providers require exact URL matches (including protocol, domain, port, and path)
2. **No Trailing Slashes:** Don't add trailing slashes to the URLs
3. **HTTPS Required:** Production URLs must use HTTPS
4. **Test Both Environments:** Test social auth in both development and production
5. **Redeploy After Changes:** Backend must be redeployed after environment variable changes

## 🔄 OAuth Flow Summary

1. User clicks "Login with Google/Facebook" on frontend
2. Frontend redirects to backend: `https://tic-tac-toe-uf5h.onrender.com/api/auth/social/google`
3. Backend redirects to OAuth provider (Google/Facebook)
4. User authenticates with OAuth provider
5. OAuth provider redirects back to backend: `https://tic-tac-toe-uf5h.onrender.com/api/auth/social/google/callback`
6. Backend processes authentication and redirects to frontend: `https://YOUR-FRONTEND-DOMAIN.com/auth/callback?token=...`
7. Frontend AuthCallback component processes the tokens and completes login

Replace `YOUR-FRONTEND-DOMAIN.com` with your actual frontend deployment URL!
