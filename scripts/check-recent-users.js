require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkRecentUsers() {
  console.log('🔍 Checking for recently created users and potential issues...');
  
  try {
    // Check all users created in the last 24 hours
    const recentUsers = await pool.query(`
      SELECT 
        bu.email, 
        bu.id, 
        bu.created_at,
        bu.email_verified,
        ba.password,
        CASE 
          WHEN ba.password IS NULL THEN 'NULL'
          WHEN ba.password = '' THEN 'EMPTY'
          WHEN ba.password LIKE '$2b$%' AND length(ba.password) = 60 THEN 'VALID_BCRYPT'
          ELSE 'MALFORMED'
        END as password_status,
        length(ba.password) as password_length
      FROM better_auth_users bu
      LEFT JOIN better_auth_accounts ba ON bu.id = ba.user_id AND ba.provider_id = 'credential'
      WHERE bu.created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY bu.created_at DESC
    `);
    
    console.log('\n📋 Users created in last 24 hours:');
    if (recentUsers.rows.length === 0) {
      console.log('  No users created in the last 24 hours');
    } else {
      recentUsers.rows.forEach(row => {
        const status = row.password_status;
        const icon = status === 'VALID_BCRYPT' ? '✅' : '❌';
        console.log(`${icon} ${row.email} (created: ${row.created_at})`);
        console.log(`   Password status: ${status} (length: ${row.password_length || 'N/A'})`);
        if (status === 'MALFORMED') {
          console.log(`   Password: ${row.password}`);
        }
      });
    }
    
    // Check for any users without credential accounts
    const usersWithoutAccounts = await pool.query(`
      SELECT bu.email, bu.id, bu.created_at
      FROM better_auth_users bu
      LEFT JOIN better_auth_accounts ba ON bu.id = ba.user_id AND ba.provider_id = 'credential'
      WHERE ba.user_id IS NULL
      ORDER BY bu.created_at DESC
    `);
    
    console.log('\n📋 Users without credential accounts:');
    if (usersWithoutAccounts.rows.length === 0) {
      console.log('  All users have credential accounts');
    } else {
      usersWithoutAccounts.rows.forEach(row => {
        console.log(`❌ ${row.email} (created: ${row.created_at})`);
      });
    }
    
    // Check for any malformed sessions
    const malformedSessions = await pool.query(`
      SELECT 
        bs.id,
        bs.user_id,
        bs.token,
        bs.expires_at,
        bu.email,
        length(bs.token) as token_length
      FROM better_auth_sessions bs
      JOIN better_auth_users bu ON bs.user_id = bu.id
      WHERE bs.token IS NULL OR bs.token = '' OR length(bs.token) < 10
      ORDER BY bs.created_at DESC
    `);
    
    console.log('\n📋 Malformed sessions:');
    if (malformedSessions.rows.length === 0) {
      console.log('  No malformed sessions found');
    } else {
      malformedSessions.rows.forEach(row => {
        console.log(`❌ Session for ${row.email}:`);
        console.log(`   Token: ${row.token || 'NULL'}`);
        console.log(`   Length: ${row.token_length || 'N/A'}`);
      });
    }
    
    // Check for any malformed verification tokens
    const malformedVerificationTokens = await pool.query(`
      SELECT 
        bvt.id,
        bvt.identifier,
        bvt.token,
        bvt.expires_at,
        length(bvt.token) as token_length
      FROM better_auth_verification_tokens bvt
      WHERE bvt.token IS NULL OR bvt.token = '' OR length(bvt.token) < 10
      ORDER BY bvt.created_at DESC
    `);
    
    console.log('\n📋 Malformed verification tokens:');
    if (malformedVerificationTokens.rows.length === 0) {
      console.log('  No malformed verification tokens found');
    } else {
      malformedVerificationTokens.rows.forEach(row => {
        console.log(`❌ Verification token for ${row.identifier}:`);
        console.log(`   Token: ${row.token || 'NULL'}`);
        console.log(`   Length: ${row.token_length || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRecentUsers(); 