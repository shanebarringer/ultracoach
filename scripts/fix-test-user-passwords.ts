#!/usr/bin/env tsx
/**
 * Fix test user passwords in production database
 *
 * IMPORTANT: This script deletes and recreates test user accounts
 * to ensure they have the correct password format that Better Auth expects.
 *
 * Better Auth uses its own password hashing that is incompatible with bcrypt.
 */
import { db } from '../src/lib/database'
import { createLogger } from '../src/lib/logger'

const logger = createLogger('fix-test-passwords')

// Use environment variable for test coach email
const COACH_EMAIL = process.env.TEST_COACH_EMAIL || 'emma@ultracoach.dev'

// Test users that need to be recreated
const TEST_USERS = [
  { email: COACH_EMAIL, name: 'Emma Johnson', userType: 'coach' },
  { email: 'sarah@ultracoach.dev', name: 'Sarah Mountain', userType: 'coach' },
  { email: 'marcus@ultracoach.dev', name: 'Marcus Trail', userType: 'coach' },
]

async function recreateTestUsers() {
  logger.info('Starting test user recreation...')
  logger.info('This will delete and recreate test users to fix password issues')

  for (const testUser of TEST_USERS) {
    try {
      logger.info(`Processing ${testUser.email}...`)

      // First, get the user ID
      const userResult = await db.execute(`SELECT id FROM better_auth_users WHERE email = $1`, [
        testUser.email,
      ])

      if (userResult.rows.length === 0) {
        logger.warn(`User ${testUser.email} not found in database`)
        continue
      }

      const userId = userResult.rows[0].id
      logger.info(`Found user ${testUser.email} with ID: ${userId}`)

      // Delete related records in correct order
      logger.info(`Deleting related records for ${testUser.email}...`)

      // Delete sessions
      await db.execute(`DELETE FROM better_auth_sessions WHERE user_id = $1`, [userId])

      // Delete accounts
      await db.execute(`DELETE FROM better_auth_accounts WHERE user_id = $1`, [userId])

      // Delete the user
      await db.execute(`DELETE FROM better_auth_users WHERE id = $1`, [userId])

      logger.info(`✅ Successfully deleted ${testUser.email}`)
      logger.info(
        `⚠️  User ${testUser.email} needs to be recreated via the sign-up flow or automated script`
      )
    } catch (error) {
      logger.error(`❌ Failed to process ${testUser.email}:`, error)
    }
  }

  logger.info('Test user cleanup complete!')
  logger.info('')
  logger.info('NEXT STEPS:')
  logger.info('1. Run the automated test user creation script:')
  logger.info('   pnpm tsx scripts/create-test-users-automated.ts')
  logger.info('2. Or manually sign up each user through the web interface')
  logger.info('')
  logger.info('The correct password for all test users should be: UltraCoach2025!')
}

// Run the cleanup
recreateTestUsers()
  .then(() => {
    logger.info('Test user cleanup completed successfully')
    process.exit(0)
  })
  .catch(error => {
    logger.error('Failed to cleanup test users:', error)
    process.exit(1)
  })
