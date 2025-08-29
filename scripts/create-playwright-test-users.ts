#!/usr/bin/env tsx
/**
 * Create Playwright Test Users
 *
 * Creates the specific users that Playwright tests expect for CI/CD
 */
import { config } from 'dotenv'
import { eq, sql } from 'drizzle-orm'
import { resolve } from 'path'

import { db } from '../src/lib/database'
import { createLogger } from '../src/lib/logger'
import { account, user } from '../src/lib/schema'

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

const PLAYWRIGHT_USERS = [
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
    email: 'riley.parker@ultracoach.dev',
    password: 'RunnerPass2025!',
    name: 'Riley Parker',
    role: 'runner',
  },
]

async function createPlaywrightUsers() {
  try {
    logger.info('🎭 Creating Playwright test users for CI/CD...')

    // Check if server is running (important for CI)
    try {
      const healthCheck = await fetch('http://localhost:3001/api/health', {
        timeout: 5000,
      })
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

    // Create users via Better Auth API
    logger.info('👥 Creating test users via Better Auth API...')
    let successCount = 0
    for (const userData of PLAYWRIGHT_USERS) {
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
            userType: userData.role, // Use userType for Better Auth compatibility
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          logger.error(
            `❌ Failed to create ${userData.email}: HTTP ${response.status}: ${errorText}`
          )

          // In CI, we want to fail fast if user creation fails
          if (process.env.CI) {
            logger.error('CI environment detected - failing fast on user creation error')
            process.exit(1)
          }
          continue
        }

        logger.info(`✅ Created user: ${userData.email} (${userData.role})`)
        successCount++
      } catch (error) {
        logger.error(`❌ Error creating ${userData.email}:`, error)

        // In CI, fail fast on network errors
        if (process.env.CI) {
          logger.error('CI environment detected - failing fast on network error')
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
      .where(sql`email IN ('sarah@ultracoach.dev', 'marcus@ultracoach.dev')`)

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
        sql`email IN ('sarah@ultracoach.dev', 'marcus@ultracoach.dev', 'alex.rivera@ultracoach.dev', 'riley.parker@ultracoach.dev')`
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
      logger.info(`  ✅ ${user.email}: role=${user.role}, userType=${user.userType}`)
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
