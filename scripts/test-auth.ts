#!/usr/bin/env tsx
import { config } from 'dotenv'
import { resolve } from 'path'

import { createLogger } from '../src/lib/logger'

// Load environment variables from .env.local BEFORE importing anything that uses them
config({ path: resolve(process.cwd(), '.env.local') })

const logger = createLogger('auth-test')

async function testAuthentication() {
  logger.info('🧪 Testing Better Auth configuration...')

  try {
    // Import auth only after environment variables are loaded
    const { auth } = await import('../src/lib/better-auth')

    logger.info('✅ Better Auth imported successfully')

    // Test user authentication
    const testEmail = 'testcoach@ultracoach.dev'
    const testPassword = 'TestCoach123!'

    logger.info(`🔐 Testing authentication for: ${testEmail}`)

    try {
      const result = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      })

      if ('data' in result && result.data) {
        logger.info('✅ Authentication successful!', {
          userId: result.data.user.id,
          userEmail: result.data.user.email,
          userRole: result.data.user.role,
          sessionId: result.data.session.id,
          sessionToken: result.data.session.token ? 'Present' : 'Missing',
        })

        // Test session retrieval with the token
        const sessionTest = await auth.api.getSession({
          headers: {
            cookie: `better-auth.session_token=${result.data.session.token}`,
          },
        })

        if (sessionTest) {
          logger.info('✅ Session retrieval successful!', {
            sessionUserId: sessionTest.user.id,
            sessionValid: true,
          })
        } else {
          logger.error('❌ Session retrieval failed - this is the "hex string expected" issue!')
        }
      } else {
        logger.error('❌ Authentication failed:', result.error)
      }
    } catch (authError) {
      logger.error('❌ Authentication error:', {
        error: authError instanceof Error ? authError.message : 'Unknown error',
        stack: authError instanceof Error ? authError.stack : undefined,
      })

      if (authError instanceof Error && authError.message.includes('hex string expected')) {
        logger.error('🔍 This is the "hex string expected" error we\'re trying to fix!')
      }
    }
  } catch (error) {
    logger.error('❌ Failed to import Better Auth:', error)
  }
}

// Handle script execution
if (require.main === module) {
  testAuthentication()
    .then(() => {
      process.exit(0)
    })
    .catch(error => {
      logger.error('❌ Auth test failed:', error)
      process.exit(1)
    })
}

export { testAuthentication }
