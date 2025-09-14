#!/usr/bin/env tsx
/**
 * Test signout functionality on preview deployment
 */
import { createLogger } from '../src/lib/logger'

const logger = createLogger('test-preview-signout')

async function testSignout() {
  const previewUrl =
    'https://ultracoach-git-refactor-jotai-atom-6ba6ae-shane-hehims-projects.vercel.app'

  logger.info('Testing signout on preview deployment...')

  try {
    // First check current session status
    logger.info('Checking current session...')
    const sessionResponse = await fetch(`${previewUrl}/api/auth/get-session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json()
      logger.info('Current session:', sessionData)
    } else {
      logger.info('No active session or error:', sessionResponse.status)
    }

    // Try to sign out
    logger.info('')
    logger.info('Attempting to sign out...')
    const signOutResponse = await fetch(`${previewUrl}/api/auth/sign-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    const responseText = await signOutResponse.text()
    logger.info('Sign out response status:', signOutResponse.status)
    logger.info('Sign out response headers:', Object.fromEntries(signOutResponse.headers.entries()))

    if (signOutResponse.ok) {
      try {
        const data = JSON.parse(responseText)
        logger.info('✅ Sign out successful!', data)
      } catch {
        logger.info('Response (non-JSON):', responseText)
      }
    } else {
      logger.error('❌ Sign out failed')
      logger.error('Response:', responseText)
    }

    // Check session after signout
    logger.info('')
    logger.info('Checking session after signout...')
    const sessionAfterResponse = await fetch(`${previewUrl}/api/auth/get-session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (sessionAfterResponse.ok) {
      const sessionData = await sessionAfterResponse.json()
      logger.info('Session after signout:', sessionData)
      if (sessionData && (sessionData.session || sessionData.user)) {
        logger.error('❌ Session still exists after signout!')
      } else {
        logger.info('✅ Session successfully cleared')
      }
    } else {
      logger.info('✅ No session after signout (expected)')
    }
  } catch (error) {
    logger.error('Network error:', error)
  }
}

testSignout()
  .then(() => {
    logger.info('Test complete')
    process.exit(0)
  })
  .catch(error => {
    logger.error('Test failed:', error)
    process.exit(1)
  })
