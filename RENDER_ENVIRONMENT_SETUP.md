# Environment Variables Required for Render Deployment

## Essential Backend Environment Variables for Render:

1. **FRONTEND_URL** = `https://tictactoenisar.netlify.app`
   - ⚠️ **CRITICAL**: This must be set exactly to resolve CORS errors
   - This is the primary cause of "Not allowed by CORS" errors if missing

2. **NODE_ENV** = `production`

3. **JWT_SECRET** = `your-super-secret-jwt-key-here`

4. **DATABASE_URL** = `your-mongodb-connection-string`

5. **EMAIL_USER** = `your-email@gmail.com`

6. **EMAIL_PASS** = `your-app-password`

7. **GOOGLE_CLIENT_ID** = `your-google-oauth-client-id`

8. **GOOGLE_CLIENT_SECRET** = `your-google-oauth-client-secret`

9. **FACEBOOK_APP_ID** = `your-facebook-app-id`

10. **FACEBOOK_APP_SECRET** = `your-facebook-app-secret`

## How to Set Environment Variables in Render:

1. Go to your Render dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Click "Add Environment Variable"
5. Add each variable from the list above

## Immediate Action for CORS Fix:

**Priority 1**: Verify `FRONTEND_URL=https://tictactoenisar.netlify.app` is set in Render

## Debug Backend Connection:

1. Check backend logs in Render dashboard
2. Look for CORS debug messages we added
3. Verify health endpoint at: https://tic-tac-toe-uf5h.onrender.com/health

## Frontend Connection Test:

The updated frontend now includes:
- Connection test component on login/register pages
- Enhanced error logging in browser console
- Backend connectivity verification before API calls

## If CORS Issues Persist:

1. Check Render logs for detailed CORS debug output
2. Verify all environment variables are correctly set
3. Ensure no typos in FRONTEND_URL
4. Check browser Network tab for exact error details
