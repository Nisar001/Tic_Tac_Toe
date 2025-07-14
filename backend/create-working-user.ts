import User from './src/models/user.model';
import { connectDB } from './src/config/database';
import * as bcrypt from 'bcrypt';

async function createWorkingUser() {
  await connectDB();
  
  // Delete any existing users to start fresh
  await User.deleteMany({});
  console.log('🗑️ Cleared existing users');
  
  // Create a simple password that we know works
  const password = 'password123';
  const hash = await bcrypt.hash(password, 12);
  
  // Verify the hash works immediately
  const verification = await bcrypt.compare(password, hash);
  console.log('🔍 Hash verification:', verification);
  
  if (!verification) {
    console.log('❌ Hash creation failed!');
    process.exit(1);
  }
  
  // Create user
  const user = new User({
    email: 'test@example.com',
    username: 'testuser',
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
  console.log('✅ Test user created:');
  console.log('   Email: test@example.com');
  console.log('   Password: password123');
  
  process.exit(0);
}

createWorkingUser();
