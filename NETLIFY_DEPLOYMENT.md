# Netlify Deployment Guide for Tic Tac Toe Frontend

## Prerequisites

1. **GitHub Repository**: Your code should be pushed to a GitHub repository
2. **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
3. **Backend Deployed**: Your backend should be running at `https://tic-tac-toe-uf5h.onrender.com`

## Step-by-Step Deployment

### 1. Push to GitHub

Make sure your latest code is pushed to your GitHub repository:

```bash
git add .
git commit -m "Prepare frontend for Netlify deployment"
git push origin main
```

### 2. Connect to Netlify

1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click "New site from Git"
3. Choose "GitHub" as your Git provider
4. Select your `Tic_Tac_Toe` repository
5. Configure build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/build`

### 3. Environment Variables

In Netlify Dashboard > Site Settings > Environment Variables, add:

```
REACT_APP_API_URL=https://tic-tac-toe-uf5h.onrender.com/api
REACT_APP_SOCKET_URL=https://tic-tac-toe-uf5h.onrender.com
REACT_APP_ENV=production
GENERATE_SOURCEMAP=false
NODE_VERSION=18
```

**For Social Authentication (Optional):**
```
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_FACEBOOK_APP_ID=your_facebook_app_id
```

### 4. Deploy

1. Click "Deploy site"
2. Wait for the build to complete
3. Your site will be available at a Netlify URL (e.g., `https://amazing-app-123456.netlify.app`)

### 5. Custom Domain (Optional)

1. Go to Site Settings > Domain management
2. Add your custom domain
3. Configure DNS settings as instructed by Netlify

## Important Notes

### Backend Configuration

Your backend needs to allow your Netlify domain in CORS settings. Update your backend's CORS configuration to include:

```javascript
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://your-netlify-app.netlify.app', // Add your Netlify URL
    'https://your-custom-domain.com'        // Add custom domain if you have one
  ],
  credentials: true
};
```

### Social Auth Redirect URIs

Update your OAuth app configurations:

**Google OAuth:**
- Add `https://your-netlify-app.netlify.app` to authorized origins
- Add `https://your-netlify-app.netlify.app/auth/callback/google` to redirect URIs

**Facebook OAuth:**
- Add `https://your-netlify-app.netlify.app` to Valid OAuth Redirect URIs

### Environment Variables Security

- Never commit `.env` files with sensitive data
- Use Netlify's environment variables for all configuration
- The `.env.netlify` file is just a template - don't commit real values

## Build Optimization

The configuration includes:
- ✅ Automatic redirects for React Router
- ✅ Security headers
- ✅ Static asset caching
- ✅ Source map generation disabled for production
- ✅ Build optimization

## Troubleshooting

### Build Fails
- Check build logs in Netlify dashboard
- Ensure all dependencies are in `package.json`
- Verify Node version (should be 18)

### App Loads but API Calls Fail
- Check environment variables are set correctly
- Verify backend CORS configuration
- Check browser network tab for specific errors

### Social Auth Not Working
- Verify OAuth redirect URIs are configured
- Check OAuth client IDs in environment variables
- Ensure backend social auth routes are working

## Automatic Deployments

Once connected, Netlify will automatically:
- Deploy when you push to the main branch
- Run builds and show deployment status
- Provide deploy previews for pull requests

## Performance Monitoring

- Use Netlify Analytics for traffic insights
- Monitor Core Web Vitals in Netlify dashboard
- Set up notifications for failed deployments

## Support

If you encounter issues:
1. Check Netlify build logs
2. Review browser console for client-side errors
3. Test API endpoints directly
4. Verify environment variable configuration
