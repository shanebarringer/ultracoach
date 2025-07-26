require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function backupData() {
  try {
    console.log('🔄 Starting data backup before Better Auth ID migration...')

    const backupDir = path.join(__dirname, '../backups')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(backupDir, `pre-migration-backup-${timestamp}.json`)

    // Get all user mappings
    const userMappingQuery = `
      SELECT 
        u.id as original_id,
        u.email as original_email,
        u.role as original_role,
        u.full_name as original_name,
        bu.id as better_auth_id,
        bu.email as better_auth_email,
        bu.role as better_auth_role,
        bu.full_name as better_auth_name
      FROM users u
      LEFT JOIN better_auth_users bu ON u.email = bu.email
      ORDER BY u.created_at
    `

    const userMappings = await pool.query(userMappingQuery)

    // Get training plans with user references
    const trainingPlansQuery = `
      SELECT 
        tp.id,
        tp.title,
        tp.coach_id,
        tp.runner_id,
        tp.created_at,
        c.email as coach_email,
        r.email as runner_email
      FROM training_plans tp
      LEFT JOIN users c ON tp.coach_id = c.id
      LEFT JOIN users r ON tp.runner_id = r.id
      ORDER BY tp.created_at
    `

    const trainingPlans = await pool.query(trainingPlansQuery)

    // Get messages with user references
    const messagesQuery = `
      SELECT 
        m.id,
        m.sender_id,
        m.recipient_id,
        m.content,
        m.created_at,
        s.email as sender_email,
        r.email as recipient_email
      FROM messages m
      LEFT JOIN users s ON m.sender_id = s.id
      LEFT JOIN users r ON m.recipient_id = r.id
      ORDER BY m.created_at
      LIMIT 100
    `

    const messages = await pool.query(messagesQuery)

    // Get notifications with user references
    const notificationsQuery = `
      SELECT 
        n.id,
        n.user_id,
        n.type,
        n.title,
        n.created_at,
        u.email as user_email
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      ORDER BY n.created_at
    `

    const notifications = await pool.query(notificationsQuery)

    // Get conversations with user references
    const conversationsQuery = `
      SELECT 
        c.id,
        c.coach_id,
        c.runner_id,
        c.created_at,
        co.email as coach_email,
        r.email as runner_email
      FROM conversations c
      LEFT JOIN users co ON c.coach_id = co.id
      LEFT JOIN users r ON c.runner_id = r.id
      ORDER BY c.created_at
    `

    const conversations = await pool.query(conversationsQuery)

    // Create backup data structure
    const backupData = {
      backup_timestamp: new Date().toISOString(),
      migration_type: 'better-auth-id-migration',
      user_mappings: userMappings.rows,
      training_plans: trainingPlans.rows,
      messages: messages.rows,
      notifications: notifications.rows,
      conversations: conversations.rows,
      summary: {
        total_users: userMappings.rows.length,
        total_better_auth_users: userMappings.rows.filter(u => u.better_auth_id).length,
        total_training_plans: trainingPlans.rows.length,
        total_messages: messages.rows.length,
        total_notifications: notifications.rows.length,
        total_conversations: conversations.rows.length,
      },
    }

    // Write backup to file
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2))

    console.log('✅ Backup completed successfully!')
    console.log(`📁 Backup file: ${backupFile}`)
    console.log(`📊 Summary:`)
    console.log(`   - Users: ${backupData.summary.total_users}`)
    console.log(`   - Better Auth Users: ${backupData.summary.total_better_auth_users}`)
    console.log(`   - Training Plans: ${backupData.summary.total_training_plans}`)
    console.log(`   - Messages: ${backupData.summary.total_messages}`)
    console.log(`   - Notifications: ${backupData.summary.total_notifications}`)
    console.log(`   - Conversations: ${backupData.summary.total_conversations}`)

    // Validate data integrity
    console.log('🔍 Validating data integrity...')

    const unmappedUsers = userMappings.rows.filter(u => !u.better_auth_id)
    if (unmappedUsers.length > 0) {
      console.log(`⚠️  Warning: ${unmappedUsers.length} users without Better Auth mapping:`)
      unmappedUsers.forEach(u => {
        console.log(`   - ${u.original_email} (${u.original_id})`)
      })
    }

    const orphanedTrainingPlans = trainingPlans.rows.filter(
      tp => !tp.coach_email || !tp.runner_email
    )
    if (orphanedTrainingPlans.length > 0) {
      console.log(
        `⚠️  Warning: ${orphanedTrainingPlans.length} training plans with missing user references`
      )
    }

    console.log('✅ Data integrity validation complete!')
  } catch (error) {
    console.error('❌ Backup failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  backupData().catch(console.error)
}

module.exports = { backupData }
