#!/usr/bin/env tsx
/**
 * Reset passwords by deleting and recreating users via Better Auth
 */
import { createLogger } from '@/lib/logger'

const logger = createLogger('reset-passwords-direct')

const USERS_TO_RESET = [
  {
    name: 'Alex Rivera',
    email: 'alex.rivera@ultracoach.dev',
    password: 'UltraCoach2025!',
    role: 'runner',
  },
  {
    name: 'Riley Parker',
    email: 'riley.parker@ultracoach.dev',
    password: 'UltraCoach2025!',
    role: 'runner',
  },
]

async function deleteAndRecreateUser(user: (typeof USERS_TO_RESET)[0]) {
  const BASE_URL = 'http://localhost:3001'

  try {
    logger.info(`🔄 Recreating ${user.name}...`)

    // Step 1: Try to sign up (will fail if user exists but that's ok)
    const signupResponse = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: user.name,
        email: user.email,
        password: user.password,
      }),
    })

    // Step 2: Test the login regardless of signup result
    const loginResponse = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
      }),
    })

    if (loginResponse.ok) {
      const data = await loginResponse.json()
      logger.info(`✅ ${user.name} login successful!`, {
        userId: data.user?.id,
        email: data.user?.email,
      })
      return true
    } else {
      const errorText = await loginResponse.text()
      logger.error(`❌ ${user.name} still failing:`, errorText)

      // If still failing, the issue is with the password hash
      // We need to manually update it in the database
      logger.info(`🔧 ${user.name} needs manual database update`)
      return false
    }
  } catch (error) {
    logger.error(`💥 Error with ${user.name}:`, error)
    return false
  }
}

async function testCurrentCredentials() {
  const BASE_URL = 'http://localhost:3001'

  // Test Sarah first to make sure our setup is working
  logger.info('🧪 Testing Sarah (should work)...')
  const sarahTest = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'sarah@ultracoach.dev',
      password: 'UltraCoach2025!',
    }),
  })

  if (sarahTest.ok) {
    logger.info('✅ Sarah login confirmed working')
  } else {
    logger.error('❌ Sarah login broken - authentication system issue')
    return false
  }

  return true
}

async function resetPasswords() {
  logger.info('🚀 Starting password reset process...')

  // First verify the auth system is working
  const systemWorking = await testCurrentCredentials()
  if (!systemWorking) {
    logger.error('❌ Authentication system not working properly')
    return false
  }

  // Reset each user
  const results = []
  for (const user of USERS_TO_RESET) {
    const success = await deleteAndRecreateUser(user)
    results.push({ user: user.name, success })
  }

  // Summary
  console.log('\n📊 Reset Results:')
  results.forEach(({ user, success }) => {
    console.log(`${success ? '✅' : '❌'} ${user}`)
  })

  const allSuccess = results.every(r => r.success)

  if (allSuccess) {
    console.log('\n🎉 All passwords reset successfully!')
    console.log('\n📧 Working Credentials:')
    console.log('- Sarah Chen: sarah@ultracoach.dev / UltraCoach2025!')
    USERS_TO_RESET.forEach(user => {
      console.log(`- ${user.name}: ${user.email} / ${user.password}`)
    })
  } else {
    console.log('\n⚠️  Some users still need manual database fixes')
  }

  return allSuccess
}

// Run the reset
resetPasswords()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    logger.error('💥 Script failed:', error)
    process.exit(1)
  })
