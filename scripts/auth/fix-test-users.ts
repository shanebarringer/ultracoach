#!/usr/bin/env tsx
/**
 * Fix test users for Playwright authentication
 * Ensures all test users have proper credential accounts for password authentication
 */
import { auth } from '../src/lib/better-auth'

const TEST_USERS = [
  {
    email: 'sarah@ultracoach.dev',
    password: 'UltraCoach2025!',
    name: 'Sarah Mitchell',
    userType: 'coach',
  },
  {
    email: 'marcus@ultracoach.dev',
    password: 'UltraCoach2025!',
    name: 'Marcus Thompson',
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

async function fixTestUsers() {
  console.log('🔧 Fixing test users for Playwright authentication...')

  for (const testUser of TEST_USERS) {
    try {
      console.log(`\n👤 Processing ${testUser.email} (${testUser.userType})...`)

      // Try to sign up the user - this will either create them or fail if they exist
      const response = await fetch('http://localhost:3001/api/auth/sign-up/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
          name: testUser.name,
          userType: testUser.userType,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        console.log(`✅ Created user ${testUser.email}`)
      } else if (result.error?.includes?.('User already exists')) {
        console.log(`ℹ️  User ${testUser.email} already exists`)

        // Check if they have credential account
        const signinResponse = await fetch('http://localhost:3001/api/auth/sign-in/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: testUser.email,
            password: testUser.password,
          }),
        })

        if (signinResponse.ok) {
          console.log(`✅ ${testUser.email} can authenticate successfully`)
        } else {
          console.log(`❌ ${testUser.email} cannot authenticate - password may be wrong`)
        }
      } else {
        console.log(`❌ Error with ${testUser.email}:`, result)
      }
    } catch (error) {
      console.error(`❌ Failed to process ${testUser.email}:`, error)
    }
  }

  console.log('\n🎉 Test user fixing complete!')
}

fixTestUsers().catch(console.error)
