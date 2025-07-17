require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function simpleMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting simple migration test...');
    
    // Step 1: Get user mappings
    console.log('📊 Getting user mappings...');
    const userMappingsResult = await client.query(`
      SELECT 
        u.id as original_id,
        bu.id as better_auth_id,
        u.email
      FROM users u
      JOIN better_auth_users bu ON u.email = bu.email
    `);
    
    console.log(`Found ${userMappingsResult.rows.length} user mappings:`);
    userMappingsResult.rows.forEach(row => {
      console.log(`  ${row.email}: ${row.original_id} -> ${row.better_auth_id}`);
    });
    
    // Step 2: Check current foreign key values
    console.log('\n📋 Current training plans:');
    const trainingPlans = await client.query(`
      SELECT id, title, coach_id, runner_id FROM training_plans LIMIT 3
    `);
    trainingPlans.rows.forEach(plan => {
      console.log(`  ${plan.title}: coach=${plan.coach_id}, runner=${plan.runner_id}`);
    });
    
    console.log('\n📋 Current messages:');
    const messages = await client.query(`
      SELECT id, sender_id, recipient_id, content FROM messages LIMIT 3
    `);
    messages.rows.forEach(msg => {
      console.log(`  "${msg.content.substring(0, 20)}...": sender=${msg.sender_id}, recipient=${msg.recipient_id}`);
    });
    
    // Step 3: Try a single update
    console.log('\n🔄 Testing a single update...');
    const firstMapping = userMappingsResult.rows[0];
    
    const updateResult = await client.query(`
      UPDATE training_plans 
      SET coach_id = $1 
      WHERE coach_id = $2
      RETURNING id, title, coach_id
    `, [firstMapping.better_auth_id, firstMapping.original_id]);
    
    console.log(`Updated ${updateResult.rows.length} training plans for ${firstMapping.email}`);
    updateResult.rows.forEach(plan => {
      console.log(`  ${plan.title}: new coach_id=${plan.coach_id}`);
    });
    
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration test failed:', error.message);
    console.error('Error code:', error.code);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  simpleMigration().catch(console.error).finally(() => pool.end());
}

module.exports = { simpleMigration };