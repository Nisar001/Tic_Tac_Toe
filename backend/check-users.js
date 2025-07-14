// Simple database user check script
// This helps debug login issues

const mongoose = require('mongoose');
require('dotenv').config();

async function checkUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tictactoe');
    console.log('Connected to MongoDB');

    // Simple user schema for checking
    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User', userSchema);

    // Count total users
    const totalUsers = await User.countDocuments();
    console.log(`Total users in database: ${totalUsers}`);

    // Get first few users (without passwords)
    const users = await User.find({}).select('email username provider isEmailVerified').limit(5);
    console.log('Sample users:', users.map(u => ({
      email: u.email,
      username: u.username,
      provider: u.provider,
      isEmailVerified: u.isEmailVerified
    })));

    // Check if test user exists
    const testUser = await User.findOne({ email: 'test@example.com' });
    if (testUser) {
      console.log('Test user found:', {
        email: testUser.email,
        username: testUser.username,
        hasPassword: !!testUser.password,
        isEmailVerified: testUser.isEmailVerified,
        provider: testUser.provider
      });
    } else {
      console.log('Test user (test@example.com) not found. Please register first.');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  checkUsers();
}

module.exports = { checkUsers };
