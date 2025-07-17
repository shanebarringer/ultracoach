require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkTriggers() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking database triggers...\n');
    
    // Get all triggers
    const triggers = await client.query(`
      SELECT 
        trigger_name,
        event_object_table as table_name,
        trigger_schema,
        action_timing,
        event_manipulation,
        action_statement
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name
    `);
    
    console.log(`Found ${triggers.rows.length} triggers:`);
    
    triggers.rows.forEach(trigger => {
      console.log(`\n📋 Trigger: ${trigger.trigger_name}`);
      console.log(`   Table: ${trigger.table_name}`);
      console.log(`   Timing: ${trigger.action_timing} ${trigger.event_manipulation}`);
      console.log(`   Function: ${trigger.action_statement}`);
    });
    
    // Check notifications table structure
    console.log('\n📊 Notifications table structure:');
    const notificationsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    notificationsColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
    });
    
    // Check functions
    console.log('\n🔧 Custom functions:');
    const functions = await client.query(`
      SELECT 
        routine_name,
        routine_type,
        routine_definition
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
      AND routine_name LIKE '%updated_at%'
    `);
    
    functions.rows.forEach(func => {
      console.log(`\n📋 Function: ${func.routine_name} (${func.routine_type})`);
      console.log(`   Definition: ${func.routine_definition || 'Not available'}`);
    });
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  checkTriggers().catch(console.error).finally(() => pool.end());
}

module.exports = { checkTriggers };