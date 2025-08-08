#!/usr/bin/env tsx
/**
 * Better Auth Sign-In Test Script
 *
 * This script directly tests the Better Auth sign-in API to debug authentication issues.
 */
import { auth } from '../src/lib/better-auth'
import { createLogger } from '../src/lib/logger'

const logger = createLogger('test-better-auth-signin')

async function testBetterAuthSignIn() {
  try {
    logger.info('🔐 Testing Better Auth sign-in API...')

    const testCredentials = {
      email: 'testrunner@ultracoach.dev',
      password: 'TestRunner123!',
    }

    logger.info(`Attempting sign-in for: ${testCredentials.email}`)

    // Test Better Auth sign-in API directly
    const result = await auth.api.signInEmail({
      body: testCredentials,
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
      query: {},
    })

    if (result.user) {
      logger.info('✅ Sign-in successful!', {
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role,
        emailVerified: result.user.emailVerified,
      })

      if (result.session) {
        logger.info('📋 Session created:', {
          sessionId: result.session.id,
          expiresAt: result.session.expiresAt,
        })
      }
    } else {
      logger.error('❌ Sign-in failed - no user returned:', result)
    }
  } catch (error: any) {
    logger.error('💥 Better Auth sign-in test failed:', error)

    // Log detailed error information
    if (error.message) {
      logger.error('Error message:', error.message)
    }
    if (error.cause) {
      logger.error('Error cause:', error.cause)
    }

    process.exit(1)
  }
}

// Only run if called directly
if (import.meta.url.endsWith(process.argv[1])) {
  testBetterAuthSignIn()
    .then(() => {
      logger.info('✨ Better Auth sign-in test completed')
      process.exit(0)
    })
    .catch(error => {
      logger.error('💥 Better Auth sign-in test script failed:', error)
      process.exit(1)
    })
}

export { testBetterAuthSignIn }
