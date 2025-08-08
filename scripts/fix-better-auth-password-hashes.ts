#!/usr/bin/env tsx
/**
 * Fix Better Auth Password Hashes Script
 *
 * This script removes bcrypt hashes and recreates test users properly through Better Auth
 * to ensure password hashes are in the correct format.
 */
import { eq } from 'drizzle-orm'

import { auth } from '../src/lib/better-auth'
import { db } from '../src/lib/database'
import { createLogger } from '../src/lib/logger'
import { account, user } from '../src/lib/schema'

const logger = createLogger('fix-password-hashes')

// Test users credentials
const TEST_CREDENTIALS = [
  {
    email: 'testcoach@ultracoach.dev',
    password: 'TestCoach123!',
    name: 'Test Coach',
    fullName: 'Test Coach',
    role: 'coach' as const,
  },
  {
    email: 'testrunner@ultracoach.dev',
    password: 'TestRunner123!',
    name: 'Test Runner',
    fullName: 'Test Runner',
    role: 'runner' as const,
  },
]

async function fixPasswordHashes() {
  try {
    logger.info('🔧 Starting Better Auth password hash fixes...')

    for (const testCred of TEST_CREDENTIALS) {
      try {
        logger.info(`Processing user: ${testCred.email}`)

        // Delete existing user and all associated records (cascade will handle account/session)
        await db.delete(user).where(eq(user.email, testCred.email))

        logger.info(`Deleted existing user: ${testCred.email}`)

        // Create new user using Better Auth API (this ensures proper password hashing)
        const result = await auth.api.signUpEmail({
          body: {
            email: testCred.email,
            password: testCred.password,
            name: testCred.name,
            role: testCred.role,
            fullName: testCred.fullName,
          },
          headers: new Headers({ 'Content-Type': 'application/json' }),
          query: {},
        })

        if (result.user) {
          logger.info(`✅ Recreated user with Better Auth: ${testCred.email}`, {
            userId: result.user.id,
            role: result.user.role,
            emailVerified: result.user.emailVerified,
          })
        } else {
          logger.error(`❌ Failed to recreate user: ${testCred.email}`)
        }
      } catch (error: any) {
        if (error.message && error.message.includes('User already exists')) {
          logger.warn(`User ${testCred.email} already exists after recreation`)
        } else {
          logger.error(`❌ Failed to fix password hash for ${testCred.email}:`, error)
          throw error
        }
      }
    }

    logger.info('🎉 Better Auth password hash fixes completed!')

    // Verify all users can sign in
    logger.info('🔐 Verifying sign-in functionality...')
    for (const testCred of TEST_CREDENTIALS) {
      try {
        const signInResult = await auth.api.signInEmail({
          body: {
            email: testCred.email,
            password: testCred.password,
          },
          headers: new Headers({ 'Content-Type': 'application/json' }),
          query: {},
        })

        if (signInResult.user) {
          logger.info(`✅ Sign-in verified: ${testCred.email}`)
        } else {
          logger.error(`❌ Sign-in failed: ${testCred.email}`)
        }
      } catch (error) {
        logger.error(`❌ Sign-in verification failed for ${testCred.email}:`, error)
      }
    }
  } catch (error) {
    logger.error('💥 Better Auth password hash fixing failed:', error)
    process.exit(1)
  }
}

// Only run if called directly
if (import.meta.url.endsWith(process.argv[1])) {
  fixPasswordHashes()
    .then(() => {
      logger.info('✨ Better Auth password hash fix script completed')
      process.exit(0)
    })
    .catch(error => {
      logger.error('💥 Better Auth password hash fix script failed:', error)
      process.exit(1)
    })
}

export { fixPasswordHashes }
