require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkPolicies() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking RLS policies...\n');
    
    // Get all policies
    const policies = await client.query(`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies 
      ORDER BY tablename, policyname
    `);
    
    console.log(`Found ${policies.rows.length} RLS policies:`);
    
    policies.rows.forEach(policy => {
      console.log(`\n📋 Policy: ${policy.policyname}`);
      console.log(`   Table: ${policy.tablename}`);
      console.log(`   Command: ${policy.cmd}`);
      console.log(`   Roles: ${policy.roles || 'ALL'}`);
      console.log(`   Condition: ${policy.qual || 'No condition'}`);
      if (policy.with_check) {
        console.log(`   With Check: ${policy.with_check}`);
      }
    });
    
    // Check which tables have RLS enabled
    console.log('\n🔒 Tables with RLS enabled:');
    const rlsTables = await client.query(`
      SELECT 
        schemaname,
        tablename,
        rowsecurity
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND rowsecurity = true
      ORDER BY tablename
    `);
    
    rlsTables.rows.forEach(table => {
      console.log(`   - ${table.tablename}`);
    });
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  checkPolicies().catch(console.error).finally(() => pool.end());
}

module.exports = { checkPolicies };