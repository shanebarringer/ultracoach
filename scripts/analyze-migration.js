require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function analyzeMigration() {
  const client = await pool.connect()

  try {
    console.log('🔍 Analyzing migration needs...\n')

    // Get user mappings
    const userMappingsResult = await client.query(`
      SELECT 
        u.id as original_id,
        bu.id as better_auth_id,
        u.email,
        CASE 
          WHEN u.id::text = bu.id THEN 'SAME'
          ELSE 'DIFFERENT'
        END as mapping_status
      FROM users u
      JOIN better_auth_users bu ON u.email = bu.email
      ORDER BY mapping_status, u.email
    `)

    const sameIdUsers = userMappingsResult.rows.filter(u => u.mapping_status === 'SAME')
    const differentIdUsers = userMappingsResult.rows.filter(u => u.mapping_status === 'DIFFERENT')

    console.log(`📊 User ID Analysis:`)
    console.log(`   - Users with SAME IDs: ${sameIdUsers.length}`)
    console.log(`   - Users with DIFFERENT IDs: ${differentIdUsers.length}`)

    console.log(`\n✅ Users with matching IDs (no migration needed):`)
    sameIdUsers.forEach(user => {
      console.log(`   - ${user.email}: ${user.original_id}`)
    })

    console.log(`\n🔄 Users needing migration:`)
    differentIdUsers.forEach(user => {
      console.log(`   - ${user.email}: ${user.original_id} → ${user.better_auth_id}`)
    })

    // Count records that need migration
    console.log(`\n📋 Data that needs migration:`)

    for (const user of differentIdUsers) {
      // Count training plans
      const trainingPlansAsCoach = await client.query(
        `
        SELECT COUNT(*) FROM training_plans WHERE coach_id = $1
      `,
        [user.original_id]
      )

      const trainingPlansAsRunner = await client.query(
        `
        SELECT COUNT(*) FROM training_plans WHERE runner_id = $1
      `,
        [user.original_id]
      )

      // Count messages
      const messagesAsSender = await client.query(
        `
        SELECT COUNT(*) FROM messages WHERE sender_id = $1
      `,
        [user.original_id]
      )

      const messagesAsRecipient = await client.query(
        `
        SELECT COUNT(*) FROM messages WHERE recipient_id = $1
      `,
        [user.original_id]
      )

      // Count notifications
      const notifications = await client.query(
        `
        SELECT COUNT(*) FROM notifications WHERE user_id = $1
      `,
        [user.original_id]
      )

      const totalRecords =
        parseInt(trainingPlansAsCoach.rows[0].count) +
        parseInt(trainingPlansAsRunner.rows[0].count) +
        parseInt(messagesAsSender.rows[0].count) +
        parseInt(messagesAsRecipient.rows[0].count) +
        parseInt(notifications.rows[0].count)

      if (totalRecords > 0) {
        console.log(`   - ${user.email} (${totalRecords} records):`)
        if (trainingPlansAsCoach.rows[0].count > 0)
          console.log(`     • ${trainingPlansAsCoach.rows[0].count} training plans as coach`)
        if (trainingPlansAsRunner.rows[0].count > 0)
          console.log(`     • ${trainingPlansAsRunner.rows[0].count} training plans as runner`)
        if (messagesAsSender.rows[0].count > 0)
          console.log(`     • ${messagesAsSender.rows[0].count} messages as sender`)
        if (messagesAsRecipient.rows[0].count > 0)
          console.log(`     • ${messagesAsRecipient.rows[0].count} messages as recipient`)
        if (notifications.rows[0].count > 0)
          console.log(`     • ${notifications.rows[0].count} notifications`)
      }
    }

    console.log(`\n🎯 Migration Plan:`)
    if (differentIdUsers.length === 0) {
      console.log(`   ✅ No migration needed! All users already have matching IDs.`)
    } else {
      console.log(`   🔄 Need to migrate ${differentIdUsers.length} users with different IDs`)
      console.log(`   📝 Update foreign key references in training_plans, messages, notifications`)
      console.log(`   🗂️ Update schema to reference better_auth_users table`)
    }
  } catch (error) {
    console.error('❌ Analysis failed:', error.message)
    throw error
  } finally {
    client.release()
  }
}

if (require.main === module) {
  analyzeMigration()
    .catch(console.error)
    .finally(() => pool.end())
}

module.exports = { analyzeMigration }
