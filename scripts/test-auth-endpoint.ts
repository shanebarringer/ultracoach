#!/usr/bin/env tsx
/**
 * Test Auth Endpoint
 *
 * Tests our new auth-test endpoint to isolate the Better Auth issue
 */
import { config } from 'dotenv'
import { resolve } from 'path'

// Load production environment
config({ path: resolve(process.cwd(), '.env.local') })

const logger = console

async function testAuthEndpoint() {
  try {
    logger.log('🔍 Testing auth-test endpoint...')

    const productionUrl = 'https://ultracoach-inqa4cgvd-shane-hehims-projects.vercel.app'

    // Test 1: GET request to check imports
    logger.log('1. Testing Better Auth imports...')
    try {
      const getResponse = await fetch(`${productionUrl}/api/auth-test`)
      logger.log('Auth test GET status:', getResponse.status)

      if (getResponse.ok) {
        const getData = await getResponse.json()
        logger.log('Auth test GET result:', JSON.stringify(getData, null, 2))
      } else {
        const getError = await getResponse.text()
        logger.log('Auth test GET error:', getError)
      }
    } catch (getError) {
      logger.error('Auth test GET failed:', getError)
    }

    // Test 2: POST request to test signin handler
    logger.log('2. Testing Better Auth signin handler...')
    try {
      const postResponse = await fetch(`${productionUrl}/api/auth-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'sarah@ultracoach.dev',
          password: 'UltraCoach2025!',
        }),
      })

      logger.log('Auth test POST status:', postResponse.status)
      logger.log('Auth test POST headers:', Object.fromEntries(postResponse.headers.entries()))

      const postBody = await postResponse.text()
      logger.log('Auth test POST body:', postBody)
    } catch (postError) {
      logger.error('Auth test POST failed:', postError)
    }
  } catch (error) {
    logger.error('❌ Auth endpoint testing failed:', error)
  }
}

// Run the test
testAuthEndpoint()
  .then(() => {
    logger.log('✅ Auth endpoint testing completed')
  })
  .catch(error => {
    logger.error('❌ Fatal error in auth endpoint testing:', error)
    process.exit(1)
  })
