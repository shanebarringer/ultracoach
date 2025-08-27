#!/usr/bin/env tsx
/**
 * HTTP-based Test User Creation Script
 *
 * ⚠️  DEPRECATED: This script uses the old /api/user/role endpoint which has been removed.
 *
 * Use instead:
 * - scripts/create-test-users-better-auth-api.ts (for API-based user creation)
 * - scripts/create-test-users-automated.ts (for browser automation)
 *
 * This script creates test users by making direct HTTP requests to the Better Auth API
 */
import axios from 'axios'

import { createLogger } from '../src/lib/logger'

const logger = createLogger('create-test-users-http')

// Test users to create
const TEST_USERS = [
  {
    name: 'Test Coach',
    email: 'testcoach@ultracoach.dev',
    password: 'TestCoach123!',
    role: 'coach',
  },
  {
    name: 'Test Runner',
    email: 'testrunner@ultracoach.dev',
    password: 'TestRunner123!',
    role: 'runner',
  },
]

async function createTestUsersHttp() {
  try {
    logger.info('🌐 Starting HTTP-based test user creation...')

    const baseUrl = 'http://localhost:3001'
    const signUpUrl = `${baseUrl}/api/auth/sign-up/email`

    for (const testUser of TEST_USERS) {
      try {
        logger.info(`Creating user via HTTP: ${testUser.email} (${testUser.role})`)

        const response = await axios.post(signUpUrl, testUser, {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: 10000,
        })

        if (response.status === 200 || response.status === 201) {
          logger.info(`✅ Successfully created user: ${testUser.email}`, {
            userId: response.data?.user?.id,
            role: response.data?.user?.role,
          })

          // Set the role via the role API - we need to sign in first to get a session
          try {
            const signInResponse = await axios.post(
              `${baseUrl}/api/auth/sign-in/email`,
              {
                email: testUser.email,
                password: testUser.password,
              },
              {
                headers: { 'Content-Type': 'application/json' },
                timeout: 5000,
              }
            )

            if (signInResponse.status === 200) {
              // Extract session cookies and use them for the role update
              const cookies = signInResponse.headers['set-cookie']
              const roleResponse = await axios.post(
                `${baseUrl}/api/user/role`,
                {
                  role: testUser.role,
                },
                {
                  headers: {
                    'Content-Type': 'application/json',
                    Cookie: cookies?.join('; ') || '',
                  },
                  timeout: 5000,
                }
              )

              if (roleResponse.status === 200) {
                logger.info(`✅ Role set for ${testUser.email}: ${testUser.role}`)
              } else {
                logger.warn(`⚠️  Failed to set role for ${testUser.email}`)
              }
            }
          } catch (roleError) {
            logger.warn(`⚠️  Role assignment failed for ${testUser.email}:`, roleError)
          }
        } else {
          logger.warn(`⚠️  Unexpected response for ${testUser.email}:`, {
            status: response.status,
            data: response.data,
          })
        }
      } catch (error: any) {
        if (
          error.response?.status === 400 &&
          error.response?.data?.message?.includes('already exists')
        ) {
          logger.info(`User ${testUser.email} already exists, continuing...`)
        } else {
          logger.error(`❌ Failed to create user ${testUser.email}:`, {
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            data: error.response?.data,
          })
        }
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    logger.info('🎉 HTTP-based test user creation completed!')

    // Test sign-in for each user
    logger.info('🔐 Testing sign-in functionality...')
    const signInUrl = `${baseUrl}/api/auth/sign-in/email`

    for (const testUser of TEST_USERS) {
      try {
        const response = await axios.post(
          signInUrl,
          {
            email: testUser.email,
            password: testUser.password,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        )

        if (response.status === 200) {
          logger.info(`✅ Sign-in verified: ${testUser.email}`)
        } else {
          logger.warn(`⚠️  Sign-in issue for ${testUser.email}:`, response.status)
        }
      } catch (error: any) {
        logger.error(`❌ Sign-in failed for ${testUser.email}:`, {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
        })
      }
    }
  } catch (error) {
    logger.error('💥 HTTP-based test user creation failed:', error)
    process.exit(1)
  }
}

// Only run if called directly
if (import.meta.url.endsWith(process.argv[1])) {
  createTestUsersHttp()
    .then(() => {
      logger.info('✨ HTTP-based test user creation script completed')
      process.exit(0)
    })
    .catch(error => {
      logger.error('💥 HTTP-based test user creation script failed:', error)
      process.exit(1)
    })
}

export { createTestUsersHttp }
