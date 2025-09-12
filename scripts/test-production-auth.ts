#!/usr/bin/env tsx
/**
 * Test authentication against production
 */
import { createLogger } from '../src/lib/logger'

const logger = createLogger('test-production-auth')

async function testAuth() {
  const prodUrl = 'https://ultracoach.vercel.app'

  logger.info('Testing authentication against production...')

  try {
    // Try to sign in with test credentials
    const response = await fetch(`${prodUrl}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'emma@ultracoach.dev',
        password: 'Test123!@#',
      }),
    })

    const responseText = await response.text()
    logger.info('Response status:', response.status)
    logger.info('Response headers:', Object.fromEntries(response.headers.entries()))

    if (response.ok) {
      try {
        const data = JSON.parse(responseText)
        logger.info('✅ Authentication successful!', data)
      } catch {
        logger.info('Response (non-JSON):', responseText)
      }
    } else {
      logger.error('❌ Authentication failed')
      logger.error('Response:', responseText)

      // Try to parse error
      try {
        const error = JSON.parse(responseText)
        logger.error('Error details:', error)
      } catch {
        logger.error('Raw response:', responseText)
      }
    }
  } catch (error) {
    logger.error('Network error:', error)
  }
}

testAuth()
  .then(() => {
    logger.info('Test complete')
    process.exit(0)
  })
  .catch(error => {
    logger.error('Test failed:', error)
    process.exit(1)
  })
