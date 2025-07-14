import { AuthUtils } from './utils/auth.utils';
import User from './models/user.model';

// Debug script to fix password issues
async function fixPasswordIssue() {
  try {
    console.log('🔧 Password Debug & Fix Script');
    console.log('==============================');

    // Replace with your actual email
    const userEmail = 'your-email@example.com'; // CHANGE THIS
    const correctPassword = 'SecurePass123!'; // CHANGE THIS

    // 1. Generate a fresh hash
    console.log('\n1. Generating fresh hash...');
    const { hash, testResult } = await AuthUtils.createFreshPasswordHash(correctPassword);
    
    if (!testResult) {
      console.error('❌ Fresh hash test failed!');
      return;
    }

    // 2. Update user in database
    console.log('\n2. Updating user in database...');
    const user = await User.findOne({ email: userEmail.toLowerCase() });
    
    if (!user) {
      console.error('❌ User not found with email:', userEmail);
      return;
    }

    console.log('✅ User found:', user.email);
    
    // Update the password
    user.password = hash;
    await user.save();
    
    console.log('✅ Password updated in database');

    // 3. Test the login
    console.log('\n3. Testing login...');
    const loginTest = await AuthUtils.comparePassword(correctPassword, hash);
    console.log('✅ Login test result:', loginTest);

    if (loginTest) {
      console.log('\n🎉 SUCCESS! Password should now work for login.');
    } else {
      console.log('\n❌ FAILED! There might be another issue.');
    }

  } catch (error) {
    console.error('❌ Error in password fix script:', error);
  }
}

// Run the script
fixPasswordIssue().then(() => {
  console.log('\n✅ Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
