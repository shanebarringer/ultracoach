require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function debugLoginFlow() {
  console.log('🔍 Debugging login flow to identify hex string error...');
  
  const testEmail = 'testcoach@ultracoach.dev';
  const testPassword = 'password123';
  
  try {
    // Step 1: Find user
    console.log('\n1. Finding user...');
    const userResult = await pool.query(
      'SELECT * FROM better_auth_users WHERE email = $1',
      [testEmail]
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      emailVerified: user.email_verified
    });
    
    // Step 2: Find account
    console.log('\n2. Finding credential account...');
    const accountResult = await pool.query(
      'SELECT * FROM better_auth_accounts WHERE user_id = $1 AND provider_id = $2',
      [user.id, 'credential']
    );
    
    if (accountResult.rows.length === 0) {
      console.log('❌ No credential account found');
      return;
    }
    
    const account = accountResult.rows[0];
    console.log('✅ Account found:', {
      id: account.id,
      hasPassword: !!account.password,
      passwordLength: account.password ? account.password.length : 0,
      passwordStart: account.password ? account.password.substring(0, 10) : 'null'
    });
    
    // Step 3: Test password verification
    console.log('\n3. Testing password verification...');
    if (!account.password) {
      console.log('❌ Password is null/undefined');
      return;
    }
    
    try {
      const isValid = await bcrypt.compare(testPassword, account.password);
      console.log('✅ Password verification result:', isValid);
    } catch (bcryptError) {
      console.log('❌ bcrypt error:', bcryptError.message);
      console.log('❌ This might be the source of the hex string error!');
    }
    
    // Step 4: Check for any sessions
    console.log('\n4. Checking existing sessions...');
    const sessionResult = await pool.query(
      'SELECT * FROM better_auth_sessions WHERE user_id = $1',
      [user.id]
    );
    
    console.log(`Found ${sessionResult.rows.length} existing sessions`);
    sessionResult.rows.forEach((session, index) => {
      console.log(`  Session ${index + 1}:`, {
        id: session.id,
        token: session.token ? session.token.substring(0, 20) + '...' : 'null',
        expiresAt: session.expires_at,
        isValid: new Date(session.expires_at) > new Date()
      });
    });
    
    // Step 5: Check for verification tokens
    console.log('\n5. Checking verification tokens...');
    const verificationResult = await pool.query(
      'SELECT * FROM better_auth_verification_tokens WHERE identifier = $1',
      [testEmail]
    );
    
    console.log(`Found ${verificationResult.rows.length} verification tokens`);
    verificationResult.rows.forEach((token, index) => {
      console.log(`  Token ${index + 1}:`, {
        id: token.id,
        token: token.token ? token.token.substring(0, 20) + '...' : 'null',
        expiresAt: token.expires_at,
        isValid: new Date(token.expires_at) > new Date()
      });
    });
    
    // Step 6: Test Better Auth API directly
    console.log('\n6. Testing Better Auth API...');
    try {
      const response = await fetch('http://localhost:3001/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      });
      
      const data = await response.json();
      console.log('✅ API response:', data);
    } catch (apiError) {
      console.log('❌ API error:', apiError.message);
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

debugLoginFlow(); 