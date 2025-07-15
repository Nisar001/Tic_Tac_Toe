#!/bin/bash

# Deploy script for backend fixes
echo "🚀 Deploying backend social auth fixes..."

# Navigate to backend directory
cd backend

# Build the TypeScript project
echo "📦 Building backend..."
npm run build

# Deploy to production (this would typically push to git and trigger a deployment)
echo "🌐 Backend changes ready for deployment"
echo "📋 Key changes made:"
echo "   ✅ Fixed social auth callback URLs to use production domain"
echo "   ✅ Updated environment to production mode"
echo "   ✅ Enhanced error handling in social auth controllers"
echo "   ✅ Updated passport configuration for production URLs"

echo ""
echo "🔧 Next steps:"
echo "   1. Commit and push changes to trigger deployment"
echo "   2. Verify environment variables are set correctly on deployment platform"
echo "   3. Test social auth flow after deployment"

# Back to root
cd ..
