require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')
const fs = require('fs')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function simpleBackup() {
  try {
    console.log('🔄 Starting simple backup...')

    // Get user mapping data
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

    // Get training plans
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

    // Get messages (limit to manageable amount)
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
      LIMIT 50
    `

    const messages = await pool.query(messagesQuery)

    console.log('✅ Backup completed successfully!')
    console.log(`📊 Summary:`)
    console.log(`   - Users: ${userMappings.rows.length}`)
    console.log(`   - Training Plans: ${trainingPlans.rows.length}`)
    console.log(`   - Messages: ${messages.rows.length}`)

    // Show mapping status
    const mappedUsers = userMappings.rows.filter(u => u.better_auth_id)
    const unmappedUsers = userMappings.rows.filter(u => !u.better_auth_id)

    console.log(`   - Mapped Users: ${mappedUsers.length}`)
    console.log(`   - Unmapped Users: ${unmappedUsers.length}`)

    if (unmappedUsers.length > 0) {
      console.log(`⚠️  Unmapped users:`)
      unmappedUsers.forEach(u => {
        console.log(`   - ${u.original_email} (${u.original_id})`)
      })
    }

    // Save to file
    const backupData = {
      timestamp: new Date().toISOString(),
      user_mappings: userMappings.rows,
      training_plans: trainingPlans.rows,
      messages: messages.rows,
    }

    fs.writeFileSync('backup-data.json', JSON.stringify(backupData, null, 2))
    console.log('💾 Backup saved to backup-data.json')
  } catch (error) {
    console.error('❌ Backup failed:', error)
  } finally {
    await pool.end()
  }
}

simpleBackup()
