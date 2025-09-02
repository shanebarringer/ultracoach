#!/usr/bin/env tsx
/**
 * Test Better Auth API endpoints directly
 * This will test if the authentication issue is in the API layer
 */
import { config } from 'dotenv'
import { resolve } from 'path'

import { createLogger } from '../src/lib/logger'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const logger = createLogger('test-auth-api')

async function testAuthAPI() {
  logger.info('🔐 Testing Better Auth API endpoints...')

  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3001'
  const testCredentials = [
    { email: 'sarah@ultracoach.dev', password: 'UltraCoach2025!', role: 'coach' },
    { email: 'alex.rivera@ultracoach.dev', password: 'RunnerPass2025!', role: 'runner' },
  ]

  for (const creds of testCredentials) {
    logger.info(`Testing sign-in for ${creds.email} (${creds.role})...`)

    try {
      const signInResponse = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: creds.email,
          password: creds.password,
        }),
      })

      logger.info(`Sign-in response status: ${signInResponse.status}`)

      if (signInResponse.ok) {
        const responseData = await signInResponse.text()
        logger.info(`✅ Sign-in successful for ${creds.email}`)
        logger.info(`Response headers:`, Object.fromEntries(signInResponse.headers.entries()))
        logger.info(`Response data preview:`, responseData.substring(0, 200) + '...')
      } else {
        const errorText = await signInResponse.text()
        logger.error(
          `❌ Sign-in failed for ${creds.email}: ${signInResponse.status} ${signInResponse.statusText}`
        )
        logger.error(`Error response:`, errorText)
      }
    } catch (error) {
      logger.error(`❌ Network error testing ${creds.email}:`, error)
    }
  }

  // Test session endpoint
  logger.info('Testing session endpoint...')
  try {
    const sessionResponse = await fetch(`${baseUrl}/api/auth/get-session`, {
      method: 'GET',
    })
    logger.info(`Session endpoint status: ${sessionResponse.status}`)
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.text()
      logger.info(`Session response:`, sessionData.substring(0, 200) + '...')
    } else {
      logger.info(`No active session (expected): ${sessionResponse.status}`)
    }
  } catch (error) {
    logger.error(`❌ Session endpoint error:`, error)
  }
}

async function main() {
  try {
    await testAuthAPI()
    logger.info('✅ Auth API test completed')
  } catch (error) {
    logger.error('❌ Test failed:', error)
    process.exit(1)
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch(error => {
    logger.error('❌ Fatal error in test script:', error)
    process.exit(1)
  })
