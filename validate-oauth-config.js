// OAuth Provider Configuration Validation

console.log('\n🔐 OAUTH PROVIDER CONFIGURATION VALIDATION\n');

console.log('📋 Required OAuth Provider Settings:\n');

console.log('🔴 GOOGLE OAUTH 2.0:');
console.log('   Dashboard: https://console.cloud.google.com/');
console.log('   Navigate to: APIs & Services > Credentials');
console.log('   OAuth 2.0 Client ID Settings:');
console.log('   ✅ Add to Authorized Redirect URIs:');
console.log('      https://tic-tac-toe-uf5h.onrender.com/api/auth/social/google/callback');
console.log('      http://localhost:5000/api/auth/social/google/callback (for local dev)');
console.log('');

console.log('🔵 FACEBOOK OAUTH:');
console.log('   Dashboard: https://developers.facebook.com/');
console.log('   Navigate to: App > Settings > Basic');
console.log('   Facebook Login Settings:');
console.log('   ✅ Add to Valid OAuth Redirect URIs:');
console.log('      https://tic-tac-toe-uf5h.onrender.com/api/auth/social/facebook/callback');
console.log('      http://localhost:5000/api/auth/social/facebook/callback (for local dev)');
console.log('');

console.log('🔧 CURRENT CONFIGURATION:');
console.log(`   Google Client ID: ${process.env.GOOGLE_CLIENT_ID ? 'SET ✅' : 'NOT SET ❌'}`);
console.log(`   Google Client Secret: ${process.env.GOOGLE_CLIENT_SECRET ? 'SET ✅' : 'NOT SET ❌'}`);
console.log(`   Facebook App ID: ${process.env.FACEBOOK_APP_ID ? 'SET ✅' : 'NOT SET ❌'}`);
console.log(`   Facebook App Secret: ${process.env.FACEBOOK_APP_SECRET ? 'SET ✅' : 'NOT SET ❌'}`);
console.log('');

console.log('🌐 EXPECTED CALLBACK URLS:');
console.log('   Production Backend: https://tic-tac-toe-uf5h.onrender.com');
console.log('   Frontend Callback: http://localhost:3000/auth/callback (development)');
console.log('');

console.log('⚠️  IMPORTANT NOTES:');
console.log('   1. The backend must be redeployed for changes to take effect');
console.log('   2. Environment must be set to production on the deployment platform');
console.log('   3. OAuth providers must accept the exact callback URLs listed above');
console.log('   4. Test the complete flow after configuration');
console.log('');
