require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function stepByStepMigration() {
  const client = await pool.connect()

  try {
    console.log('🚀 Starting step-by-step migration (NO TRANSACTION)...\n')

    // Get user mappings that need migration
    console.log('📊 Getting user mappings...')
    const userMappingsResult = await client.query(`
      SELECT 
        u.id::text as original_id,
        bu.id as better_auth_id,
        u.email
      FROM users u
      JOIN better_auth_users bu ON u.email = bu.email
      WHERE u.id::text != bu.id
    `)

    console.log(`Found ${userMappingsResult.rows.length} users needing migration:`)
    userMappingsResult.rows.forEach(row => {
      console.log(`  ${row.email}: ${row.original_id} → ${row.better_auth_id}`)
    })

    if (userMappingsResult.rows.length === 0) {
      console.log('✅ No migration needed!')
      return
    }

    // Step 1: Update training_plans - coach_id
    console.log('\n🏃 Step 1: Updating training_plans.coach_id...')
    let totalUpdated = 0

    for (const mapping of userMappingsResult.rows) {
      const result = await client.query(
        `
        UPDATE training_plans 
        SET coach_id = $1 
        WHERE coach_id = $2
        RETURNING id, title
      `,
        [mapping.better_auth_id, mapping.original_id]
      )

      if (result.rows.length > 0) {
        console.log(`  ✅ ${mapping.email}: Updated ${result.rows.length} training plans as coach`)
        totalUpdated += result.rows.length
      }
    }
    console.log(`  📊 Total coach_id updates: ${totalUpdated}`)

    // Step 2: Update training_plans - runner_id
    console.log('\n🏃 Step 2: Updating training_plans.runner_id...')
    totalUpdated = 0

    for (const mapping of userMappingsResult.rows) {
      const result = await client.query(
        `
        UPDATE training_plans 
        SET runner_id = $1 
        WHERE runner_id = $2
        RETURNING id, title
      `,
        [mapping.better_auth_id, mapping.original_id]
      )

      if (result.rows.length > 0) {
        console.log(`  ✅ ${mapping.email}: Updated ${result.rows.length} training plans as runner`)
        totalUpdated += result.rows.length
      }
    }
    console.log(`  📊 Total runner_id updates: ${totalUpdated}`)

    // Step 3: Update messages - sender_id
    console.log('\n💬 Step 3: Updating messages.sender_id...')
    totalUpdated = 0

    for (const mapping of userMappingsResult.rows) {
      const result = await client.query(
        `
        UPDATE messages 
        SET sender_id = $1 
        WHERE sender_id = $2
        RETURNING id, content
      `,
        [mapping.better_auth_id, mapping.original_id]
      )

      if (result.rows.length > 0) {
        console.log(`  ✅ ${mapping.email}: Updated ${result.rows.length} messages as sender`)
        totalUpdated += result.rows.length
      }
    }
    console.log(`  📊 Total sender_id updates: ${totalUpdated}`)

    // Step 4: Update messages - recipient_id
    console.log('\n💬 Step 4: Updating messages.recipient_id...')
    totalUpdated = 0

    for (const mapping of userMappingsResult.rows) {
      const result = await client.query(
        `
        UPDATE messages 
        SET recipient_id = $1 
        WHERE recipient_id = $2
        RETURNING id, content
      `,
        [mapping.better_auth_id, mapping.original_id]
      )

      if (result.rows.length > 0) {
        console.log(`  ✅ ${mapping.email}: Updated ${result.rows.length} messages as recipient`)
        totalUpdated += result.rows.length
      }
    }
    console.log(`  📊 Total recipient_id updates: ${totalUpdated}`)

    // Step 5: Update notifications
    console.log('\n🔔 Step 5: Updating notifications.user_id...')
    totalUpdated = 0

    for (const mapping of userMappingsResult.rows) {
      const result = await client.query(
        `
        UPDATE notifications 
        SET user_id = $1 
        WHERE user_id = $2
        RETURNING id, title
      `,
        [mapping.better_auth_id, mapping.original_id]
      )

      if (result.rows.length > 0) {
        console.log(`  ✅ ${mapping.email}: Updated ${result.rows.length} notifications`)
        totalUpdated += result.rows.length
      }
    }
    console.log(`  📊 Total user_id updates: ${totalUpdated}`)

    console.log('\n🎉 Data migration completed successfully!')
    console.log('📋 Next steps:')
    console.log('   1. Update schema constraints to reference better_auth_users')
    console.log('   2. Update application code to remove user mapping')
    console.log('   3. Remove legacy users table')
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('Error details:', error)
    throw error
  } finally {
    client.release()
  }
}

if (require.main === module) {
  stepByStepMigration()
    .catch(console.error)
    .finally(() => pool.end())
}

module.exports = { stepByStepMigration }
