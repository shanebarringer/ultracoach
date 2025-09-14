#!/usr/bin/env tsx
/**
 * Test session management on preview deployment
 */
import { createLogger } from '../src/lib/logger'

const logger = createLogger('test-preview-session')

async function testSession() {
  const previewUrl =
    'https://ultracoach-git-refactor-jotai-atom-6ba6ae-shane-hehims-projects.vercel.app'

  logger.info('Testing session management on preview deployment...')

  try {
    // 1. Check current session status
    logger.info('')
    logger.info('1. Checking current session...')
    const sessionResponse = await fetch(`${previewUrl}/api/auth/get-session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    logger.info('Session response status:', sessionResponse.status)
    logger.info('Session response headers:', Object.fromEntries(sessionResponse.headers.entries()))

    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json()
      logger.info('Current session data:', JSON.stringify(sessionData, null, 2))

      if (sessionData && (sessionData.session || sessionData.user)) {
        logger.info('✅ Active session found')
        logger.info('User:', sessionData.user)
      } else {
        logger.info('❌ No active session')
      }
    } else {
      const errorText = await sessionResponse.text()
      logger.info('Session check failed:', sessionResponse.status, errorText)
    }

    // 2. Check if cookies are being set
    logger.info('')
    logger.info('2. Checking cookie configuration...')
    const cookieHeader = sessionResponse.headers.get('set-cookie')
    if (cookieHeader) {
      logger.info('Set-Cookie header found:', cookieHeader)
    } else {
      logger.info('No Set-Cookie header in response')
    }

    // 3. Try to sign out
    logger.info('')
    logger.info('3. Attempting to sign out...')
    const signOutResponse = await fetch(`${previewUrl}/api/auth/sign-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    const signOutText = await signOutResponse.text()
    logger.info('Sign out response status:', signOutResponse.status)

    if (signOutResponse.ok) {
      try {
        const data = JSON.parse(signOutText)
        logger.info('✅ Sign out response:', data)
      } catch {
        logger.info('Sign out response (non-JSON):', signOutText)
      }
    } else {
      logger.error('❌ Sign out failed:', signOutText)
    }

    // 4. Check session after signout
    logger.info('')
    logger.info('4. Checking session after signout attempt...')
    const sessionAfterResponse = await fetch(`${previewUrl}/api/auth/get-session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (sessionAfterResponse.ok) {
      const sessionData = await sessionAfterResponse.json()
      logger.info('Session after signout:', JSON.stringify(sessionData, null, 2))

      if (sessionData && (sessionData.session || sessionData.user)) {
        logger.error('❌ Session still exists after signout!')
      } else {
        logger.info('✅ Session successfully cleared')
      }
    } else {
      logger.info('✅ No session after signout (expected)')
    }

    // 5. Check authentication configuration
    logger.info('')
    logger.info('5. Checking auth configuration...')
    logger.info('Preview URL:', previewUrl)
    logger.info('Expected behavior:')
    logger.info('- Sessions should use secure cookies in production')
    logger.info('- SameSite should be set appropriately for cross-origin requests')
    logger.info('- Domain should match the deployment URL')
  } catch (error) {
    logger.error('Network error:', error)
  }
}

testSession()
  .then(() => {
    logger.info('')
    logger.info('Test complete')
    logger.info('='.repeat(60))
    logger.info('SUMMARY:')
    logger.info('- Check if session persists after signout')
    logger.info('- Verify cookie configuration is correct')
    logger.info('- Ensure auth endpoints are accessible')
    process.exit(0)
  })
  .catch(error => {
    logger.error('Test failed:', error)
    process.exit(1)
  })
