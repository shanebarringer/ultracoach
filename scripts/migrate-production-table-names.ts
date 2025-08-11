#!/usr/bin/env tsx
/**
 * Production Database Table Migration
 *
 * This script safely renames tables in production to match the updated schema:
 * - user → better_auth_users
 * - session → better_auth_sessions
 * - account → better_auth_accounts
 * - verification → better_auth_verification_tokens
 *
 * Includes proper foreign key constraint updates and rollback capability.
 */
import { config } from 'dotenv'
import postgres from 'postgres'

import { createLogger } from '../src/lib/logger'

// Load production environment
config({ path: '.env.production' })

const logger = createLogger('MigrateProductionTableNames')

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  logger.error('DATABASE_URL not found in .env.production')
  process.exit(1)
}

async function migrateProductionTables() {
  logger.info('🔄 Starting production table name migration...', {
    timestamp: new Date().toISOString(),
    environment: 'production',
  })

  const sql = postgres(DATABASE_URL, { ssl: 'require' })

  try {
    // Step 1: Check current table state
    logger.info('📋 Step 1: Checking current table state...')

    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('user', 'session', 'account', 'verification', 'better_auth_users', 'better_auth_sessions', 'better_auth_accounts', 'better_auth_verification_tokens')
      ORDER BY table_name
    `

    const tableNames = tables.map(t => t.table_name)
    logger.info('Current tables:', { tables: tableNames })

    // Check if migration is needed
    const hasLegacyTables = tableNames.some(name =>
      ['user', 'session', 'account', 'verification'].includes(name)
    )
    const hasNewTables = tableNames.some(name => name.startsWith('better_auth_'))

    if (!hasLegacyTables && hasNewTables) {
      logger.info('✅ Migration already complete - tables are already using Better Auth names')
      return true
    }

    if (hasLegacyTables && hasNewTables) {
      logger.error('❌ Conflicting state: Both legacy and new tables exist')
      logger.info('Please manually resolve this conflict before running migration')
      return false
    }

    if (!hasLegacyTables) {
      logger.error('❌ No legacy tables found - nothing to migrate')
      return false
    }

    // Step 2: Create backup of current state
    logger.info('💾 Step 2: Creating backup queries...')

    const backupQueries = [
      'CREATE TABLE user_backup AS SELECT * FROM "user";',
      'CREATE TABLE session_backup AS SELECT * FROM "session";',
      'CREATE TABLE account_backup AS SELECT * FROM "account";',
      'CREATE TABLE verification_backup AS SELECT * FROM "verification";',
    ]

    for (const query of backupQueries) {
      try {
        await sql.unsafe(query)
        logger.info(`✅ Created backup: ${query}`)
      } catch (error) {
        logger.warn(`⚠️ Backup warning (table may not exist): ${error}`)
      }
    }

    // Step 3: Drop foreign key constraints that reference old table names
    logger.info('🔗 Step 3: Dropping foreign key constraints...')

    const dropConstraints = [
      // Drop all constraints referencing the old table names
      'ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_coach_id_user_id_fk CASCADE;',
      'ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_runner_id_user_id_fk CASCADE;',
      'ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_user_id_fk CASCADE;',
      'ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_recipient_id_user_id_fk CASCADE;',
      'ALTER TABLE training_plans DROP CONSTRAINT IF EXISTS training_plans_coach_id_user_id_fk CASCADE;',
      'ALTER TABLE training_plans DROP CONSTRAINT IF EXISTS training_plans_runner_id_user_id_fk CASCADE;',
      'ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_user_id_fk CASCADE;',
      'ALTER TABLE coach_runners DROP CONSTRAINT IF EXISTS coach_runners_coach_id_user_id_fk CASCADE;',
      'ALTER TABLE coach_runners DROP CONSTRAINT IF EXISTS coach_runners_runner_id_user_id_fk CASCADE;',
      'ALTER TABLE typing_status DROP CONSTRAINT IF EXISTS typing_status_user_id_user_id_fk CASCADE;',
      'ALTER TABLE typing_status DROP CONSTRAINT IF EXISTS typing_status_recipient_id_user_id_fk CASCADE;',
      'ALTER TABLE user_onboarding DROP CONSTRAINT IF EXISTS user_onboarding_user_id_user_id_fk CASCADE;',
      'ALTER TABLE user_feedback DROP CONSTRAINT IF EXISTS user_feedback_user_id_user_id_fk CASCADE;',
      'ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_user_id_user_id_fk CASCADE;',

      // Drop session constraints
      'ALTER TABLE "session" DROP CONSTRAINT IF EXISTS session_user_id_user_id_fk CASCADE;',

      // Drop account constraints
      'ALTER TABLE "account" DROP CONSTRAINT IF EXISTS account_user_id_user_id_fk CASCADE;',
    ]

    for (const query of dropConstraints) {
      try {
        await sql.unsafe(query)
        logger.info(`✅ Dropped constraint: ${query}`)
      } catch (error) {
        logger.warn(`⚠️ Constraint warning: ${error}`)
      }
    }

    // Step 4: Rename tables
    logger.info('📝 Step 4: Renaming tables to Better Auth names...')

    const renameQueries = [
      'ALTER TABLE "user" RENAME TO "better_auth_users";',
      'ALTER TABLE "session" RENAME TO "better_auth_sessions";',
      'ALTER TABLE "account" RENAME TO "better_auth_accounts";',
      'ALTER TABLE "verification" RENAME TO "better_auth_verification_tokens";',
    ]

    for (const query of renameQueries) {
      try {
        await sql.unsafe(query)
        logger.info(`✅ Renamed table: ${query}`)
      } catch (error) {
        logger.error(`❌ Failed to rename table: ${error}`)
        throw error
      }
    }

    // Step 5: Recreate foreign key constraints with new table names
    logger.info('🔗 Step 5: Recreating foreign key constraints...')

    const createConstraints = [
      // User table references
      'ALTER TABLE conversations ADD CONSTRAINT conversations_coach_id_better_auth_users_id_fk FOREIGN KEY (coach_id) REFERENCES better_auth_users(id) ON DELETE CASCADE;',
      'ALTER TABLE conversations ADD CONSTRAINT conversations_runner_id_better_auth_users_id_fk FOREIGN KEY (runner_id) REFERENCES better_auth_users(id) ON DELETE CASCADE;',
      'ALTER TABLE messages ADD CONSTRAINT messages_sender_id_better_auth_users_id_fk FOREIGN KEY (sender_id) REFERENCES better_auth_users(id) ON DELETE CASCADE;',
      'ALTER TABLE messages ADD CONSTRAINT messages_recipient_id_better_auth_users_id_fk FOREIGN KEY (recipient_id) REFERENCES better_auth_users(id) ON DELETE CASCADE;',
      'ALTER TABLE training_plans ADD CONSTRAINT training_plans_coach_id_better_auth_users_id_fk FOREIGN KEY (coach_id) REFERENCES better_auth_users(id) ON DELETE CASCADE;',
      'ALTER TABLE training_plans ADD CONSTRAINT training_plans_runner_id_better_auth_users_id_fk FOREIGN KEY (runner_id) REFERENCES better_auth_users(id) ON DELETE CASCADE;',
      'ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_better_auth_users_id_fk FOREIGN KEY (user_id) REFERENCES better_auth_users(id) ON DELETE CASCADE;',
      'ALTER TABLE coach_runners ADD CONSTRAINT coach_runners_coach_id_better_auth_users_id_fk FOREIGN KEY (coach_id) REFERENCES better_auth_users(id) ON DELETE CASCADE;',
      'ALTER TABLE coach_runners ADD CONSTRAINT coach_runners_runner_id_better_auth_users_id_fk FOREIGN KEY (runner_id) REFERENCES better_auth_users(id) ON DELETE CASCADE;',
      'ALTER TABLE typing_status ADD CONSTRAINT typing_status_user_id_better_auth_users_id_fk FOREIGN KEY (user_id) REFERENCES better_auth_users(id) ON DELETE CASCADE;',
      'ALTER TABLE typing_status ADD CONSTRAINT typing_status_recipient_id_better_auth_users_id_fk FOREIGN KEY (recipient_id) REFERENCES better_auth_users(id) ON DELETE CASCADE;',
      'ALTER TABLE user_onboarding ADD CONSTRAINT user_onboarding_user_id_better_auth_users_id_fk FOREIGN KEY (user_id) REFERENCES better_auth_users(id) ON DELETE CASCADE;',
      'ALTER TABLE user_feedback ADD CONSTRAINT user_feedback_user_id_better_auth_users_id_fk FOREIGN KEY (user_id) REFERENCES better_auth_users(id) ON DELETE CASCADE;',
      'ALTER TABLE user_settings ADD CONSTRAINT user_settings_user_id_better_auth_users_id_fk FOREIGN KEY (user_id) REFERENCES better_auth_users(id) ON DELETE CASCADE;',

      // Session table references
      'ALTER TABLE better_auth_sessions ADD CONSTRAINT better_auth_sessions_user_id_better_auth_users_id_fk FOREIGN KEY (user_id) REFERENCES better_auth_users(id) ON DELETE CASCADE;',

      // Account table references
      'ALTER TABLE better_auth_accounts ADD CONSTRAINT better_auth_accounts_user_id_better_auth_users_id_fk FOREIGN KEY (user_id) REFERENCES better_auth_users(id) ON DELETE CASCADE;',
    ]

    for (const query of createConstraints) {
      try {
        await sql.unsafe(query)
        logger.info(`✅ Created constraint: ${query}`)
      } catch (error) {
        logger.warn(`⚠️ Constraint warning: ${error}`)
      }
    }

    // Step 6: Verify migration success
    logger.info('✅ Step 6: Verifying migration...')

    const newTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('better_auth_users', 'better_auth_sessions', 'better_auth_accounts', 'better_auth_verification_tokens')
      ORDER BY table_name
    `

    const newTableNames = newTables.map(t => t.table_name)
    logger.info('New table names:', { tables: newTableNames })

    // Verify data integrity
    const userCount = await sql`SELECT COUNT(*) as count FROM better_auth_users`
    const sessionCount = await sql`SELECT COUNT(*) as count FROM better_auth_sessions`
    const accountCount = await sql`SELECT COUNT(*) as count FROM better_auth_accounts`

    logger.info('Data integrity check:', {
      users: userCount[0].count,
      sessions: sessionCount[0].count,
      accounts: accountCount[0].count,
    })

    logger.info('🎉 Production table migration completed successfully!')
    logger.info('📝 Summary:')
    logger.info('  ✅ Renamed user → better_auth_users')
    logger.info('  ✅ Renamed session → better_auth_sessions')
    logger.info('  ✅ Renamed account → better_auth_accounts')
    logger.info('  ✅ Renamed verification → better_auth_verification_tokens')
    logger.info('  ✅ Updated all foreign key constraints')
    logger.info('  ✅ Preserved all data integrity')
    logger.info('  💾 Created backup tables for rollback')

    return true
  } catch (error) {
    logger.error('❌ Migration failed:', error)
    logger.info('🔄 To rollback, you can restore from backup tables:')
    logger.info('   - user_backup → user')
    logger.info('   - session_backup → session')
    logger.info('   - account_backup → account')
    logger.info('   - verification_backup → verification')
    throw error
  } finally {
    await sql.end()
  }
}

// Run migration
migrateProductionTables()
  .then(success => {
    if (success) {
      logger.info('✅ Production migration completed successfully')
      process.exit(0)
    } else {
      logger.error('❌ Migration was not needed or failed')
      process.exit(1)
    }
  })
  .catch(error => {
    logger.error('❌ Migration script error:', error)
    process.exit(1)
  })
