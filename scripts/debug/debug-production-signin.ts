#!/usr/bin/env tsx
/**
 * Debug Production Signin Process
 *
 * This script tries to isolate the signin issue by testing different aspects
 */
import { config } from 'dotenv'
import { resolve } from 'path'

// Load production environment
config({ path: resolve(process.cwd(), '.env.local') })

const logger = console

async function debugProductionSignin() {
  try {
    logger.log('🔍 Debugging production signin process...')

    const productionUrl = 'https://ultracoach-inqa4cgvd-shane-hehims-projects.vercel.app'

    // Test 1: Check if user exists in database via our API
    logger.log('1. Checking if test user exists in production database...')
    try {
      const userResponse = await fetch(`${productionUrl}/api/users?email=sarah@ultracoach.dev`)
      logger.log('User check status:', userResponse.status)

      if (userResponse.ok) {
        const userData = await userResponse.json()
        logger.log('User data:', userData)
      } else {
        const userError = await userResponse.text()
        logger.log('User check error:', userError)
      }
    } catch (userError) {
      logger.error('User check failed:', userError)
    }

    // Test 2: Try different signin request formats
    logger.log('2. Testing different signin request formats...')

    // Format 1: Standard Better Auth format
    try {
      logger.log('2a. Testing standard Better Auth format...')
      const response1 = await fetch(`${productionUrl}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: 'sarah@ultracoach.dev',
          password: 'UltraCoach2025!',
        }),
      })

      logger.log('Format 1 - Status:', response1.status)
      logger.log('Format 1 - Headers:', Object.fromEntries(response1.headers.entries()))

      const body1 = await response1.text()
      logger.log('Format 1 - Body:', body1)
    } catch (error1) {
      logger.error('Format 1 failed:', error1)
    }

    // Format 2: With additional headers
    try {
      logger.log('2b. Testing with additional headers...')
      const response2 = await fetch(`${productionUrl}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Origin: productionUrl,
          Referer: `${productionUrl}/auth/signin`,
        },
        body: JSON.stringify({
          email: 'sarah@ultracoach.dev',
          password: 'UltraCoach2025!',
          rememberMe: false,
        }),
      })

      logger.log('Format 2 - Status:', response2.status)
      const body2 = await response2.text()
      logger.log('Format 2 - Body:', body2)
    } catch (error2) {
      logger.error('Format 2 failed:', error2)
    }

    // Test 3: Check Better Auth handler directly
    logger.log('3. Testing Better Auth handler capabilities...')
    try {
      const handlerResponse = await fetch(`${productionUrl}/api/auth`, {
        method: 'GET',
      })

      logger.log('Handler check status:', handlerResponse.status)
      const handlerBody = await handlerResponse.text()
      logger.log('Handler response:', handlerBody)
    } catch (handlerError) {
      logger.error('Handler check failed:', handlerError)
    }

    // Test 4: Check if there are any available endpoints
    logger.log('4. Checking available Better Auth endpoints...')
    const endpoints = ['/api/auth/session', '/api/auth/sign-out', '/api/auth/list-sessions']

    for (const endpoint of endpoints) {
      try {
        const endpointResponse = await fetch(`${productionUrl}${endpoint}`, {
          method: 'GET',
        })

        logger.log(`Endpoint ${endpoint} - Status:`, endpointResponse.status)
        if (endpointResponse.status !== 404) {
          const endpointBody = await endpointResponse.text()
          logger.log(`Endpoint ${endpoint} - Body:`, endpointBody.substring(0, 200))
        }
      } catch (endpointError) {
        logger.error(`Endpoint ${endpoint} failed:`, endpointError)
      }
    }
  } catch (error) {
    logger.error('❌ Production signin debugging failed:', error)
  }
}

// Run the test
debugProductionSignin()
  .then(() => {
    logger.log('✅ Production signin debugging completed')
  })
  .catch(error => {
    logger.error('❌ Fatal error in production signin debugging:', error)
    process.exit(1)
  })
