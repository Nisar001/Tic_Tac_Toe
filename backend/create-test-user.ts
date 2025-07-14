import User from './src/models/user.model';
import { connectDB } from './src/config/database';
import * as bcrypt from 'bcrypt';

async function createTestUser() {
  try {
    await connectDB();
    
    const hashedPassword = await bcrypt.hash('SecurePass123!', 12);
    
    const user = new User({
      email: 'khannisarnk0786@gmail.com',
      username: 'nisarkhan1',
      password: hashedPassword,
      provider: 'manual',
      isEmailVerified: true, // Skip email verification for testing
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
    console.log('✅ Test user created successfully');
    console.log('Email:', user.email);
    console.log('Username:', user.username);
    
    // Test password immediately
    const testResult = await bcrypt.compare('SecurePass123!', hashedPassword);
    console.log('Password test:', testResult);
    
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    process.exit(0);
  }
}

createTestUser();
