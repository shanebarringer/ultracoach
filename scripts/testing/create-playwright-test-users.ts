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
const COACH_EMAIL = process.env.TEST_COACH_EMAIL || 'sarah@ultracoach.dev'
const COACH_PASSWORD = process.env.TEST_COACH_PASSWORD || 'UltraCoach2025!'
const RUNNER_PASSWORD = process.env.TEST_RUNNER_PASSWORD || 'RunnerPass2025!'

const PLAYWRIGHT_USERS = [
  {
    email: COACH_EMAIL,
    password: COACH_PASSWORD,
    name: 'Sarah',
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

    // Check for existing users and create only if needed (idempotent approach)
    logger.info('👥 Ensuring test users exist (idempotent)...')

    let createdCount = 0
    let existingCount = 0

    for (const userData of PLAYWRIGHT_USERS) {
      const existingUser = await db
        .select()
        .from(user)
        .where(eq(user.email, userData.email))
        .limit(1)

      if (existingUser.length > 0) {
        // User already exists - verify role/userType is correct
        existingCount++
        logger.info(`✅ User already exists: ${userData.email}`)

        // Ensure role and userType are correct (in case of data inconsistency)
        const currentUser = existingUser[0]
        if (currentUser.role !== 'user' || currentUser.userType !== userData.role) {
          logger.info(
            `🔧 Fixing role/userType for ${userData.email}: role=${currentUser.role}→user, userType=${currentUser.userType}→${userData.role}`
          )
          await db
            .update(user)
            .set({ role: 'user', userType: userData.role })
            .where(eq(user.email, userData.email))
        }
      } else {
        // User doesn't exist - create via Better Auth API
        const result = await createSingleUser(userData)

        if (result.success) {
          logger.info(`✅ Created user: ${result.email} (${result.role})`)
          createdCount++
        } else {
          logger.error(`❌ Failed to create ${userData.email}: ${result.error}`)

          // In CI, fail fast on user creation errors
          if (process.env.CI) {
            logger.error('CI environment detected - failing fast on user creation error')
            process.exit(1)
          }
        }
      }
    }

    logger.info(
      `🎉 Test users ready: ${existingCount} existing, ${createdCount} newly created (${existingCount + createdCount}/${PLAYWRIGHT_USERS.length} total)`
    )

    // Fix role and userType mapping in database (Better Auth compatibility)
    logger.info('🔧 Ensuring proper Better Auth role and userType mapping...')

    // Fix coaches - Better Auth uses role: 'user', our app differentiates with userType
    await db
      .update(user)
      .set({ role: 'user', userType: 'coach' })
      .where(eq(user.email, COACH_EMAIL))

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
        sql`email IN (${COACH_EMAIL}, 'alex.rivera@ultracoach.dev', 'riley.parker@ultracoach.dev')`
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

    // Enhanced debugging for coach user specifically
    const coachUser = finalUsers.find(u => u.email === COACH_EMAIL)
    if (coachUser) {
      logger.info('🎯 Coach user detailed verification:', {
        id: coachUser.id,
        email: coachUser.email,
        name: coachUser.name,
        role: coachUser.role,
        userType: coachUser.userType,
        createdAt: coachUser.createdAt,
        updatedAt: coachUser.updatedAt,
        emailVerified: coachUser.emailVerified,
      })
    } else {
      logger.error(`❌ Coach user (${COACH_EMAIL}) not found in final verification!`)
    }

    // Create coach-runner relationships for testing (idempotent)
    logger.info('🔗 Ensuring coach-runner relationships exist...')

    const coachId = finalUsers.find(u => u.email === COACH_EMAIL)?.id
    const alexId = finalUsers.find(u => u.email === 'alex.rivera@ultracoach.dev')?.id
    const rileyId = finalUsers.find(u => u.email === 'riley.parker@ultracoach.dev')?.id

    if (coachId && alexId && rileyId) {
      // Check existing relationships before creating
      const existingRelationships = await db.execute(sql`
        SELECT coach_id, runner_id, status
        FROM coach_runners
        WHERE coach_id = ${coachId}
        AND runner_id IN (${alexId}, ${rileyId})
      `)

      const existingCount = Array.isArray(existingRelationships)
        ? existingRelationships.length
        : existingRelationships.rowCount || 0

      logger.info(`🔍 Found ${existingCount} existing relationships for coach ${COACH_EMAIL}`)

      // Create relationships via SQL (ON CONFLICT DO NOTHING handles duplicates)
      const insertResult = await db.execute(sql`
        INSERT INTO coach_runners (id, coach_id, runner_id, status, relationship_type, invited_by, relationship_started_at, created_at, updated_at)
        VALUES
          (gen_random_uuid(), ${coachId}, ${alexId}, 'active', 'standard', 'coach', NOW(), NOW(), NOW()),
          (gen_random_uuid(), ${coachId}, ${rileyId}, 'active', 'standard', 'coach', NOW(), NOW(), NOW())
        ON CONFLICT DO NOTHING
      `)

      // Verify final state
      const finalRelationships = await db.execute(sql`
        SELECT coach_id, runner_id, status
        FROM coach_runners
        WHERE coach_id = ${coachId}
      `)

      const finalCount = Array.isArray(finalRelationships)
        ? finalRelationships.length
        : finalRelationships.rowCount || 0

      logger.info(
        `✅ Relationships ready: ${finalCount} total for ${COACH_EMAIL} (${COACH_EMAIL} -> alex.rivera@ultracoach.dev, ${COACH_EMAIL} -> riley.parker@ultracoach.dev)`
      )

      if (finalCount < 2) {
        logger.error(
          `⚠️  WARNING: Expected 2 relationships but found ${finalCount}. Tests may fail with "no runner cards" error.`
        )
        if (process.env.CI) {
          logger.error('CI environment requires relationships to be created')
          process.exit(1)
        }
      }
    } else {
      logger.error('❌ Cannot create relationships - missing user IDs:', {
        coachId: coachId || 'MISSING',
        alexId: alexId || 'MISSING',
        rileyId: rileyId || 'MISSING',
      })

      if (process.env.CI) {
        logger.error('CI environment requires all test users to exist')
        process.exit(1)
      }
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
