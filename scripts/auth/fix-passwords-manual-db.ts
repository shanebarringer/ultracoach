#!/usr/bin/env tsx
/**
 * Manually fix password hashes in database using Better Auth format
 * This directly updates the password hash in the accounts table
 */
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'

import { auth } from '../src/lib/better-auth'
import { db } from '../src/lib/database'
import { createLogger } from '../src/lib/logger'
import { account } from '../src/lib/schema'

// Load environment variables
config({ path: '.env.local' })

const logger = createLogger('fix-passwords-manual-db')

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

async function hashPasswordWithBetterAuth(password: string): Promise<string> {
  // Use Better Auth's internal password hashing
  // @ts-ignore - accessing internal hash function
  const hashedPassword = await auth.api.password.hash({ password })
  return hashedPassword
}

async function updateUserPassword(user: (typeof USERS_TO_FIX)[0]) {
  try {
    logger.info(`🔧 Fixing password for ${user.name}...`)

    // First find the account record for this email
    const accounts = await db.select().from(account).where(eq(account.providerId, 'credential'))

    const userAccount = accounts.find(acc => {
      // The userId should match the user's email or we need to find by account ID
      return acc.accountId === user.email
    })

    if (!userAccount) {
      logger.error(`❌ No credential account found for ${user.email}`)
      return false
    }

    // Hash the password using Better Auth's method
    const hashedPassword = await hashPasswordWithBetterAuth(user.password)

    // Update the password in the account table
    await db.update(account).set({ password: hashedPassword }).where(eq(account.id, userAccount.id))

    logger.info(`✅ Updated password hash for ${user.name}`)

    // Test the login
    const BASE_URL = 'http://localhost:3001'
    const loginResponse = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
      }),
    })

    if (loginResponse.ok) {
      logger.info(`✅ ${user.name} login verified working!`)
      return true
    } else {
      const errorText = await loginResponse.text()
      logger.error(`❌ ${user.name} login still failing:`, errorText)
      return false
    }
  } catch (error) {
    logger.error(`💥 Error fixing ${user.name}:`, error)
    return false
  }
}

async function fixPasswords() {
  logger.info('🚀 Starting manual password fix...')

  const results = []
  for (const user of USERS_TO_FIX) {
    const success = await updateUserPassword(user)
    results.push({ user: user.name, success })
  }

  // Summary
  console.log('\n📊 Fix Results:')
  results.forEach(({ user, success }) => {
    console.log(`${success ? '✅' : '❌'} ${user}`)
  })

  const allSuccess = results.every(r => r.success)

  if (allSuccess) {
    console.log('\n🎉 All passwords fixed successfully!')
    console.log('\n📧 Working Test Credentials:')
    console.log('- Sarah Chen: sarah@ultracoach.dev / UltraCoach2025!')
    USERS_TO_FIX.forEach(user => {
      console.log(`- ${user.name}: ${user.email} / ${user.password}`)
    })
  } else {
    console.log('\n⚠️  Some users still need attention')
  }

  return allSuccess
}

// Run the fix
fixPasswords()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    logger.error('💥 Script failed:', error)
    process.exit(1)
  })
