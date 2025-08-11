#!/usr/bin/env tsx
/**
 * Test Production Login
 *
 * This script tests if we can sign in to production successfully
 * and verifies the complete authentication flow.
 */
import { config } from 'dotenv'

import { createLogger } from '../src/lib/logger'

// Load production environment
config({ path: '.env.production' })

const logger = createLogger('TestProductionLogin')

async function testProductionLogin() {
  const baseUrl = process.env.BETTER_AUTH_URL || 'https://ultracoach.vercel.app'
  const authUrl = `${baseUrl}/api/auth`

  logger.info('Testing production login:', {
    baseUrl,
    authUrl,
    environment: process.env.NODE_ENV || 'production',
  })

  try {
    // Test 1: Check if auth endpoint is accessible
    logger.info('🔍 Step 1: Testing auth endpoint accessibility...')
    const pingResponse = await fetch(`${authUrl}/ping`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    logger.info('Auth endpoint status:', {
      status: pingResponse.status,
      ok: pingResponse.ok,
      url: `${authUrl}/ping`,
    })

    // Test 2: Attempt sign-in with Sarah (coach)
    logger.info('🔐 Step 2: Testing sign-in with sarah@ultracoach.dev...')
    const signInResponse = await fetch(`${authUrl}/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'sarah@ultracoach.dev',
        password: 'UltraCoach2025!',
      }),
    })

    const signInText = await signInResponse.text()
    logger.info('Sign-in raw response:', {
      text: signInText.substring(0, 500),
      contentType: signInResponse.headers.get('content-type'),
    })

    let signInData
    try {
      signInData = JSON.parse(signInText)
    } catch (parseError) {
      logger.error('Failed to parse sign-in response as JSON:', parseError)
      return false
    }

    logger.info('Sign-in response:', {
      status: signInResponse.status,
      ok: signInResponse.ok,
      hasData: !!signInData.data,
      hasError: !!signInData.error,
      error: signInData.error?.message || 'No error',
    })

    if (signInData.error) {
      logger.error('Sign-in failed:', signInData.error)
      return false
    }

    if (signInData.data && signInData.data.user) {
      logger.info('✅ Sign-in successful!', {
        userId: signInData.data.user.id,
        email: signInData.data.user.email,
        role: signInData.data.user.role || 'role not found',
        name: signInData.data.user.name,
      })

      // Test 3: Get session to verify persistence
      logger.info('📋 Step 3: Testing session retrieval...')
      const sessionCookie = signInResponse.headers.get('set-cookie')

      if (sessionCookie) {
        const getSessionResponse = await fetch(`${authUrl}/get-session`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Cookie: sessionCookie,
          },
        })

        const sessionData = await getSessionResponse.json()

        logger.info('Session data:', {
          status: getSessionResponse.status,
          hasData: !!sessionData.data,
          sessionUser: sessionData.data?.user?.email || 'No user',
          sessionRole: sessionData.data?.user?.role || 'No role',
        })
      } else {
        logger.warn('No session cookie received')
      }

      return true
    } else {
      logger.error('Sign-in succeeded but no user data received')
      return false
    }
  } catch (error) {
    logger.error('Test failed with exception:', error)
    return false
  }
}

// Run the test
testProductionLogin()
  .then(success => {
    if (success) {
      logger.info('🎉 Production login test PASSED')
      process.exit(0)
    } else {
      logger.error('❌ Production login test FAILED')
      process.exit(1)
    }
  })
  .catch(error => {
    logger.error('Test script error:', error)
    process.exit(1)
  })
