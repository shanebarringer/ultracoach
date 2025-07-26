require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function schemaMigration() {
  const client = await pool.connect()

  try {
    console.log('🔧 Starting schema migration to TEXT IDs...\n')

    // Step 1: Drop existing foreign key constraints
    console.log('🗂️ Step 1: Dropping foreign key constraints...')

    const constraints = [
      {
        table: 'training_plans',
        column: 'coach_id',
        constraint: 'training_plans_coach_id_users_id_fk',
      },
      {
        table: 'training_plans',
        column: 'runner_id',
        constraint: 'training_plans_runner_id_users_id_fk',
      },
      { table: 'messages', column: 'sender_id', constraint: 'messages_sender_id_users_id_fk' },
      {
        table: 'messages',
        column: 'recipient_id',
        constraint: 'messages_recipient_id_users_id_fk',
      },
      {
        table: 'notifications',
        column: 'user_id',
        constraint: 'notifications_user_id_users_id_fk',
      },
    ]

    for (const { table, column, constraint } of constraints) {
      try {
        await client.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${constraint}`)
        console.log(`  ✅ Dropped constraint ${constraint} from ${table}.${column}`)
      } catch (error) {
        console.log(`  ⚠️  Constraint ${constraint} not found (already dropped)`)
      }
    }

    // Step 2: Change column types from UUID to TEXT
    console.log('\n🔄 Step 2: Converting UUID columns to TEXT...')

    const columnChanges = [
      { table: 'training_plans', column: 'coach_id' },
      { table: 'training_plans', column: 'runner_id' },
      { table: 'messages', column: 'sender_id' },
      { table: 'messages', column: 'recipient_id' },
      { table: 'notifications', column: 'user_id' },
    ]

    for (const { table, column } of columnChanges) {
      console.log(`  🔄 Converting ${table}.${column} from UUID to TEXT...`)

      // Check current type
      const typeCheck = await client.query(
        `
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      `,
        [table, column]
      )

      if (typeCheck.rows[0] && typeCheck.rows[0].data_type === 'uuid') {
        await client.query(
          `ALTER TABLE ${table} ALTER COLUMN ${column} TYPE TEXT USING ${column}::TEXT`
        )
        console.log(`  ✅ Converted ${table}.${column} to TEXT`)
      } else {
        console.log(
          `  ℹ️  ${table}.${column} is already TEXT (${typeCheck.rows[0]?.data_type || 'unknown'})`
        )
      }
    }

    // Step 3: Update data - migrate UUID values to Better Auth text IDs
    console.log('\n🔄 Step 3: Migrating data to Better Auth IDs...')

    // Get user mappings
    const userMappingsResult = await client.query(`
      SELECT 
        u.id::text as original_id,
        bu.id as better_auth_id,
        u.email
      FROM users u
      JOIN better_auth_users bu ON u.email = bu.email
      WHERE u.id::text != bu.id
    `)

    console.log(`Found ${userMappingsResult.rows.length} users needing data migration`)

    // Update each table
    let totalUpdates = 0

    for (const mapping of userMappingsResult.rows) {
      // Training plans - coach_id
      const coachUpdates = await client.query(
        `
        UPDATE training_plans 
        SET coach_id = $1 
        WHERE coach_id = $2
      `,
        [mapping.better_auth_id, mapping.original_id]
      )

      // Training plans - runner_id
      const runnerUpdates = await client.query(
        `
        UPDATE training_plans 
        SET runner_id = $1 
        WHERE runner_id = $2
      `,
        [mapping.better_auth_id, mapping.original_id]
      )

      // Messages - sender_id
      const senderUpdates = await client.query(
        `
        UPDATE messages 
        SET sender_id = $1 
        WHERE sender_id = $2
      `,
        [mapping.better_auth_id, mapping.original_id]
      )

      // Messages - recipient_id
      const recipientUpdates = await client.query(
        `
        UPDATE messages 
        SET recipient_id = $1 
        WHERE recipient_id = $2
      `,
        [mapping.better_auth_id, mapping.original_id]
      )

      // Notifications - user_id
      const notificationUpdates = await client.query(
        `
        UPDATE notifications 
        SET user_id = $1 
        WHERE user_id = $2
      `,
        [mapping.better_auth_id, mapping.original_id]
      )

      const userTotal =
        coachUpdates.rowCount +
        runnerUpdates.rowCount +
        senderUpdates.rowCount +
        recipientUpdates.rowCount +
        notificationUpdates.rowCount

      if (userTotal > 0) {
        console.log(`  ✅ ${mapping.email}: Updated ${userTotal} records`)
        totalUpdates += userTotal
      }
    }

    console.log(`  📊 Total records updated: ${totalUpdates}`)

    // Step 4: Add new foreign key constraints to better_auth_users
    console.log('\n🔗 Step 4: Adding foreign key constraints to better_auth_users...')

    const newConstraints = [
      {
        table: 'training_plans',
        column: 'coach_id',
        constraint: 'training_plans_coach_id_better_auth_users_id_fk',
        reference: 'better_auth_users(id)',
      },
      {
        table: 'training_plans',
        column: 'runner_id',
        constraint: 'training_plans_runner_id_better_auth_users_id_fk',
        reference: 'better_auth_users(id)',
      },
      {
        table: 'messages',
        column: 'sender_id',
        constraint: 'messages_sender_id_better_auth_users_id_fk',
        reference: 'better_auth_users(id)',
      },
      {
        table: 'messages',
        column: 'recipient_id',
        constraint: 'messages_recipient_id_better_auth_users_id_fk',
        reference: 'better_auth_users(id)',
      },
      {
        table: 'notifications',
        column: 'user_id',
        constraint: 'notifications_user_id_better_auth_users_id_fk',
        reference: 'better_auth_users(id)',
      },
    ]

    for (const { table, column, constraint, reference } of newConstraints) {
      await client.query(`
        ALTER TABLE ${table} 
        ADD CONSTRAINT ${constraint} 
        FOREIGN KEY (${column}) REFERENCES ${reference} ON DELETE CASCADE
      `)
      console.log(`  ✅ Added constraint ${constraint} to ${table}.${column}`)
    }

    // Step 5: Validate migration
    console.log('\n✅ Step 5: Validating migration...')

    // Check for orphaned records
    const validationQueries = [
      {
        name: 'training_plans.coach_id',
        query: `
          SELECT COUNT(*) as count 
          FROM training_plans tp 
          LEFT JOIN better_auth_users bu ON tp.coach_id = bu.id 
          WHERE bu.id IS NULL
        `,
      },
      {
        name: 'training_plans.runner_id',
        query: `
          SELECT COUNT(*) as count 
          FROM training_plans tp 
          LEFT JOIN better_auth_users bu ON tp.runner_id = bu.id 
          WHERE bu.id IS NULL
        `,
      },
      {
        name: 'messages.sender_id',
        query: `
          SELECT COUNT(*) as count 
          FROM messages m 
          LEFT JOIN better_auth_users bu ON m.sender_id = bu.id 
          WHERE bu.id IS NULL
        `,
      },
      {
        name: 'messages.recipient_id',
        query: `
          SELECT COUNT(*) as count 
          FROM messages m 
          LEFT JOIN better_auth_users bu ON m.recipient_id = bu.id 
          WHERE bu.id IS NULL
        `,
      },
      {
        name: 'notifications.user_id',
        query: `
          SELECT COUNT(*) as count 
          FROM notifications n 
          LEFT JOIN better_auth_users bu ON n.user_id = bu.id 
          WHERE bu.id IS NULL
        `,
      },
    ]

    let allValid = true
    for (const { name, query } of validationQueries) {
      const result = await client.query(query)
      const orphanedCount = parseInt(result.rows[0].count)

      if (orphanedCount > 0) {
        console.log(`  ❌ ${name}: ${orphanedCount} orphaned records`)
        allValid = false
      } else {
        console.log(`  ✅ ${name}: No orphaned records`)
      }
    }

    if (allValid) {
      console.log('\n🎉 Schema migration completed successfully!')
      console.log('📋 All foreign key references now point to better_auth_users table')
      console.log('📋 All data has been migrated to Better Auth IDs')
      console.log('📋 Ready to update application code and remove user mapping system')
    } else {
      console.log('\n⚠️  Schema migration completed with validation warnings')
      console.log('📋 Please review orphaned records before proceeding')
    }
  } catch (error) {
    console.error('❌ Schema migration failed:', error.message)
    console.error('Error details:', error)
    throw error
  } finally {
    client.release()
  }
}

if (require.main === module) {
  schemaMigration()
    .catch(console.error)
    .finally(() => pool.end())
}

module.exports = { schemaMigration }
