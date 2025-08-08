#!/usr/bin/env tsx
/**
 * Better Auth Test User Creation Script
 *
 * This script creates test users using Better Auth's sign-up API to ensure
 * proper authentication works for Playwright E2E testing.
 */
import { auth } from '../src/lib/better-auth'
import { createLogger } from '../src/lib/logger'

const logger = createLogger('create-test-users')

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

async function createTestUsers() {
  try {
    logger.info('🧪 Starting Better Auth test user creation...')

    for (const testUser of TEST_USERS) {
      try {
        logger.info(`Creating test user: ${testUser.email} (${testUser.role})`)

        // Use Better Auth sign-up API to create user properly
        const result = await auth.api.signUpEmail({
          body: {
            email: testUser.email,
            password: testUser.password,
            name: testUser.name,
            // Better Auth additional fields
            role: testUser.role,
            fullName: testUser.fullName,
          },
          // Mock a request object
          headers: new Headers(),
          query: {},
        })

        if (result.user) {
          logger.info(`✅ Successfully created test user: ${testUser.email}`, {
            userId: result.user.id,
            role: result.user.role,
            email: result.user.email,
          })
        } else {
          logger.warn(`⚠️  User creation may have failed for ${testUser.email}:`, result)
        }
      } catch (error: any) {
        if (error.message && error.message.includes('User already exists')) {
          logger.info(`Test user ${testUser.email} already exists, skipping...`)
        } else {
          logger.error(`❌ Failed to create test user ${testUser.email}:`, error)
          // Continue with other users instead of failing completely
        }
      }
    }

    logger.info('🎉 Better Auth test user creation completed!')
  } catch (error) {
    logger.error('💥 Better Auth test user creation failed:', error)
    process.exit(1)
  }
}

// Only run if called directly
if (import.meta.url.endsWith(process.argv[1])) {
  createTestUsers()
    .then(() => {
      logger.info('✨ Better Auth test user creation script completed')
      process.exit(0)
    })
    .catch(error => {
      logger.error('💥 Better Auth test user creation script failed:', error)
      process.exit(1)
    })
}

export { createTestUsers, TEST_USERS }
