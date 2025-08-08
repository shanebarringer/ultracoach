#!/usr/bin/env tsx
/**
 * Fix Better Auth Password Hashes Direct Script
 *
 * This script directly updates password hashes using Better Auth's password utilities
 * without going through the API (which requires request context).
 */
import { hash } from 'better-auth/adapters'
import { eq, sql } from 'drizzle-orm'

import { db } from '../src/lib/database'
import { createLogger } from '../src/lib/logger'
import { account, user } from '../src/lib/schema'

const logger = createLogger('fix-password-hashes-direct')

// Test users credentials
const TEST_CREDENTIALS = [
  {
    email: 'testcoach@ultracoach.dev',
    password: 'TestCoach123!',
  },
  {
    email: 'testrunner@ultracoach.dev',
    password: 'TestRunner123!',
  },
]

async function fixPasswordHashesDirect() {
  try {
    logger.info('🔧 Starting Better Auth password hash fixes (direct)...')

    // First, get the account records for our test users
    for (const testCred of TEST_CREDENTIALS) {
      try {
        logger.info(`Processing password hash for: ${testCred.email}`)

        // Find the account record
        const accountRecord = await db
          .select({
            id: account.id,
            userId: account.userId,
          })
          .from(account)
          .innerJoin(user, eq(account.userId, user.id))
          .where(eq(user.email, testCred.email))
          .limit(1)

        if (accountRecord.length === 0) {
          logger.warn(`No account found for ${testCred.email}, skipping...`)
          continue
        }

        // Hash the password using Better Auth's hash function
        const betterAuthHash = await hash(testCred.password)

        logger.info(`Generated Better Auth hash for ${testCred.email}`, {
          hashLength: betterAuthHash.length,
          hashPrefix: betterAuthHash.substring(0, 16) + '...',
        })

        // Update the account record with the new hash
        await db
          .update(account)
          .set({
            password: betterAuthHash,
            updatedAt: new Date(),
          })
          .where(eq(account.id, accountRecord[0].id))

        logger.info(`✅ Updated password hash for: ${testCred.email}`)
      } catch (error) {
        logger.error(`❌ Failed to fix password hash for ${testCred.email}:`, error)
        throw error
      }
    }

    logger.info('🎉 Better Auth password hash fixes completed!')

    // Verify the hashes are now in the correct format
    logger.info('🔐 Verifying hash formats...')
    const verificationQuery = `
      SELECT u.email, a.password 
      FROM account a 
      JOIN "user" u ON a.user_id = u.id 
      WHERE u.email IN ('testcoach@ultracoach.dev', 'testrunner@ultracoach.dev')
    `

    const updatedHashes = await db.execute(sql`${verificationQuery}`)

    logger.info('Updated password hashes:', {
      hashes: updatedHashes.rows.map(row => ({
        email: row[0],
        hashFormat: typeof row[1] === 'string' ? `${row[1].substring(0, 16)}...` : 'null',
        hashLength: typeof row[1] === 'string' ? row[1].length : 0,
      })),
    })
  } catch (error) {
    logger.error('💥 Better Auth password hash fixing (direct) failed:', error)
    process.exit(1)
  }
}

// Only run if called directly
if (import.meta.url.endsWith(process.argv[1])) {
  fixPasswordHashesDirect()
    .then(() => {
      logger.info('✨ Better Auth password hash fix (direct) script completed')
      process.exit(0)
    })
    .catch(error => {
      logger.error('💥 Better Auth password hash fix (direct) script failed:', error)
      process.exit(1)
    })
}

export { fixPasswordHashesDirect }
