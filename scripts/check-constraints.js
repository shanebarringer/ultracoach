require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkConstraints() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking foreign key constraints...\n');
    
    // Get all foreign key constraints
    const constraints = await client.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND (
          tc.table_name IN ('training_plans', 'messages', 'notifications')
          OR ccu.table_name IN ('users', 'better_auth_users')
        )
      ORDER BY tc.table_name, tc.constraint_name
    `);
    
    console.log(`Found ${constraints.rows.length} foreign key constraints:`);
    
    constraints.rows.forEach(constraint => {
      console.log(`\n📋 ${constraint.table_name}.${constraint.column_name}`);
      console.log(`   Constraint: ${constraint.constraint_name}`);
      console.log(`   References: ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
    });
    
    // Check specific constraints that might be causing issues
    console.log('\n🎯 User-related constraints:');
    
    const userConstraints = constraints.rows.filter(c => 
      c.foreign_table_name === 'users' || c.foreign_table_name === 'better_auth_users'
    );
    
    userConstraints.forEach(constraint => {
      console.log(`   ${constraint.table_name}.${constraint.column_name} → ${constraint.foreign_table_name}.${constraint.foreign_column_name} (${constraint.constraint_name})`);
    });
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  checkConstraints().catch(console.error).finally(() => pool.end());
}

module.exports = { checkConstraints };