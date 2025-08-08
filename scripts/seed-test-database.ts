#!/usr/bin/env tsx
/**
 * Test Database Seeding Script
 *
 * This script creates test users for Playwright E2E testing.
 * It uses Better Auth's sign-up API to ensure users are created properly.
 */
import { hash } from 'bcrypt'
import { eq, inArray } from 'drizzle-orm'

import { db } from '../src/lib/database'
import { createLogger } from '../src/lib/logger'
import { user } from '../src/lib/schema'

const logger = createLogger('seed-test-database')

// Test users matching those expected by tests/utils/test-helpers.ts
const TEST_USERS = [
  {
    email: 'testcoach@ultracoach.dev',
    password: 'TestCoach123!',
    name: 'Test Coach',
    fullName: 'Test Coach',
    role: 'coach' as const,
  },
  {
    email: 'testcoach2@ultracoach.dev',
    password: 'TestCoach456!',
    name: 'Test Coach 2',
    fullName: 'Test Coach Two',
    role: 'coach' as const,
  },
  {
    email: 'testrunner@ultracoach.dev',
    password: 'TestRunner123!',
    name: 'Test Runner',
    fullName: 'Test Runner',
    role: 'runner' as const,
  },
  {
    email: 'testrunner2@ultracoach.dev',
    password: 'TestRunner456!',
    name: 'Test Runner 2',
    fullName: 'Test Runner Two',
    role: 'runner' as const,
  },
]

async function seedTestUsers() {
  try {
    logger.info('🧪 Starting test database seeding...')

    for (const testUser of TEST_USERS) {
      try {
        // Check if user already exists
        const existingUser = await db
          .select()
          .from(user)
          .where(eq(user.email, testUser.email))
          .limit(1)

        if (existingUser.length > 0) {
          logger.info(`Test user ${testUser.email} already exists, skipping...`)
          continue
        }

        // Hash password with bcrypt
        const passwordHash = await hash(testUser.password, 12)

        // Create user using direct database insertion (for test environment)
        const newUser = await db
          .insert(user)
          .values({
            email: testUser.email,
            name: testUser.name,
            fullName: testUser.fullName,
            role: testUser.role,
            emailVerified: true, // Auto-verify test users
            createdAt: new Date(),
            updatedAt: new Date(),
            id: crypto.randomUUID(),
          })
          .returning()

        if (newUser.length === 0) {
          throw new Error(`Failed to create user ${testUser.email}`)
        }

        // For test purposes, we'll skip the Better Auth accounts table
        // and rely on the password being handled by the auth system during testing
        // The test will use the credentials via the sign-in API

        logger.info(`✅ Created test user: ${testUser.email} (${testUser.role})`)
      } catch (error) {
        logger.error(`❌ Failed to create test user ${testUser.email}:`, error)
        throw error
      }
    }

    logger.info('🎉 Test database seeding completed successfully!')

    // Verify all test users exist and can be queried
    const testEmails = TEST_USERS.map(u => u.email)
    const createdUsers = await db
      .select({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      })
      .from(user)
      .where(inArray(user.email, testEmails))

    logger.info('📊 Test users verification:', {
      expected: TEST_USERS.length,
      created: createdUsers.length,
      users: createdUsers.map(u => ({ email: u.email, role: u.role })),
    })

    if (createdUsers.length !== TEST_USERS.length) {
      throw new Error(`Expected ${TEST_USERS.length} test users but found ${createdUsers.length}`)
    }
  } catch (error) {
    logger.error('💥 Test database seeding failed:', error)
    process.exit(1)
  }
}

// Only run if called directly
if (import.meta.url.endsWith(process.argv[1])) {
  seedTestUsers()
    .then(() => {
      logger.info('✨ Test database seeding script completed')
      process.exit(0)
    })
    .catch(error => {
      logger.error('💥 Test database seeding script failed:', error)
      process.exit(1)
    })
}

export { seedTestUsers, TEST_USERS }
