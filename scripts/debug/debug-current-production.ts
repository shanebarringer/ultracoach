#!/usr/bin/env tsx
/**
 * Debug Current Production Deployment
 *
 * Tests the latest production deployment with the new URL from user's error message
 */
import { config } from 'dotenv'
import { resolve } from 'path'

// Load production environment
config({ path: resolve(process.cwd(), '.env.local') })

const logger = console

async function debugCurrentProduction() {
  try {
    logger.log('🔍 Testing current production deployment...')

    // Use the production URL from the error message
    const productionUrl = 'https://ultracoach-inqa4cgvd-shane-hehims-projects.vercel.app'

    // Test 1: Health endpoint
    logger.log('1. Testing health endpoint...')
    try {
      const healthResponse = await fetch(`${productionUrl}/api/health`)
      logger.log('Health endpoint status:', healthResponse.status)

      if (healthResponse.ok) {
        const healthData = await healthResponse.json()
        logger.log('Health response:', healthData)
      } else {
        const errorText = await healthResponse.text()
        logger.log('Health error:', errorText)
      }
    } catch (healthError) {
      logger.error('Health endpoint failed:', healthError)
    }

    // Test 2: Check Better Auth configuration endpoint
    logger.log('2. Testing Better Auth configuration...')
    try {
      const configResponse = await fetch(`${productionUrl}/api/debug-auth`)
      logger.log('Debug auth endpoint status:', configResponse.status)

      if (configResponse.ok) {
        const configData = await configResponse.json()
        logger.log('Better Auth config:', configData)
      } else {
        const configError = await configResponse.text()
        logger.log('Debug auth error:', configError)
      }
    } catch (configError) {
      logger.error('Config endpoint failed:', configError)
    }

    // Test 3: Test signin endpoint with detailed error handling
    logger.log('3. Testing Better Auth signin endpoint...')
    try {
      const authResponse = await fetch(`${productionUrl}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'UltraCoach-Debug/2.0',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: 'sarah@ultracoach.dev',
          password: 'UltraCoach2025!',
        }),
      })

      logger.log('Auth endpoint status:', authResponse.status)
      logger.log('Auth endpoint statusText:', authResponse.statusText)
      logger.log('Auth response headers:', Object.fromEntries(authResponse.headers.entries()))

      // Try to get response text even if not ok
      const responseText = await authResponse.text()
      logger.log('Auth response body:', responseText)
    } catch (authError) {
      logger.error('Auth endpoint failed:', authError)
    }

    // Test 4: Check if the deployment has the latest code
    logger.log('4. Testing deployment version...')
    try {
      const versionResponse = await fetch(`${productionUrl}/api/simple-test`)
      logger.log('Version test status:', versionResponse.status)

      if (versionResponse.ok) {
        const versionData = await versionResponse.json()
        logger.log('Deployment info:', versionData)
      } else {
        const versionError = await versionResponse.text()
        logger.log('Version error:', versionError)
      }
    } catch (versionError) {
      logger.error('Version check failed:', versionError)
    }
  } catch (error) {
    logger.error('❌ Production debugging failed:', error)
  }
}

// Run the test
debugCurrentProduction()
  .then(() => {
    logger.log('✅ Production debugging completed')
  })
  .catch(error => {
    logger.error('❌ Fatal error in production debugging:', error)
    process.exit(1)
  })
