# Tic Tac Toe Backend - Render Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Prepare Your Repository
- Ensure your code is pushed to GitHub, GitLab, or Bitbucket
- Make sure all changes are committed and pushed

### 2. Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with your GitHub/GitLab account
3. Connect your repository

### 3. Deploy to Render

#### Option A: Using Render Dashboard (Recommended)
1. **Create New Web Service**
   - Click "New" → "Web Service"
   - Connect your repository
   - Select the backend folder if in a monorepo

2. **Configure Build & Deploy Settings**
   ```
   Name: tic-tac-toe-backend
   Branch: main (or your default branch)
   Root Directory: backend (if in monorepo, otherwise leave empty)
   Runtime: Node
   Build Command: npm run render-build
   Start Command: npm run render-start
   ```

   **⚠️ IMPORTANT**: Make sure to use `npm run render-build` and NOT `npm build`

   **Alternative Build Commands** (if render-build doesn't work):
   - `npm install && npm run build`
   - `npm ci && npm run build`
   - `npm run build`

3. **Set Environment Variables**
   ```
   NODE_ENV=production
   PORT=10000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secure_jwt_secret_32_chars_min
   JWT_REFRESH_SECRET=your_super_secure_refresh_secret
   JWT_EXPIRES_IN=7d
   JWT_REFRESH_EXPIRES_IN=30d
   FRONTEND_URL=https://your-frontend-domain.com
   CORS_ORIGIN=https://your-frontend-domain.com
   
   # Optional - Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_app_password
   
   # Optional - SMS Configuration (Twilio)
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_PHONE_NUMBER=your_twilio_phone
   ```

#### Option B: Using render.yaml (Infrastructure as Code)
1. Push the `render.yaml` file to your repository
2. In Render dashboard, click "New" → "Blueprint"
3. Connect your repository and deploy

### 4. Database Setup (MongoDB Atlas)
1. Create account at [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a new cluster (free tier available)
3. Create database user and whitelist IP (0.0.0.0/0 for Render)
4. Get connection string and add to `MONGO_URI` environment variable

### 5. SSL & Custom Domain (Optional)
- Render provides free SSL certificates
- Add your custom domain in the service settings
- Update CORS and frontend URL settings

## 🔧 Environment Variables Reference

### Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `10000` |
| `MONGO_URI` | MongoDB connection | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| `JWT_SECRET` | JWT signing secret | `your-super-secure-secret-32-chars-minimum` |
| `JWT_REFRESH_SECRET` | Refresh token secret | `your-refresh-secret` |
| `FRONTEND_URL` | Frontend domain | `https://your-app.netlify.app` |

### Optional Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_EXPIRES_IN` | Access token expiry | `7d` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `30d` |
| `EMAIL_HOST` | SMTP host | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_USER` | Email username | - |
| `EMAIL_PASSWORD` | Email password | - |
| `TWILIO_ACCOUNT_SID` | Twilio SID | - |
| `TWILIO_AUTH_TOKEN` | Twilio token | - |
| `TWILIO_PHONE_NUMBER` | Twilio phone | - |

## 🚦 Health Check
Your deployed service will be available at:
- **Health Check**: `https://your-service.onrender.com/health`
- **API Root**: `https://your-service.onrender.com/`

## 🎯 Post-Deployment Checklist
- [ ] Service starts successfully
- [ ] Health check returns 200
- [ ] Database connection works
- [ ] Authentication endpoints work
- [ ] Socket.io connections work
- [ ] CORS is properly configured
- [ ] SSL certificate is active

## 🐛 Common Issues & Solutions

### ❌ Build Command Error: "Unknown command: build"
**Problem**: Render shows `Unknown command: "build"`

**Solutions**:
1. **Check Build Command in Render Dashboard**:
   - Go to Service Settings → Build & Deploy
   - Ensure Build Command is: `npm run render-build` (NOT `npm build`)
   - Ensure Start Command is: `npm run render-start`
   - Save and redeploy

2. **Alternative Build Commands** (try in order):
   ```bash
   npm run render-build
   npm install && npm run build  
   npm ci && npm run build
   npm run build
   ```

3. **Root Directory Issues**:
   - If in monorepo: Set Root Directory to `backend`
   - If standalone: Leave Root Directory empty or set to `.`

4. **Manual Deploy**:
   - After fixing settings, click "Manual Deploy"
   - Don't rely on auto-deploy for the first deployment

### Build Fails
- Check Node.js version compatibility
- Ensure all dependencies are in package.json
- Verify TypeScript compilation works locally

### Environment Variables
- Double-check all required variables are set
- Ensure no trailing spaces in values
- Use double quotes for complex values

### Database Connection
- Whitelist Render IPs: 0.0.0.0/0
- Check MongoDB Atlas network access
- Verify connection string format

### CORS Issues
- Set FRONTEND_URL correctly
- Update CORS_ORIGIN if needed
- Check for https vs http mismatch

## 📊 Monitoring
- Use Render's built-in logs and metrics
- Set up external monitoring (optional)
- Monitor health check endpoint

## 🔄 Updating Your App
1. Push changes to your repository
2. Render will auto-deploy (if enabled)
3. Monitor deployment logs
4. Verify health check

## 💰 Pricing
- **Free Tier**: Limited resources, spins down after inactivity
- **Starter Plan** ($7/month): Always on, better performance
- **Pro Plan** ($25/month): Enhanced features and resources

Choose based on your needs and traffic expectations.

## 🆘 Support
- Render Documentation: https://render.com/docs
- Community Support: https://community.render.com
- MongoDB Atlas Support: https://cloud.mongodb.com/support
