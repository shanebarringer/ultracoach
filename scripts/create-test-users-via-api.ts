#!/usr/bin/env tsx
import { eq } from 'drizzle-orm'

import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { account, user } from '@/lib/schema'

const logger = createLogger('create-test-users-via-api')

interface TestUser {
  email: string
  password: string
  name: string
  role: 'coach' | 'runner'
}

const TEST_USERS: TestUser[] = [
  {
    email: 'testrunner@ultracoach.dev',
    password: 'TestRunner123!',
    name: 'Test Runner',
    role: 'runner',
  },
  {
    email: 'testcoach@ultracoach.dev',
    password: 'TestCoach123!',
    name: 'Test Coach',
    role: 'coach',
  },
  {
    email: 'testrunner2@ultracoach.dev',
    password: 'TestRunner456!',
    name: 'Test Runner 2',
    role: 'runner',
  },
  {
    email: 'testcoach2@ultracoach.dev',
    password: 'TestCoach456!',
    name: 'Test Coach 2',
    role: 'coach',
  },
]

async function createTestUsers() {
  try {
    logger.info('Creating test users via Better Auth API...')
    logger.info('Make sure the dev server is running on port 3001 first!')

    // Check if server is running
    try {
      const healthCheck = await fetch('http://localhost:3001/')
      if (!healthCheck.ok) {
        logger.error('Server not accessible. Please run: pnpm dev')
        process.exit(1)
      }
    } catch (error) {
      logger.error('Server not running. Please run: pnpm dev')
      process.exit(1)
    }

    // Clean up existing test users first
    logger.info('Cleaning up existing test users...')
    for (const testUser of TEST_USERS) {
      // Only select fields that exist in all schema versions for backwards compatibility
      const existingUser = await db
        .select({
          id: user.id,
          email: user.email,
        })
        .from(user)
        .where(eq(user.email, testUser.email))
        .limit(1)

      if (existingUser.length > 0) {
        const userId = existingUser[0].id
        await db.delete(account).where(eq(account.userId, userId))
        await db.delete(user).where(eq(user.id, userId))
        logger.info(`Cleaned up existing user: ${testUser.email}`)
      }
    }

    // Create users via API
    for (const testUser of TEST_USERS) {
      try {
        const response = await fetch('http://localhost:3001/api/auth/sign-up/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: testUser.email,
            password: testUser.password,
            name: testUser.name,
            role: testUser.role,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          logger.error(`Failed to create ${testUser.email}: HTTP ${response.status}: ${errorText}`)
          continue
        }

        const result = await response.json()
        logger.info(`✅ Created test user: ${testUser.email} (${testUser.role})`)

        // Fix: Better Auth may not be setting custom role field properly during signup
        // Let's manually update the role in the database as a workaround
        await db.update(user).set({ role: testUser.role }).where(eq(user.email, testUser.email))

        logger.info(`🔧 Updated role for ${testUser.email} to ${testUser.role}`)
      } catch (error) {
        logger.error(`Failed to create test user ${testUser.email}:`, error)
        continue
      }
    }

    logger.info('✅ Test user creation complete!')
    logger.info('Test users available for Playwright:')
    for (const testUser of TEST_USERS) {
      logger.info(`  - ${testUser.email} (${testUser.role}) - password: ${testUser.password}`)
    }
  } catch (error) {
    logger.error('Failed to create test users:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createTestUsers()
    .then(() => {
      logger.info('Test user creation completed successfully')
      process.exit(0)
    })
    .catch(error => {
      logger.error('Test user creation failed:', error)
      process.exit(1)
    })
}

export { createTestUsers }
