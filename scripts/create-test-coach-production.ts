#!/usr/bin/env tsx
/**
 * Create a new test coach user in production with a known password
 */
import { createLogger } from '../src/lib/logger'

const logger = createLogger('create-test-coach')

async function createTestCoach() {
  const prodUrl = 'https://ultracoach.vercel.app'

  const testUser = {
    email: 'test.coach@ultracoach.dev',
    password: 'Test123!@#',
    name: 'Test Coach',
    userType: 'coach',
  }

  logger.info('Creating test coach in production...', { email: testUser.email })

  try {
    // Create user via sign-up API
    const response = await fetch(`${prodUrl}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    })

    const responseText = await response.text()
    logger.info('Response status:', response.status)

    if (response.ok) {
      try {
        const data = JSON.parse(responseText)
        logger.info('✅ Test coach created successfully!', {
          userId: data.user?.id,
          email: data.user?.email,
        })
        logger.info('')
        logger.info('You can now log in with:')
        logger.info(`Email: ${testUser.email}`)
        logger.info(`Password: ${testUser.password}`)
      } catch {
        logger.info('Response (non-JSON):', responseText)
      }
    } else {
      logger.error('❌ Failed to create test coach')
      logger.error('Response:', responseText)

      // If user already exists, that's OK
      if (
        responseText.includes('already exists') ||
        responseText.includes('EMAIL_ALREADY_EXISTS')
      ) {
        logger.info('')
        logger.info('User already exists. Try logging in with:')
        logger.info(`Email: ${testUser.email}`)
        logger.info(`Password: ${testUser.password}`)
      }
    }

    // Now test signing in
    logger.info('')
    logger.info('Testing sign-in with new user...')

    const signInResponse = await fetch(`${prodUrl}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    })

    if (signInResponse.ok) {
      logger.info('✅ Sign-in successful! User is ready to use.')
    } else {
      const signInError = await signInResponse.text()
      logger.error('❌ Sign-in failed:', signInError)
    }
  } catch (error) {
    logger.error('Network error:', error)
  }
}

createTestCoach()
  .then(() => {
    logger.info('Script complete')
    process.exit(0)
  })
  .catch(error => {
    logger.error('Script failed:', error)
    process.exit(1)
  })
