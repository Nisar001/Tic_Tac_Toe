import User from './src/models/user.model';
import { connectDB } from './src/config/database';

async function listUsers() {
  try {
    await connectDB();
    
    const users = await User.find({}, 'email username provider').limit(10);
    
    console.log('📋 Users in database:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}, Username: ${user.username}, Provider: ${user.provider}`);
    });
    
    if (users.length === 0) {
      console.log('No users found in database');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

listUsers();
