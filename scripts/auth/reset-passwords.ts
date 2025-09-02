#!/usr/bin/env tsx
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { resolve } from 'path'

import { auth } from '../src/lib/better-auth'
import { db } from '../src/lib/database'
import { createLogger } from '../src/lib/logger'
import * as schema from '../src/lib/schema'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const logger = createLogger('reset-passwords')

// Test users with their passwords from .env.local
const testUsers = [
  {
    email: 'coach1@ultracoach.dev',
    password: 'password123',
  },
  {
    email: 'coach2@ultracoach.dev',
    password: process.env.TEST_COACH2_PASSWORD || 'password123',
  },
  {
    email: 'testrunner@ultracoach.dev',
    password: process.env.TEST_RUNNER_PASSWORD || 'password123',
  },
  {
    email: 'runner2@ultracoach.dev',
    password: process.env.TEST_RUNNER2_PASSWORD || 'password123',
  },
]

async function resetUserPasswords() {
  logger.info('🔐 Resetting user passwords with Better Auth...')

  for (const userData of testUsers) {
    try {
      logger.info(`Resetting password for: ${userData.email}`)

      // Get the user
      const [user] = await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.email, userData.email))
        .limit(1)

      if (!user) {
        logger.error(`User ${userData.email} not found`)
        continue
      }

      // Get the credential account
      const [account] = await db
        .select()
        .from(schema.account)
        .where(eq(schema.account.userId, user.id))
        .where(eq(schema.account.providerId, 'credential'))
        .limit(1)

      if (!account) {
        logger.error(`Credential account for ${userData.email} not found`)
        continue
      }

      // Hash password using Better Auth
      const hashedPassword = await auth.api.hashPassword({
        body: { password: userData.password },
      })

      if (hashedPassword.error) {
        logger.error(`Failed to hash password for ${userData.email}:`, hashedPassword.error)
        continue
      }

      // Update the account password
      await db
        .update(schema.account)
        .set({
          password: hashedPassword.data.hash,
          updatedAt: new Date(),
        })
        .where(eq(schema.account.id, account.id))

      logger.info(`✅ Reset password for: ${userData.email}`)
    } catch (error) {
      logger.error(`❌ Failed to reset password for ${userData.email}:`, error)
    }
  }
}

async function main() {
  try {
    await resetUserPasswords()
    logger.info('✅ Password reset completed')
    process.exit(0)
  } catch (error) {
    logger.error('❌ Password reset failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
