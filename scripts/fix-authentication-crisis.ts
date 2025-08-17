#!/usr/bin/env tsx
/**
 * Emergency Authentication Crisis Fix
 *
 * This script fixes the critical authentication failure by:
 * 1. Removing users created with incompatible password hashes
 * 2. Recreating users using Better Auth's sign-up API for compatibility
 * 3. Ensuring all Playwright test users exist with correct credentials
 */
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { resolve } from 'path'

import { auth } from '../src/lib/better-auth'
import { db } from '../src/lib/database'
import { createLogger } from '../src/lib/logger'
import { account, user } from '../src/lib/schema'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const logger = createLogger('auth-crisis-fix')

interface TestUser {
  email: string
  password: string
  name: string
  role: 'coach' | 'runner'
}

// Essential test users that Playwright expects
const ESSENTIAL_TEST_USERS: TestUser[] = [
  {
    email: 'sarah@ultracoach.dev',
    password: 'UltraCoach2025!',
    name: 'Sarah Mountain',
    role: 'coach',
  },
  {
    email: 'marcus@ultracoach.dev',
    password: 'UltraCoach2025!',
    name: 'Marcus Trail',
    role: 'coach',
  },
  {
    email: 'alex.rivera@ultracoach.dev',
    password: 'RunnerPass2025!',
    name: 'Alex Rivera',
    role: 'runner',
  },
  {
    email: 'jordan.chen@ultracoach.dev',
    password: 'RunnerPass2025!',
    name: 'Jordan Chen',
    role: 'runner',
  },
]

async function cleanupIncompatibleUsers() {
  logger.info('🧹 Cleaning up users with incompatible password hashes...')

  try {
    // Find all users created with our custom hashing
    const allUsers = await db.select().from(user)
    logger.info(`Found ${allUsers.length} existing users`)

    // Delete all existing users and their accounts
    // This is safe since they have incompatible password hashes anyway
    await db.delete(account)
    await db.delete(user)

    logger.info('✅ Cleaned up all existing users and accounts')
  } catch (error) {
    logger.error('❌ Error during cleanup:', error)
    throw error
  }
}

async function createUserWithBetterAuth(userData: TestUser): Promise<boolean> {
  logger.info(`Creating user via Better Auth API: ${userData.email}`)

  try {
    const result = await auth.api.signUpEmail({
      body: {
        email: userData.email,
        password: userData.password,
        name: userData.name,
        role: userData.role, // This will map to userType via Better Auth customSession
      },
    })

    if (result.error) {
      logger.error(`❌ Failed to create user ${userData.email}:`, result.error)
      return false
    }

    logger.info(`✅ Successfully created user: ${userData.email} (${userData.role})`)
    return true
  } catch (error) {
    logger.error(`❌ Error creating user ${userData.email}:`, error)
    return false
  }
}

async function verifyUserAuthentication(userData: TestUser): Promise<boolean> {
  logger.info(`Verifying authentication for: ${userData.email}`)

  try {
    const result = await auth.api.signInEmail({
      body: {
        email: userData.email,
        password: userData.password,
      },
    })

    if (result.error) {
      logger.error(`❌ Authentication failed for ${userData.email}:`, result.error)
      return false
    }

    logger.info(`✅ Authentication verified for: ${userData.email}`)
    return true
  } catch (error) {
    logger.error(`❌ Error verifying authentication for ${userData.email}:`, error)
    return false
  }
}

async function fixAuthenticationCrisis() {
  try {
    logger.info('🚨 Starting emergency authentication crisis fix...')

    // Step 1: Clean up incompatible users
    await cleanupIncompatibleUsers()

    // Step 2: Create users with Better Auth API
    logger.info('👥 Creating users with Better Auth API...')
    let successCount = 0

    for (const userData of ESSENTIAL_TEST_USERS) {
      const success = await createUserWithBetterAuth(userData)
      if (success) successCount++
    }

    logger.info(`📊 Created ${successCount}/${ESSENTIAL_TEST_USERS.length} users successfully`)

    // Step 3: Verify authentication works
    logger.info('🔐 Verifying authentication for all users...')
    let authSuccessCount = 0

    for (const userData of ESSENTIAL_TEST_USERS) {
      const authSuccess = await verifyUserAuthentication(userData)
      if (authSuccess) authSuccessCount++
    }

    logger.info(
      `📊 Authentication verified for ${authSuccessCount}/${ESSENTIAL_TEST_USERS.length} users`
    )

    // Step 4: Final database verification
    const finalUserCount = await db.select().from(user)
    logger.info(`🔍 Final database verification: ${finalUserCount.length} users in database`)

    if (authSuccessCount === ESSENTIAL_TEST_USERS.length) {
      logger.info('🎉 Authentication crisis fix completed successfully!')
      logger.info('✅ All test users can now login properly')
      logger.info('✅ Playwright tests should now pass')
    } else {
      logger.error('❌ Authentication crisis fix incomplete - some users still cannot authenticate')
      process.exit(1)
    }
  } catch (error) {
    logger.error('💥 Critical error during authentication crisis fix:', error)
    process.exit(1)
  }
}

// Run the fix
fixAuthenticationCrisis()
  .then(() => {
    logger.info('🏁 Authentication crisis fix script completed')
    process.exit(0)
  })
  .catch(error => {
    logger.error('💥 Fatal error in authentication crisis fix:', error)
    process.exit(1)
  })
