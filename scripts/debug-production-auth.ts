#!/usr/bin/env tsx
/**
 * Debug Production Authentication Issues
 *
 * This script tests the production authentication API to identify 500 errors
 */
import { config } from 'dotenv'
import { resolve } from 'path'

// Load production environment
config({ path: resolve(process.cwd(), '.env.local') })

const logger = console

async function testProductionAuth() {
  try {
    logger.log('🔍 Testing production authentication...')

    // Get the production URL from deployment
    const productionUrl = 'https://ultracoach-ecu67xlo5-shane-hehims-projects.vercel.app'

    // Test the health endpoint first
    logger.log('1. Testing health endpoint...')
    const healthResponse = await fetch(`${productionUrl}/api/health`)
    logger.log('Health endpoint status:', healthResponse.status)

    if (healthResponse.ok) {
      const healthData = await healthResponse.text()
      logger.log('Health response:', healthData)
    }

    // Test the Better Auth endpoint
    logger.log('2. Testing Better Auth signin endpoint...')
    const authResponse = await fetch(`${productionUrl}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'UltraCoach-Debug/1.0',
      },
      body: JSON.stringify({
        email: 'sarah@ultracoach.dev',
        password: 'UltraCoach2025!',
      }),
    })

    logger.log('Auth endpoint status:', authResponse.status)
    logger.log('Auth endpoint statusText:', authResponse.statusText)

    // Try to get response text even if not ok
    try {
      const responseText = await authResponse.text()
      logger.log('Auth response body:', responseText)
    } catch (textError) {
      logger.error('Could not read response text:', textError)
    }

    // Test the database connection via a simple API
    logger.log('3. Testing database connection via API...')
    const dbResponse = await fetch(`${productionUrl}/api/simple-test`)
    logger.log('DB test status:', dbResponse.status)

    if (dbResponse.ok) {
      const dbData = await dbResponse.text()
      logger.log('DB test response:', dbData)
    } else {
      const dbError = await dbResponse.text()
      logger.log('DB test error:', dbError)
    }
  } catch (error) {
    logger.error('❌ Production auth test failed:', error)
  }
}

// Run the test
testProductionAuth()
  .then(() => {
    logger.log('✅ Production auth test completed')
  })
  .catch(error => {
    logger.error('❌ Fatal error in production auth test:', error)
    process.exit(1)
  })
