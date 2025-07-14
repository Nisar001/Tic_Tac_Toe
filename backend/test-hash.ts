import * as bcrypt from 'bcrypt';

async function testHash() {
  const password = 'SecurePass123!';
  const hash = '$2b$12$xkjVgyqeEseKGITWfLeWpudFt4.XLP0RsT0l3zjaxkipT6k5uxaY6';
  
  console.log('Testing password:', password);
  console.log('Against hash:', hash);
  
  const result = await bcrypt.compare(password, hash);
  console.log('Comparison result:', result);
  
  // Test with different passwords
  const testPasswords = [
    'SecurePass123!',
    'securepass123!',
    'SecurePass123',
    'SecurePass123!!',
    ' SecurePass123!',
    'SecurePass123! '
  ];
  
  for (const testPass of testPasswords) {
    const testResult = await bcrypt.compare(testPass, hash);
    console.log(`"${testPass}" -> ${testResult}`);
  }
}

testHash();
