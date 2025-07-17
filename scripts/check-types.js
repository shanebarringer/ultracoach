require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkTypes() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking column types...\n');
    
    // Check users table column types
    const usersColumns = await client.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 users table columns:');
    usersColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.udt_name})`);
    });
    
    // Check better_auth_users table column types
    const betterAuthColumns = await client.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'better_auth_users' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 better_auth_users table columns:');
    betterAuthColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.udt_name})`);
    });
    
    // Check some sample data to see actual formats
    console.log('\n📊 Sample data comparison:');
    
    const userSample = await client.query(`
      SELECT id, email FROM users LIMIT 2
    `);
    
    console.log('users.id samples:');
    userSample.rows.forEach(user => {
      console.log(`   - ${user.email}: "${user.id}" (length: ${user.id.length})`);
    });
    
    const betterAuthSample = await client.query(`
      SELECT id, email FROM better_auth_users LIMIT 2
    `);
    
    console.log('better_auth_users.id samples:');
    betterAuthSample.rows.forEach(user => {
      console.log(`   - ${user.email}: "${user.id}" (length: ${user.id.length})`);
    });
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  checkTypes().catch(console.error).finally(() => pool.end());
}

module.exports = { checkTypes };