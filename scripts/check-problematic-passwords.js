require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkProblematicPasswords() {
  console.log('🔍 Checking for problematic password hashes...');
  
  try {
    // Check for users with null/undefined passwords
    const nullPasswords = await pool.query(`
      SELECT bu.email, bu.id, ba.password
      FROM better_auth_users bu
      LEFT JOIN better_auth_accounts ba ON bu.id = ba.user_id AND ba.provider_id = 'credential'
      WHERE ba.password IS NULL OR ba.password = ''
    `);
    
    if (nullPasswords.rows.length > 0) {
      console.log('❌ Found users with null/empty passwords:');
      nullPasswords.rows.forEach(row => {
        console.log(`  - ${row.email} (ID: ${row.id})`);
      });
    } else {
      console.log('✅ No users with null/empty passwords found');
    }
    
    // Check for malformed bcrypt hashes
    const malformedHashes = await pool.query(`
      SELECT bu.email, bu.id, ba.password, length(ba.password) as password_length
      FROM better_auth_users bu
      JOIN better_auth_accounts ba ON bu.id = ba.user_id AND ba.provider_id = 'credential'
      WHERE ba.password IS NOT NULL 
        AND ba.password != ''
        AND (ba.password NOT LIKE '$2b$%' OR length(ba.password) != 60)
    `);
    
    if (malformedHashes.rows.length > 0) {
      console.log('❌ Found users with malformed password hashes:');
      malformedHashes.rows.forEach(row => {
        console.log(`  - ${row.email} (ID: ${row.id})`);
        console.log(`    Password: ${row.password}`);
        console.log(`    Length: ${row.password_length}`);
        console.log(`    Starts with $2b$: ${row.password.startsWith('$2b$')}`);
      });
    } else {
      console.log('✅ No malformed password hashes found');
    }
    
    // Check for users without credential accounts
    const noCredentialAccount = await pool.query(`
      SELECT bu.email, bu.id
      FROM better_auth_users bu
      LEFT JOIN better_auth_accounts ba ON bu.id = ba.user_id AND ba.provider_id = 'credential'
      WHERE ba.user_id IS NULL
    `);
    
    if (noCredentialAccount.rows.length > 0) {
      console.log('❌ Found users without credential accounts:');
      noCredentialAccount.rows.forEach(row => {
        console.log(`  - ${row.email} (ID: ${row.id})`);
      });
    } else {
      console.log('✅ All users have credential accounts');
    }
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`  Total users: ${(await pool.query('SELECT COUNT(*) FROM better_auth_users')).rows[0].count}`);
    console.log(`  Users with credential accounts: ${(await pool.query('SELECT COUNT(*) FROM better_auth_accounts WHERE provider_id = \'credential\'')).rows[0].count}`);
    console.log(`  Users with valid bcrypt hashes: ${(await pool.query('SELECT COUNT(*) FROM better_auth_accounts WHERE provider_id = \'credential\' AND password LIKE \'$2b$%\' AND length(password) = 60')).rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkProblematicPasswords(); 