#!/usr/bin/env tsx

/**
 * Reset Riley Parker's password for testing
 */

import { createLogger } from '@/lib/logger'

const logger = createLogger('reset-riley-password')

async function resetRileyPassword() {
  const BASE_URL = 'http://localhost:3001'
  const NEW_PASSWORD = 'UltraCoach2025!'

  try {
    logger.info('🔐 Resetting Riley Parker password via API...')

    // Use sign-up to create/update Riley's credentials
    const signupResponse = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Riley Parker',
        email: 'riley.parker@ultracoach.dev',
        password: NEW_PASSWORD,
      }),
    })

    if (signupResponse.ok) {
      logger.info('✅ Riley password reset via signup successful!')
    } else {
      // If signup fails (user exists), that's expected
      logger.info('ℹ️  User exists, testing login instead...')
      
      // Test if current password works
      const loginResponse = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'riley.parker@ultracoach.dev',
          password: NEW_PASSWORD,
        }),
      })

      if (loginResponse.ok) {
        logger.info('✅ Riley login already works!')
        return true
      } else {
        logger.error('❌ Riley login failed, password needs reset')
        return false
      }
    }

    return true
  } catch (error) {
    logger.error('💥 Riley password reset failed:', error)
    return false
  }
}

// Run the reset
resetRileyPassword()
  .then(success => {
    if (success) {
      console.log('\n✅ Riley credentials are ready!')
      console.log('📧 Email: riley.parker@ultracoach.dev')
      console.log('🔑 Password: UltraCoach2025!')
    } else {
      console.log('\n❌ Riley credentials need manual reset')
    }
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    logger.error('💥 Reset script failed:', error)
    process.exit(1)
  })