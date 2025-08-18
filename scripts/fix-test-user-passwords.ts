#!/usr/bin/env tsx
/**
 * Fix test user passwords using Better Auth API
 * Creates proper credential accounts for testing
 */
import { createLogger } from '@/lib/logger'

const logger = createLogger('fix-test-user-passwords')

const TEST_USERS = [
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
  {
    name: 'Sarah Chen',
    email: 'sarah@ultracoach.dev',
    password: 'UltraCoach2025!',
    role: 'coach',
  },
]

async function createUserAccount(user: (typeof TEST_USERS)[0]) {
  const BASE_URL = 'http://localhost:3001'

  try {
    logger.info(`🔐 Creating/updating account for ${user.name}...`)

    // First try to sign up - this will create the credential account
    const signupResponse = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: user.name,
        email: user.email,
        password: user.password,
      }),
    })

    if (signupResponse.ok) {
      logger.info(`✅ ${user.name} account created successfully!`)
      return true
    }

    // If signup fails, user likely exists - test login
    const loginResponse = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
      }),
    })

    if (loginResponse.ok) {
      logger.info(`✅ ${user.name} login already works!`)
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

async function fixAllPasswords() {
  logger.info('🚀 Fixing test user passwords...')

  const results = []
  for (const user of TEST_USERS) {
    const success = await createUserAccount(user)
    results.push({ user: user.name, success })
  }

  // Summary
  console.log('\n📊 Results:')
  results.forEach(({ user, success }) => {
    console.log(`${success ? '✅' : '❌'} ${user}`)
  })

  const allSuccess = results.every(r => r.success)

  if (allSuccess) {
    console.log('\n🎉 All test users are ready!')
    console.log('\n📧 Test Credentials:')
    TEST_USERS.forEach(user => {
      console.log(`- ${user.name}: ${user.email} / ${user.password}`)
    })
  } else {
    console.log('\n⚠️  Some users need manual attention')
  }

  return allSuccess
}

// Run the fix
fixAllPasswords()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    logger.error('💥 Script failed:', error)
    process.exit(1)
  })
