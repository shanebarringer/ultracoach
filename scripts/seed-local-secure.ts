#!/usr/bin/env tsx
/**
 * Secure Local Database Seeding Script
 *
 * Uses Better Auth sign-up API for proper password hashing compatibility.
 * Replaces the deprecated database-operations.ts approach.
 */
import { config } from 'dotenv'
import { eq, sql } from 'drizzle-orm'
import { resolve } from 'path'

import { db } from '../src/lib/database'
import { createLogger } from '../src/lib/logger'
import { account, user } from '../src/lib/schema'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const logger = createLogger('seed-local-secure')

const TEST_USERS = [
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
  {
    email: 'riley.parker@ultracoach.dev',
    password: 'RunnerPass2025!',
    name: 'Riley Parker',
    role: 'runner',
  },
]

async function cleanupExistingUsers() {
  logger.info('🧹 Cleaning up existing test users...')

  try {
    // Find and delete existing test users
    for (const userData of TEST_USERS) {
      const existingUser = await db
        .select()
        .from(user)
        .where(eq(user.email, userData.email))
        .limit(1)

      if (existingUser.length > 0) {
        const userId = existingUser[0].id
        await db.delete(account).where(eq(account.userId, userId))
        await db.delete(user).where(eq(user.id, userId))
        logger.info(`Cleaned up existing user: ${userData.email}`)
      }
    }

    logger.info('✅ Cleanup completed')
  } catch (error) {
    logger.error('❌ Error during cleanup:', error)
    throw error
  }
}

async function createUserWithBetterAuth(userData: (typeof TEST_USERS)[0]): Promise<boolean> {
  logger.info(`Creating user via Better Auth API: ${userData.email}`)

  try {
    const response = await fetch('http://localhost:3001/api/auth/sign-up/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        role: userData.role,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(`Failed to create ${userData.email}: HTTP ${response.status}: ${errorText}`)
      return false
    }

    logger.info(`✅ Created user: ${userData.email} (${userData.role})`)
    return true
  } catch (error) {
    logger.error(`Error creating ${userData.email}:`, error)
    return false
  }
}

async function fixRoleMapping() {
  logger.info('🔧 Fixing role and userType mapping...')

  try {
    // Fix coaches
    await db
      .update(user)
      .set({ role: 'user', userType: 'coach' })
      .where(sql`email IN ('sarah@ultracoach.dev', 'marcus@ultracoach.dev')`)

    // Fix runners
    await db
      .update(user)
      .set({ role: 'user', userType: 'runner' })
      .where(
        sql`email IN ('alex.rivera@ultracoach.dev', 'jordan.chen@ultracoach.dev', 'riley.parker@ultracoach.dev')`
      )

    logger.info('✅ Role mapping fixed')
  } catch (error) {
    logger.error('❌ Error fixing role mapping:', error)
    throw error
  }
}

async function verifyUsers() {
  logger.info('🔍 Verifying created users...')

  const finalUsers = await db
    .select()
    .from(user)
    .where(
      sql`email IN ('sarah@ultracoach.dev', 'marcus@ultracoach.dev', 'alex.rivera@ultracoach.dev', 'jordan.chen@ultracoach.dev', 'riley.parker@ultracoach.dev')`
    )

  logger.info('Final verification:')
  for (const user of finalUsers) {
    logger.info(`  - ${user.email}: role=${user.role}, userType=${user.userType}`)
  }

  return finalUsers.length
}

async function seedLocalDatabase() {
  try {
    logger.info('🌱 Starting secure local database seeding...')

    // Check if dev server is running
    try {
      const healthCheck = await fetch('http://localhost:3001')
      if (!healthCheck.ok) {
        throw new Error('Dev server not responding')
      }
    } catch (error) {
      logger.error('❌ Dev server not running on localhost:3001')
      logger.error('   Please run "pnpm dev" first, then run this script')
      process.exit(1)
    }

    // Step 1: Clean up existing users
    await cleanupExistingUsers()

    // Step 2: Create users with Better Auth API
    logger.info('👥 Creating users with Better Auth API...')
    let successCount = 0

    for (const userData of TEST_USERS) {
      const success = await createUserWithBetterAuth(userData)
      if (success) successCount++
    }

    logger.info(`📊 Created ${successCount}/${TEST_USERS.length} users successfully`)

    // Step 3: Fix role mapping
    await fixRoleMapping()

    // Step 4: Verify final state
    const finalUserCount = await verifyUsers()

    if (finalUserCount === TEST_USERS.length) {
      logger.info('🎉 Local database seeding completed successfully!')
      logger.info('✅ All test users created with proper Better Auth compatibility')
      logger.info('✅ Authentication should work properly now')
    } else {
      logger.error(
        `❌ Seeding incomplete - expected ${TEST_USERS.length} users, got ${finalUserCount}`
      )
      process.exit(1)
    }
  } catch (error) {
    logger.error('💥 Critical error during local database seeding:', error)
    process.exit(1)
  }
}

// Run the seeding
seedLocalDatabase()
  .then(() => {
    logger.info('🏁 Local database seeding script completed')
    process.exit(0)
  })
  .catch(error => {
    logger.error('💥 Fatal error in local seeding:', error)
    process.exit(1)
  })
