#!/usr/bin/env tsx
/**
 * Fresh Test User Setup Script
 *
 * This script cleanly removes existing test users and creates fresh ones
 * by going through the actual sign-up page to ensure proper hash format.
 */
import { eq, inArray, sql } from 'drizzle-orm'

import { db } from '../src/lib/database'
import { createLogger } from '../src/lib/logger'
import { account, session, user } from '../src/lib/schema'

const logger = createLogger('fresh-test-user-setup')

// Test users that need to be cleaned
const TEST_EMAILS = [
  'testcoach@ultracoach.dev',
  'testrunner@ultracoach.dev',
  'testcoach2@ultracoach.dev',
  'testrunner2@ultracoach.dev',
]

async function cleanTestUsers() {
  try {
    logger.info('🧹 Starting fresh test user cleanup...')

    // Delete all test user sessions first
    await db
      .delete(session)
      .where(sql`user_id IN (SELECT id FROM "user" WHERE email IN ${TEST_EMAILS})`)

    // Delete all test user accounts
    await db
      .delete(account)
      .where(sql`user_id IN (SELECT id FROM "user" WHERE email IN ${TEST_EMAILS})`)

    // Delete all test users
    const deletedUsers = await db
      .delete(user)
      .where(inArray(user.email, TEST_EMAILS))
      .returning({ email: user.email })

    logger.info('✅ Cleaned up existing test users:', {
      deletedCount: deletedUsers.length,
      emails: deletedUsers.map(u => u.email),
    })

    logger.info('🎯 Test users cleaned. Manual steps required:')
    logger.info('1. Start the dev server: pnpm dev')
    logger.info('2. Navigate to http://localhost:3000/auth/signup')
    logger.info('3. Create the following test accounts manually:')

    const testCredentials = [
      { email: 'testcoach@ultracoach.dev', password: 'TestCoach123!', role: 'coach' },
      { email: 'testrunner@ultracoach.dev', password: 'TestRunner123!', role: 'runner' },
    ]

    testCredentials.forEach((cred, i) => {
      logger.info(
        `   ${i + 1}. Email: ${cred.email} | Password: ${cred.password} | Role: ${cred.role}`
      )
    })

    logger.info('4. Then run the Playwright tests to verify authentication works')
  } catch (error) {
    logger.error('💥 Fresh test user cleanup failed:', error)
    process.exit(1)
  }
}

// Only run if called directly
if (import.meta.url.endsWith(process.argv[1])) {
  cleanTestUsers()
    .then(() => {
      logger.info('✨ Fresh test user cleanup completed')
      process.exit(0)
    })
    .catch(error => {
      logger.error('💥 Fresh test user cleanup script failed:', error)
      process.exit(1)
    })
}

export { cleanTestUsers }
