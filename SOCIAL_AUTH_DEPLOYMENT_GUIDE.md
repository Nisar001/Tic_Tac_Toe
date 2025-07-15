# 🚀 Social Auth & Deployment Setup Guide

## 📋 Current Configuration Status

### ✅ Backend Configuration (Deployed)
- **URL**: `https://tic-tac-toe-uf5h.onrender.com/api`
- **Status**: ✅ Deployed and Running
- **Social Auth**: Configured with Google and Facebook

### 🔧 Frontend Configuration (Local)
- **Current**: `http://localhost:3000`
- **Backend API**: Points to deployed backend
- **Status**: ✅ Ready for development and deployment

---

## 🔐 Social Authentication Setup

### 1. Google OAuth Setup
1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add these redirect URIs:
   ```
   # For local development
   http://localhost:3000/auth/callback
   https://tic-tac-toe-uf5h.onrender.com/api/auth/google/callback
   
   # For production frontend (update when deployed)
   https://your-frontend-domain.com/auth/callback
   ```

### 2. Facebook OAuth Setup
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or select existing
3. Add Facebook Login product
4. Configure Valid OAuth Redirect URIs:
   ```
   # For local development
   http://localhost:3000/auth/callback
   https://tic-tac-toe-uf5h.onrender.com/api/auth/facebook/callback
   
   # For production frontend (update when deployed)
   https://your-frontend-domain.com/auth/callback
   ```

---

## 🌐 Deployment Instructions

### Frontend Deployment (Choose one platform)

#### Option 1: Netlify
1. Build the project: `npm run build`
2. Deploy the `build` folder to Netlify
3. Update backend `.env` with your Netlify URL:
   ```
   FRONTEND_URL=https://your-netlify-app.netlify.app
   ```

#### Option 2: Vercel
1. Connect your GitHub repo to Vercel
2. Vercel will auto-build and deploy
3. Update backend `.env` with your Vercel URL:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```

#### Option 3: Render
1. Connect your GitHub repo to Render
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Update backend `.env` with your Render URL

---

## 🔄 Post-Deployment Updates

### After Frontend Deployment:

1. **Update Backend Environment**:
   ```env
   # In backend/.env - Update this line
   FRONTEND_URL=https://your-deployed-frontend-url.com
   ```

2. **Update Social Auth Providers**:
   - Add your new frontend URL to Google OAuth redirect URIs
   - Add your new frontend URL to Facebook OAuth redirect URIs

3. **Update Frontend Environment** (if needed):
   ```env
   # In frontend/.env - Update these if your frontend domain changes
   REACT_APP_GOOGLE_REDIRECT_URL=https://your-frontend-url.com/auth/callback
   REACT_APP_FACEBOOK_REDIRECT_URL=https://your-frontend-url.com/auth/callback
   ```

---

## 🧪 Testing Social Auth

### 1. Local Testing
1. Start frontend: `npm start` (from frontend directory)
2. Navigate to: `http://localhost:3000/auth/login`
3. Click "Continue with Google" or "Continue with Facebook"
4. Should redirect to provider, then back to your app

### 2. Production Testing
1. Deploy frontend to your chosen platform
2. Update all redirect URIs in social providers
3. Test the same flow on your deployed URL

---

## 🚨 Troubleshooting

### Common Issues:

1. **"Invalid Redirect URI" Error**:
   - Check that your redirect URIs are exactly correct in provider console
   - Ensure no trailing slashes unless required

2. **CORS Errors**:
   - Verify `FRONTEND_URL` in backend `.env` matches your frontend domain exactly

3. **Social Auth Callback Fails**:
   - Check browser network tab for any API errors
   - Verify tokens are being passed correctly in URL params

4. **"Authentication Failed" Message**:
   - Check backend logs for specific error details
   - Verify environment variables are loaded correctly

---

## 📝 Current Environment Variables

### Frontend (.env)
```env
REACT_APP_API_URL=https://tic-tac-toe-uf5h.onrender.com/api
REACT_APP_SOCKET_URL=https://tic-tac-toe-uf5h.onrender.com
REACT_APP_APP_NAME=Tic Tac Toe
REACT_APP_APP_VERSION=1.0.0
REACT_APP_ENV=production
```

### Backend (.env) - Key Social Auth Variables
```env
GOOGLE_CLIENT_ID=728646685475-b3f3ijcmsbhtg254mfn840poja7on9h2.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=[CONFIGURED]
FACEBOOK_APP_ID=1696809767608872
FACEBOOK_APP_SECRET=[CONFIGURED]
FRONTEND_URL=http://localhost:3000  # Update after frontend deployment
```

---

## ✅ Social Auth Flow

1. **User clicks social login button** → Redirects to provider
2. **Provider authentication** → User logs in with Google/Facebook
3. **Provider redirects back** → `/api/auth/{provider}/callback`
4. **Backend processes auth** → Creates/finds user, generates tokens
5. **Backend redirects to frontend** → `/auth/callback?token=xxx&refreshToken=yyy`
6. **Frontend handles tokens** → Stores tokens, updates auth state
7. **User is logged in** → Redirected to dashboard

---

## 🎯 Next Steps

1. ✅ **Frontend is configured** - Ready to deploy
2. 🔄 **Deploy frontend** - Choose Netlify, Vercel, or Render
3. 🔧 **Update backend FRONTEND_URL** - After frontend deployment
4. 🔐 **Update social provider redirect URIs** - Add production URLs
5. 🧪 **Test social auth** - Verify complete flow works

---

*Last Updated: July 15, 2025*
*Backend: https://tic-tac-toe-uf5h.onrender.com/api*
*Social Auth: Google & Facebook configured*
