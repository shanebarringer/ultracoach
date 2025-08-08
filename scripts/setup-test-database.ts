#!/usr/bin/env tsx
import { and, eq } from 'drizzle-orm'

import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { account, user } from '@/lib/schema'

const logger = createLogger('setup-test-database')

// Generate Better Auth compatible random ID (32 characters, alphanumeric)
function generateBetterAuthId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

interface TestUser {
  email: string
  password: string
  name: string
  role: 'coach' | 'runner'
}

const TEST_USERS: TestUser[] = [
  {
    email: 'testrunner@ultracoach.dev',
    password: 'password123',
    name: 'Test Runner',
    role: 'runner',
  },
  {
    email: 'testcoach@ultracoach.dev',
    password: 'password123',
    name: 'Test Coach',
    role: 'coach',
  },
]

async function setupTestDatabase() {
  try {
    logger.info('Setting up test database with proper test users...')

    // Clean up existing test users first
    logger.info('Cleaning up existing test users...')
    for (const testUser of TEST_USERS) {
      // Find existing user
      const existingUser = await db
        .select()
        .from(user)
        .where(eq(user.email, testUser.email))
        .limit(1)

      if (existingUser.length > 0) {
        const userId = existingUser[0].id

        // Delete account records
        await db.delete(account).where(eq(account.userId, userId))

        // Delete user record
        await db.delete(user).where(eq(user.id, userId))

        logger.info(`Cleaned up existing user: ${testUser.email}`)
      }
    }

    // Create new test users using HTTP API to ensure proper Better Auth format
    logger.info('Creating new test users via Better Auth API...')
    for (const testUser of TEST_USERS) {
      try {
        // Make HTTP request to Better Auth signup endpoint
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
          logger.error(`HTTP ${response.status}: ${errorText}`)
          continue
        }

        const result = await response.json()
        logger.info(`✅ Created test user via API: ${testUser.email} (${testUser.role})`)
      } catch (error) {
        logger.error(`Failed to create test user ${testUser.email}:`, error)
        continue
      }
    }

    logger.info('✅ Test database setup complete!')
    logger.info('Test users available:')
    for (const testUser of TEST_USERS) {
      logger.info(`  - ${testUser.email} (${testUser.role}) - password: ${testUser.password}`)
    }
  } catch (error) {
    logger.error('Failed to set up test database:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupTestDatabase()
    .then(() => {
      logger.info('Setup completed successfully')
      process.exit(0)
    })
    .catch(error => {
      logger.error('Setup failed:', error)
      process.exit(1)
    })
}

export { setupTestDatabase }
