#!/usr/bin/env tsx
/**
 * Setup credential accounts for existing test users
 * This creates the missing credential accounts needed for password authentication
 */
import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'

import { db } from '../src/lib/database'
import { accounts, user as userTable } from '../src/lib/schema'

const TEST_USERS = [
  {
    email: 'sarah@ultracoach.dev',
    password: 'UltraCoach2025!',
  },
  {
    email: 'marcus@ultracoach.dev',
    password: 'UltraCoach2025!',
  },
  {
    email: 'alex.rivera@ultracoach.dev',
    password: 'RunnerPass2025!',
  },
  {
    email: 'riley.parker@ultracoach.dev',
    password: 'RunnerPass2025!',
  },
]

async function setupCredentials() {
  console.log('🔧 Setting up credential accounts for test users...')

  for (const testUser of TEST_USERS) {
    try {
      console.log(`\n👤 Processing ${testUser.email}...`)

      // Find the user
      const users = await db
        .select()
        .from(userTable)
        .where(eq(userTable.email, testUser.email))
        .limit(1)

      if (users.length === 0) {
        console.log(`❌ User ${testUser.email} not found`)
        continue
      }

      const user = users[0]
      console.log(`✅ Found user ${testUser.email} (ID: ${user.id})`)

      // Check if credential account already exists
      const existingAccounts = await db.select().from(accounts).where(eq(accounts.user_id, user.id))

      const hasCredentials = existingAccounts.some(acc => acc.provider_id === 'credential')

      if (hasCredentials) {
        console.log(`ℹ️  User ${testUser.email} already has credential account`)
        continue
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(testUser.password, 12)
      console.log(`🔐 Hashed password for ${testUser.email}`)

      // Create credential account
      await db.insert(accounts).values({
        user_id: user.id,
        provider_id: 'credential',
        password: hashedPassword,
      })

      console.log(`✅ Created credential account for ${testUser.email}`)
    } catch (error) {
      console.error(`❌ Failed to setup credentials for ${testUser.email}:`, error)
    }
  }

  console.log('\n🎉 Credential setup complete!')
}

setupCredentials().catch(console.error)
