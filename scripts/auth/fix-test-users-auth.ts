#!/usr/bin/env tsx
/**
 * Fix Test Users Authentication
 *
 * This script recreates test users using Better Auth's signup API to ensure
 * they have compatible password hashes. This fixes the 500 errors in authentication.
 */
import { createLogger } from '@/lib/logger'

const logger = createLogger('fix-test-users-auth')

// Test users that match exactly what Playwright tests expect
const TEST_USERS = [
  {
    email: 'sarah@ultracoach.dev',
    password: 'UltraCoach2025!',
    name: 'Sarah Mountain',
    userType: 'coach',
  },
  {
    email: 'marcus@ultracoach.dev',
    password: 'UltraCoach2025!',
    name: 'Marcus Trail',
    userType: 'coach',
  },
  {
    email: 'alex.rivera@ultracoach.dev',
    password: 'RunnerPass2025!',
    name: 'Alex Rivera',
    userType: 'runner',
  },
  {
    email: 'riley.parker@ultracoach.dev',
    password: 'RunnerPass2025!',
    name: 'Riley Parker',
    userType: 'runner',
  },
]

async function createUserViaAPI(userData: (typeof TEST_USERS)[0]) {
  const baseUrl = 'http://localhost:3001'

  try {
    logger.info(`Creating user: ${userData.email}`)

    const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        userType: userData.userType,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    logger.info(`✅ Created user: ${userData.email}`)
    return result
  } catch (error) {
    logger.error(`❌ Failed to create user ${userData.email}:`, error)
    throw error
  }
}

async function fixTestUsers() {
  logger.info('🔧 Fixing test users authentication...')
  logger.info('📋 Creating users with Better Auth compatible password hashes')

  // Check if dev server is running
  try {
    const response = await fetch('http://localhost:3001/api/auth/session')
    logger.info('✅ Dev server is running')
  } catch (error) {
    logger.error('❌ Dev server not running on port 3001')
    logger.error('   Please run: pnpm dev')
    process.exit(1)
  }

  // Create users one by one
  const results = []
  for (const userData of TEST_USERS) {
    try {
      const result = await createUserViaAPI(userData)
      results.push({ email: userData.email, status: 'success', data: result })

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      results.push({
        email: userData.email,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Summary
  logger.info('\n📊 Summary:')
  const successful = results.filter(r => r.status === 'success')
  const failed = results.filter(r => r.status === 'error')

  logger.info(`✅ Successfully created: ${successful.length} users`)
  if (successful.length > 0) {
    successful.forEach(r => logger.info(`   - ${r.email}`))
  }

  if (failed.length > 0) {
    logger.error(`❌ Failed to create: ${failed.length} users`)
    failed.forEach(r => logger.error(`   - ${r.email}: ${r.error}`))
  }

  if (successful.length === TEST_USERS.length) {
    logger.info('\n🎉 All test users created successfully!')
    logger.info('   Playwright tests should now work.')
  } else {
    logger.error('\n⚠️ Some users failed to create. Check errors above.')
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  fixTestUsers().catch(error => {
    logger.error('Script failed:', error)
    process.exit(1)
  })
}

export { fixTestUsers }
