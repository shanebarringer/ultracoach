#!/usr/bin/env tsx
/**
 * Debug CI Environment
 *
 * Diagnose CI environment issues for test user creation
 */
import { createLogger } from '../src/lib/logger'

const logger = createLogger('debug-ci-environment')

async function debugCIEnvironment() {
  try {
    logger.info('🔍 Debugging CI Environment...')

    // 1. Check environment variables
    logger.info('Environment Variables:')
    logger.info(`- NODE_ENV: ${process.env.NODE_ENV}`)
    logger.info(`- CI: ${process.env.CI}`)
    logger.info(`- DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`)
    logger.info(
      `- BETTER_AUTH_SECRET: ${process.env.BETTER_AUTH_SECRET ? 'Set (' + process.env.BETTER_AUTH_SECRET.length + ' chars)' : 'Not set'}`
    )
    logger.info(`- BETTER_AUTH_URL: ${process.env.BETTER_AUTH_URL}`)
    logger.info(`- NEXT_PUBLIC_BASE_URL: ${process.env.NEXT_PUBLIC_BASE_URL}`)

    // 2. Test database connection
    logger.info('🗄️  Testing database connection...')
    try {
      const { db } = await import('../../src/lib/db')
      const result = await db.execute('SELECT 1 as test')
      logger.info('✅ Database connection successful')
    } catch (error) {
      logger.error('❌ Database connection failed:', error)
    }

    // 3. Test health endpoint
    logger.info('🏥 Testing health endpoint...')
    try {
      const healthResponse = await fetch('http://localhost:3001/api/health', {
        signal: AbortSignal.timeout(5000),
      })

      if (healthResponse.ok) {
        const healthData = await healthResponse.json()
        logger.info('✅ Health endpoint successful:', healthData)
      } else {
        logger.error(
          `❌ Health endpoint failed: ${healthResponse.status} ${healthResponse.statusText}`
        )
        const errorText = await healthResponse.text()
        logger.error('Error details:', errorText)
      }
    } catch (error) {
      logger.error('❌ Health endpoint request failed:', error.message)
    }

    // 4. Test Better Auth endpoint
    logger.info('🔐 Testing Better Auth endpoint...')
    try {
      // Just test if the endpoint is reachable (should return 405 for GET)
      const authResponse = await fetch('http://localhost:3001/api/auth/sign-up/email', {
        method: 'GET', // Wrong method, but should get a response
        signal: AbortSignal.timeout(5000),
      })

      logger.info(
        `Better Auth endpoint response: ${authResponse.status} ${authResponse.statusText}`
      )

      // Now test actual signup with minimal data
      logger.info('🧪 Testing Better Auth signup...')
      const signupResponse = await fetch('http://localhost:3001/api/auth/sign-up/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test-debug@example.com',
          password: 'TestPassword123!',
          name: 'Debug Test User',
          userType: 'runner',
        }),
        signal: AbortSignal.timeout(10000),
      })

      if (signupResponse.ok) {
        const signupData = await signupResponse.json()
        logger.info('✅ Better Auth signup successful:', { user: signupData.user?.email })
      } else {
        logger.error(
          `❌ Better Auth signup failed: ${signupResponse.status} ${signupResponse.statusText}`
        )
        const errorText = await signupResponse.text()
        logger.error('Signup error details:', errorText)
      }
    } catch (error) {
      logger.error('❌ Better Auth endpoint test failed:', error.message)
    }

    logger.info('🏁 CI Environment debugging completed')
  } catch (error) {
    logger.error('💥 Fatal error in CI debugging:', error)
    process.exit(1)
  }
}

debugCIEnvironment()
  .then(() => {
    logger.info('✅ Debug completed successfully')
    process.exit(0)
  })
  .catch(error => {
    logger.error('💥 Debug failed:', error)
    process.exit(1)
  })
