#!/usr/bin/env tsx
/**
 * Debug Vercel Environment
 *
 * Test what environment variables are actually available in the Vercel serverless environment
 */
import { createLogger } from '../src/lib/logger'

const logger = createLogger('DebugVercelEnvironment')

async function debugVercelEnvironment() {
  logger.info('🔍 Testing Vercel serverless environment variables...')

  const PREVIEW_URL = 'https://ultracoach-hawqljwys-shane-hehims-projects.vercel.app'

  // Create a simple diagnostic endpoint test
  const testPayload = {
    timestamp: new Date().toISOString(),
    test: 'environment-debug',
  }

  try {
    // Test our diagnostic endpoint if it exists
    const debugUrl = `${PREVIEW_URL}/api/debug-auth`
    logger.info(`Testing diagnostic endpoint: ${debugUrl}`)

    const response = await fetch(debugUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'UltraCoach-Debug/1.0' },
    })

    logger.info('Response status:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
    })

    if (response.ok) {
      const data = await response.json()
      logger.info('✅ Environment diagnostics:', data)
      return { success: true, data }
    } else {
      const errorText = await response.text()
      logger.warn('❌ Diagnostic endpoint failed:', {
        status: response.status,
        error: errorText.substring(0, 200) + '...',
      })

      // If diagnostic endpoint doesn't exist, test environment by trying auth sign-in
      // and analyzing the specific error
      const authUrl = `${PREVIEW_URL}/api/auth/sign-in/email`
      logger.info('Testing auth endpoint for environment clues...')

      const authResponse = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'UltraCoach-Debug/1.0',
        },
        body: JSON.stringify({
          email: 'test@example.com', // Use fake credentials to avoid side effects
          password: 'fake-password',
        }),
      })

      logger.info('Auth endpoint response:', {
        status: authResponse.status,
        statusText: authResponse.statusText,
        headers: Object.fromEntries(authResponse.headers.entries()),
      })

      // The error details might give us clues about the environment issue
      if (authResponse.status === 500) {
        const authError = await authResponse.text()
        logger.info('Auth 500 error details:', authError.substring(0, 500))

        // Look for common environment-related error patterns
        if (authError.includes('BETTER_AUTH_SECRET')) {
          logger.error('❌ BETTER_AUTH_SECRET environment variable issue')
        }
        if (authError.includes('DATABASE_URL')) {
          logger.error('❌ DATABASE_URL environment variable issue')
        }
        if (authError.includes('VERCEL_URL')) {
          logger.error('❌ VERCEL_URL environment variable issue')
        }
        if (authError.includes('hex string expected')) {
          logger.error('❌ Better Auth session token parsing issue')
        }
      }
    }

    return { success: false }
  } catch (error) {
    logger.error('Debug test failed:', error instanceof Error ? error.message : error)
    return { success: false, error }
  }
}

// Run the debug test
debugVercelEnvironment()
  .then(result => {
    if (result.success) {
      logger.info('🎉 Environment debug successful!')
      process.exit(0)
    } else {
      logger.error('❌ Environment debug completed with issues')
      process.exit(1)
    }
  })
  .catch(error => {
    logger.error('🚨 Debug script error:', error)
    process.exit(1)
  })
