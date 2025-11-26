#!/usr/bin/env tsx
/**
 * Create Playwright Test Users
 *
 * Creates the specific users that Playwright tests expect for CI/CD
 */
import { config } from 'dotenv'
import { eq, sql } from 'drizzle-orm'
import { resolve } from 'path'

import { db } from '../../src/lib/database'
import { createLogger } from '../../src/lib/logger'
import { account, user } from '../../src/lib/schema'

// Load environment variables - CI uses environment variables directly, not .env.local
if (process.env.NODE_ENV !== 'test') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs')
    const envPath = resolve(process.cwd(), '.env.local')
    if (fs.existsSync(envPath)) {
      config({ path: envPath })
    }
  } catch {
    // Silently continue if .env.local doesn't exist or can't be loaded
  }
}

const logger = createLogger('create-playwright-users')

/**
 * Create a single user via Better Auth API with timeout handling
 */
async function createSingleUser(userData: (typeof PLAYWRIGHT_USERS)[0]) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

  try {
    const response = await fetch('http://localhost:3001/api/auth/sign-up/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        userType: userData.role, // Use userType for Better Auth compatibility
      }),
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      // Sanitize error message to avoid exposing sensitive information in CI logs
      const sanitizedError =
        response.status === 400
          ? 'User already exists or validation failed'
          : response.status === 500
            ? 'Internal server error'
            : `HTTP ${response.status}`
      throw new Error(
        `${sanitizedError}${process.env.NODE_ENV === 'development' ? `: ${errorText}` : ''}`
      )
    }

    return { success: true, email: userData.email, role: userData.role }
  } catch (error) {
    clearTimeout(timeoutId)
    const errorMessage =
      error.name === 'AbortError'
        ? 'Request timeout after 10 seconds'
        : error.message || 'Unknown error'
    return { success: false, email: userData.email, error: errorMessage }
  }
}

// Use environment variables for passwords (with fallbacks for backwards compatibility)
const COACH_PASSWORD = process.env.TEST_COACH_PASSWORD || 'UltraCoach2025!'
const RUNNER_PASSWORD = process.env.TEST_RUNNER_PASSWORD || 'RunnerPass2025!'

const PLAYWRIGHT_USERS = [
  {
    email: 'emma@ultracoach.dev',
    password: COACH_PASSWORD,
    name: 'Emma Mountain',
    role: 'coach',
  },
  {
    email: 'alex.rivera@ultracoach.dev',
    password: RUNNER_PASSWORD,
    name: 'Alex Rivera',
    role: 'runner',
  },
  {
    email: 'riley.parker@ultracoach.dev',
    password: RUNNER_PASSWORD,
    name: 'Riley Parker',
    role: 'runner',
  },
]

async function createPlaywrightUsers() {
  try {
    logger.info('🎭 Creating Playwright test users for CI/CD...')

    // Check if server is running (important for CI)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const healthCheck = await fetch('http://localhost:3001/api/health', {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!healthCheck.ok) {
        logger.error('❌ Server health check failed. Application may not be ready.')
        process.exit(1)
      }
      logger.info('✅ Server health check passed')
    } catch (error) {
      logger.error('❌ Cannot reach server at http://localhost:3001')
      logger.error('Ensure the application is running before creating test users')
      process.exit(1)
    }

    // Clean up existing users first (handle foreign key constraints)
    logger.info('🧹 Cleaning up existing test users...')
    for (const userData of PLAYWRIGHT_USERS) {
      const existingUser = await db
        .select()
        .from(user)
        .where(eq(user.email, userData.email))
        .limit(1)

      if (existingUser.length > 0) {
        const userId = existingUser[0].id

        // Delete related records first to avoid foreign key constraint violations
        try {
          // Delete strava connections if they exist
          await db.execute(sql`DELETE FROM strava_connections WHERE user_id = ${userId}`)

          // Delete Better Auth account records
          await db.delete(account).where(eq(account.userId, userId))

          // Finally delete the user
          await db.delete(user).where(eq(user.id, userId))

          logger.info(`🗑️  Cleaned up existing user: ${userData.email}`)
        } catch (error) {
          logger.error(`Warning: Could not fully clean up ${userData.email}:`, error.message)
          // Continue with other users even if one fails to clean up
        }
      }
    }

    // Create users via Better Auth API (parallel for better performance)
    logger.info('👥 Creating test users via Better Auth API (parallel)...')

    // Create all users concurrently for better performance
    const userPromises = PLAYWRIGHT_USERS.map(userData => createSingleUser(userData))
    const results = await Promise.allSettled(userPromises)

    // Process results and handle errors appropriately
    let successCount = 0
    for (const [index, result] of results.entries()) {
      const userData = PLAYWRIGHT_USERS[index]

      if (result.status === 'fulfilled' && result.value.success) {
        logger.info(`✅ Created user: ${result.value.email} (${result.value.role})`)
        successCount++
      } else {
        const error = result.status === 'rejected' ? result.reason : result.value.error
        logger.error(`❌ Failed to create ${userData.email}: ${error}`)

        // In CI, we want to fail fast if user creation fails
        if (process.env.CI) {
          logger.error('CI environment detected - failing fast on user creation error')
          process.exit(1)
        }
      }
    }

    // Ensure all users were created successfully
    if (successCount !== PLAYWRIGHT_USERS.length) {
      logger.error(`❌ Only created ${successCount}/${PLAYWRIGHT_USERS.length} users`)
      if (process.env.CI) {
        logger.error('CI environment requires all test users to be created successfully')
        process.exit(1)
      }
    }

    // Fix role and userType mapping in database (Better Auth compatibility)
    logger.info('🔧 Ensuring proper Better Auth role and userType mapping...')

    // Fix coaches - Better Auth uses role: 'user', our app differentiates with userType
    await db
      .update(user)
      .set({ role: 'user', userType: 'coach' })
      .where(sql`email = 'emma@ultracoach.dev'`)

    // Fix runners
    await db
      .update(user)
      .set({ role: 'user', userType: 'runner' })
      .where(sql`email IN ('alex.rivera@ultracoach.dev', 'riley.parker@ultracoach.dev')`)

    logger.info(
      `🎉 Successfully created ${successCount}/${PLAYWRIGHT_USERS.length} Playwright test users`
    )

    // Final verification - ensure all required users exist with correct roles
    const finalUsers = await db
      .select()
      .from(user)
      .where(
        sql`email IN ('emma@ultracoach.dev', 'alex.rivera@ultracoach.dev', 'riley.parker@ultracoach.dev')`
      )

    if (finalUsers.length !== PLAYWRIGHT_USERS.length) {
      logger.error(
        `❌ Verification failed: Expected ${PLAYWRIGHT_USERS.length} users, found ${finalUsers.length}`
      )
      if (process.env.CI) {
        process.exit(1)
      }
    }

    logger.info('🔍 Final user verification (required for Playwright tests):')
    for (const user of finalUsers) {
      logger.info(`  ✅ ${user.email}: role=${user.role}, userType=${user.userType}, id=${user.id}`)
    }

    // Enhanced debugging for emma@ultracoach.dev specifically
    const emmaUser = finalUsers.find(u => u.email === 'emma@ultracoach.dev')
    if (emmaUser) {
      logger.info('🎯 Emma user detailed verification:', {
        id: emmaUser.id,
        email: emmaUser.email,
        name: emmaUser.name,
        role: emmaUser.role,
        userType: emmaUser.userType,
        createdAt: emmaUser.createdAt,
        updatedAt: emmaUser.updatedAt,
        emailVerified: emmaUser.emailVerified,
      })
    } else {
      logger.error('❌ Emma user not found in final verification!')
    }

    logger.info('🏆 All Playwright test users are ready for E2E testing!')
  } catch (error) {
    logger.error('💥 Fatal error creating Playwright users:', error)

    // Provide helpful debugging information
    logger.error('Debug information:')
    logger.error(`- NODE_ENV: ${process.env.NODE_ENV}`)
    logger.error(`- CI: ${process.env.CI}`)
    logger.error(`- DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`)
    logger.error(`- BETTER_AUTH_SECRET: ${process.env.BETTER_AUTH_SECRET ? 'Set' : 'Not set'}`)

    process.exit(1)
  }
}

createPlaywrightUsers()
  .then(() => {
    logger.info('🏁 Playwright user creation completed')
    process.exit(0)
  })
  .catch(error => {
    logger.error('💥 Fatal error:', error)
    process.exit(1)
  })
