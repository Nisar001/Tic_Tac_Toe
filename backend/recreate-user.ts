import User from './src/models/user.model';
import { connectDB } from './src/config/database';
import * as bcrypt from 'bcrypt';

async function recreateUser() {
  await connectDB();
  
  // Delete existing user
  await User.deleteOne({ email: 'khannisarnk0786@gmail.com' });
  console.log('✅ Deleted existing user');
  
  // Create and verify hash
  const password = 'SecurePass123!';
  const hash = await bcrypt.hash(password, 12);
  console.log('📋 Created hash:', hash);
  
  const verification = await bcrypt.compare(password, hash);
  console.log('🔍 Hash verification:', verification);
  
  if (!verification) {
    console.log('❌ Hash verification failed!');
    process.exit(1);
  }
  
  // Create user with verified hash
  const user = new User({
    email: 'khannisarnk0786@gmail.com',
    username: 'nisarkhan1',
    password: hash,
    provider: 'manual',
    isEmailVerified: true,
    level: 1,
    xp: 0,
    totalXP: 0,
    energy: 5,
    maxEnergy: 5,
    energyUpdatedAt: new Date(),
    lastSeen: new Date(),
    stats: {
      wins: 0,
      losses: 0,
      draws: 0,
      gamesPlayed: 0,
      winRate: 0
    }
  });
  
  await user.save();
  console.log('✅ User created with verified hash');
  
  process.exit(0);
}

recreateUser();
