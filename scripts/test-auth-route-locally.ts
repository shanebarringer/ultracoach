#!/usr/bin/env tsx
/**
 * Test Auth Route Locally
 *
 * Tests the Better Auth route handler locally to ensure it works
 */
import { config } from 'dotenv'
import { resolve } from 'path'

// Load local environment
config({ path: resolve(process.cwd(), '.env.local') })

const logger = console

async function testAuthRouteLocally() {
  try {
    logger.log('🔍 Testing Better Auth route handler locally...')

    const localUrl = 'http://localhost:3000'

    // Test 1: Check basic auth endpoint
    logger.log('1. Testing basic auth endpoint...')
    try {
      const response = await fetch(`${localUrl}/api/auth`)
      logger.log('Local auth endpoint status:', response.status)

      const body = await response.text()
      logger.log('Local auth endpoint body:', body.substring(0, 200))
    } catch (error) {
      logger.error('Local auth endpoint failed:', error)
    }

    // Test 2: Test signin endpoint locally
    logger.log('2. Testing signin endpoint locally...')
    try {
      const response = await fetch(`${localUrl}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'sarah@ultracoach.dev',
          password: 'UltraCoach2025!',
        }),
      })

      logger.log('Local signin status:', response.status)
      logger.log('Local signin headers:', Object.fromEntries(response.headers.entries()))

      const body = await response.text()
      logger.log('Local signin body:', body)
    } catch (error) {
      logger.error('Local signin failed:', error)
    }

    // Test 3: Test session endpoint
    logger.log('3. Testing session endpoint locally...')
    try {
      const response = await fetch(`${localUrl}/api/auth/session`)
      logger.log('Local session status:', response.status)

      const body = await response.text()
      logger.log('Local session body:', body)
    } catch (error) {
      logger.error('Local session failed:', error)
    }
  } catch (error) {
    logger.error('❌ Local auth route testing failed:', error)
  }
}

// Run the test
testAuthRouteLocally()
  .then(() => {
    logger.log('✅ Local auth route testing completed')
  })
  .catch(error => {
    logger.error('❌ Fatal error in local auth route testing:', error)
    process.exit(1)
  })
