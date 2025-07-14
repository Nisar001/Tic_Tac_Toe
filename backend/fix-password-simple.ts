import User from './src/models/user.model';
import { connectDB } from './src/config/database';
import * as bcrypt from 'bcrypt';

async function fixPassword() {
  await connectDB();
  
  const user = await User.findOne({ email: 'khannisarnk0786@gmail.com' }).select('+password');
  console.log('User found:', !!user);
  
  if (user) {
    const newHash = await bcrypt.hash('SecurePass123!', 12);
    console.log('New hash created');
    
    // Update directly in database
    await User.updateOne(
      { email: 'khannisarnk0786@gmail.com' },
      { password: newHash }
    );
    console.log('Password updated in database');
    
    // Verify the update
    const testResult = await bcrypt.compare('SecurePass123!', newHash);
    console.log('Verification test:', testResult);
  }
  
  process.exit(0);
}

fixPassword();
