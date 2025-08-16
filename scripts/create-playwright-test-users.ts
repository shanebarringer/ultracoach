#!/usr/bin/env tsx
/**
 * Create Playwright Test Users
 *
 * Creates the specific users that Playwright tests expect
 */
import { config } from 'dotenv'
import { eq, sql } from 'drizzle-orm'
import { resolve } from 'path'

import { db } from '../src/lib/database'
import { createLogger } from '../src/lib/logger'
import { account, user } from '../src/lib/schema'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

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
    logger.info('🎭 Creating Playwright test users...')

    // Clean up existing users first
    for (const userData of PLAYWRIGHT_USERS) {
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

    // Create users via Better Auth API
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
            role: userData.role,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          logger.error(`Failed to create ${userData.email}: HTTP ${response.status}: ${errorText}`)
          continue
        }

        logger.info(`✅ Created user: ${userData.email} (${userData.role})`)
        successCount++
      } catch (error) {
        logger.error(`Error creating ${userData.email}:`, error)
      }
    }

    // Fix role and userType mapping in database
    logger.info('🔧 Fixing role and userType mapping...')

    // Fix coaches
    await db
      .update(user)
      .set({ role: 'user', userType: 'coach' })
      .where(sql`email IN ('sarah@ultracoach.dev', 'marcus@ultracoach.dev')`)

    // Fix runners
    await db
      .update(user)
      .set({ role: 'user', userType: 'runner' })
      .where(sql`email IN ('alex.rivera@ultracoach.dev', 'riley.parker@ultracoach.dev')`)

    logger.info(`🎉 Created ${successCount}/${PLAYWRIGHT_USERS.length} Playwright test users`)

    // Verify final state
    const finalUsers = await db
      .select()
      .from(user)
      .where(
        sql`email IN ('sarah@ultracoach.dev', 'marcus@ultracoach.dev', 'alex.rivera@ultracoach.dev', 'riley.parker@ultracoach.dev')`
      )

    logger.info('🔍 Final verification:')
    for (const user of finalUsers) {
      logger.info(`  - ${user.email}: role=${user.role}, userType=${user.userType}`)
    }
  } catch (error) {
    logger.error('💥 Error creating Playwright users:', error)
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
