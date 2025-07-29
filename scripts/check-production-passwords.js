require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// Use production database URL if available
const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ No DATABASE_URL found in environment');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function checkProductionPasswords() {
  console.log('🔍 Checking production database for problematic password hashes...');
  console.log('Database URL:', databaseUrl.replace(/:[^:@]*@/, ':****@')); // Hide password
  
  try {
    // Check all users and their password hashes
    const allUsers = await pool.query(`
      SELECT 
        bu.email, 
        bu.id, 
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
      ORDER BY bu.email
    `);
    
    console.log('\n📋 All users and their password status:');
    allUsers.rows.forEach(row => {
      const status = row.password_status;
      const icon = status === 'VALID_BCRYPT' ? '✅' : '❌';
      console.log(`${icon} ${row.email}: ${status} (length: ${row.password_length || 'N/A'})`);
      
      if (status === 'MALFORMED') {
        console.log(`   Password: ${row.password}`);
      }
    });
    
    // Count by status
    const statusCounts = {};
    allUsers.rows.forEach(row => {
      statusCounts[row.password_status] = (statusCounts[row.password_status] || 0) + 1;
    });
    
    console.log('\n📊 Summary by status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    // Check for any malformed hashes
    const malformed = allUsers.rows.filter(row => row.password_status === 'MALFORMED');
    if (malformed.length > 0) {
      console.log('\n❌ Found malformed password hashes:');
      malformed.forEach(row => {
        console.log(`  - ${row.email}: ${row.password}`);
      });
    } else {
      console.log('\n✅ All password hashes are valid!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

checkProductionPasswords(); 