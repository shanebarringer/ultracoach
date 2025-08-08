#!/usr/bin/env tsx
/**
 * Fix Test User Credentials Script
 *
 * This script adds credential accounts to existing test users so they can authenticate
 * with password via Better Auth for Playwright E2E testing.
 */
import { hash } from 'bcrypt'
import { eq, inArray } from 'drizzle-orm'

import { db } from '../src/lib/database'
import { createLogger } from '../src/lib/logger'
import { account, user } from '../src/lib/schema'

const logger = createLogger('fix-test-credentials')

// Test users credentials
const TEST_CREDENTIALS = [
  {
    email: 'testcoach@ultracoach.dev',
    password: 'TestCoach123!',
  },
  {
    email: 'testcoach2@ultracoach.dev',
    password: 'TestCoach456!',
  },
  {
    email: 'testrunner@ultracoach.dev',
    password: 'TestRunner123!',
  },
  {
    email: 'testrunner2@ultracoach.dev',
    password: 'TestRunner456!',
  },
]

async function fixTestUserCredentials() {
  try {
    logger.info('🔧 Starting test user credential fixes...')

    for (const testCred of TEST_CREDENTIALS) {
      try {
        // Find the user
        const existingUser = await db
          .select({ id: user.id, email: user.email })
          .from(user)
          .where(eq(user.email, testCred.email))
          .limit(1)

        if (existingUser.length === 0) {
          logger.warn(`User ${testCred.email} not found, skipping...`)
          continue
        }

        const userId = existingUser[0].id

        // Check if credential account already exists
        const existingAccount = await db
          .select()
          .from(account)
          .where(eq(account.userId, userId))
          .limit(1)

        if (existingAccount.length > 0) {
          logger.info(`Credential account for ${testCred.email} already exists, skipping...`)
          continue
        }

        // Hash password
        const passwordHash = await hash(testCred.password, 12)

        // Create credential account
        await db.insert(account).values({
          id: crypto.randomUUID(),
          accountId: 'credential',
          providerId: 'credential',
          userId: userId,
          password: passwordHash,
          accessToken: null,
          refreshToken: null,
          idToken: null,
          accessTokenExpiresAt: null,
          refreshTokenExpiresAt: null,
          scope: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        logger.info(`✅ Created credential account for: ${testCred.email}`)
      } catch (error) {
        logger.error(`❌ Failed to fix credentials for ${testCred.email}:`, error)
        throw error
      }
    }

    logger.info('🎉 Test user credential fixes completed successfully!')

    // Verify all test users have credentials
    const testEmails = TEST_CREDENTIALS.map(c => c.email)
    const verifyQuery = await db
      .select({
        email: user.email,
        userId: user.id,
        hasAccount: account.id,
      })
      .from(user)
      .leftJoin(account, eq(user.id, account.userId))
      .where(inArray(user.email, testEmails))

    logger.info('📊 Test user credential verification:', {
      users: verifyQuery.map(u => ({
        email: u.email,
        hasCredentials: u.hasAccount !== null,
      })),
    })
  } catch (error) {
    logger.error('💥 Test user credential fixing failed:', error)
    process.exit(1)
  }
}

// Only run if called directly
if (import.meta.url.endsWith(process.argv[1])) {
  fixTestUserCredentials()
    .then(() => {
      logger.info('✨ Test user credential fix script completed')
      process.exit(0)
    })
    .catch(error => {
      logger.error('💥 Test user credential fix script failed:', error)
      process.exit(1)
    })
}

export { fixTestUserCredentials }
