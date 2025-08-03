#!/usr/bin/env tsx
import { config } from 'dotenv'
import { resolve } from 'path'

import { auth } from '../src/lib/better-auth'
import { createLogger } from '../src/lib/logger'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const logger = createLogger('create-test-users')

// Test users with simple passwords for testing
const testUsers = [
  {
    email: 'coach1@ultracoach.dev',
    password: 'password123',
    name: 'Elena Rodriguez',
    role: 'coach',
    fullName: 'Elena Rodriguez',
  },
  {
    email: 'coach2@ultracoach.dev',
    password: 'password123',
    name: 'Sarah Mountain',
    role: 'coach',
    fullName: 'Sarah Mountain',
  },
  {
    email: 'testrunner@ultracoach.dev',
    password: 'password123',
    name: 'Alex Trail',
    role: 'runner',
    fullName: 'Alex Trail',
  },
  {
    email: 'runner2@ultracoach.dev',
    password: 'password123',
    name: 'Mike Trailblazer',
    role: 'runner',
    fullName: 'Mike Trailblazer',
  },
]

async function createTestUsers() {
  logger.info('👥 Creating test users via Better Auth sign-up...')

  for (const userData of testUsers) {
    try {
      logger.info(`Creating user: ${userData.email}`)

      // Use Better Auth's sign-up API
      const result = await auth.api.signUpEmail({
        body: {
          email: userData.email,
          password: userData.password,
          name: userData.name,
          role: userData.role,
          fullName: userData.fullName,
        },
      })

      if (result.error) {
        logger.error(`Failed to create ${userData.email}:`, result.error)
        continue
      }

      logger.info(`✅ Created user: ${userData.email} (${userData.role})`)
    } catch (error) {
      logger.error(`❌ Error creating ${userData.email}:`, error)
    }
  }
}

async function main() {
  try {
    await createTestUsers()
    logger.info('✅ Test user creation completed')
    console.log(`
🎯 Test users created! Use these credentials to login:
• coach1@ultracoach.dev / password123
• coach2@ultracoach.dev / password123  
• testrunner@ultracoach.dev / password123
• runner2@ultracoach.dev / password123
    `)
    process.exit(0)
  } catch (error) {
    logger.error('❌ Test user creation failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
