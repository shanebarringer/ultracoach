#!/usr/bin/env tsx
/**
 * Fix test user passwords using direct SQL with Better Auth password hashing
 */
import { createLogger } from '../src/lib/logger'

const logger = createLogger('fix-passwords-direct-sql')

const USERS_TO_FIX = [
  {
    name: 'Alex Rivera',
    email: 'alex.rivera@ultracoach.dev',
    password: 'UltraCoach2025!',
  },
  {
    name: 'Riley Parker',
    email: 'riley.parker@ultracoach.dev',
    password: 'UltraCoach2025!',
  },
]

async function testBetterAuthSignUp(user: (typeof USERS_TO_FIX)[0]) {
  const BASE_URL = 'http://localhost:3001'

  try {
    logger.info(`🔐 Attempting to recreate ${user.name} via Better Auth...`)

    // Delete existing user first by trying to sign them up (will fail, but that's ok)
    // Then create fresh account
    const signupResponse = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: user.name,
        email: user.email,
        password: user.password,
      }),
    })

    const signupResult = await signupResponse.text()
    logger.info(`Signup response for ${user.name}:`, signupResult)

    // Test login immediately
    const loginResponse = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
      }),
    })

    if (loginResponse.ok) {
      const loginData = await loginResponse.json()
      logger.info(`✅ ${user.name} login working!`, {
        userId: loginData.user?.id,
        email: loginData.user?.email,
      })
      return true
    } else {
      const errorText = await loginResponse.text()
      logger.error(`❌ ${user.name} login failed:`, errorText)
      return false
    }
  } catch (error) {
    logger.error(`💥 Error with ${user.name}:`, error)
    return false
  }
}

async function fixPasswordsDirectAuth() {
  logger.info('🚀 Fixing passwords using Better Auth API...')

  // First test that auth system is working with Sarah
  logger.info('🧪 Testing auth system with Sarah (should work)...')
  const sarahTest = await fetch('http://localhost:3001/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'sarah@ultracoach.dev',
      password: 'UltraCoach2025!',
    }),
  })

  if (!sarahTest.ok) {
    logger.error('❌ Auth system not working - Sarah login failed')
    return false
  }
  logger.info('✅ Auth system working - Sarah login confirmed')

  // Fix each user
  const results = []
  for (const user of USERS_TO_FIX) {
    const success = await testBetterAuthSignUp(user)
    results.push({ user: user.name, success })
  }

  // Summary
  console.log('\n📊 Fix Results:')
  results.forEach(({ user, success }) => {
    console.log(`${success ? '✅' : '❌'} ${user}`)
  })

  const allSuccess = results.every(r => r.success)

  if (allSuccess) {
    console.log('\n🎉 All passwords fixed!')
    console.log('\n📧 Test Credentials Ready:')
    console.log('- Sarah Chen: sarah@ultracoach.dev / UltraCoach2025!')
    USERS_TO_FIX.forEach(user => {
      console.log(`- ${user.name}: ${user.email} / ${user.password}`)
    })
    console.log('\n🧪 Playwright tests can now run with all credentials!')
  } else {
    console.log('\n⚠️  Some users still need manual database intervention')
  }

  return allSuccess
}

// Run the fix
fixPasswordsDirectAuth()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    logger.error('💥 Script failed:', error)
    process.exit(1)
  })
