#!/usr/bin/env tsx
/**
 * Create Test Users via Better Auth API
 *
 * This script creates test users through the Better Auth sign-up API to ensure
 * password hashes are in the correct format for Better Auth compatibility.
 */
import { createLogger } from '../src/lib/logger'

const logger = createLogger('CreateTestUsers')

interface TestUser {
  email: string
  name: string
  password: string
  role: 'coach' | 'runner'
}

const testUsers: TestUser[] = [
  // Test coaches
  {
    email: 'sarah@ultracoach.dev',
    name: 'Sarah Mountain',
    password: 'UltraCoach2025!',
    role: 'coach',
  },
  {
    email: 'mike@ultracoach.dev',
    name: 'Mike Trailblazer',
    password: 'UltraCoach2025!',
    role: 'coach',
  },

  // Test runners
  {
    email: 'alex@ultracoach.dev',
    name: 'Alex Speedster',
    password: 'UltraCoach2025!',
    role: 'runner',
  },
  {
    email: 'jordan@ultracoach.dev',
    name: 'Jordan Endurance',
    password: 'UltraCoach2025!',
    role: 'runner',
  },
  {
    email: 'taylor@ultracoach.dev',
    name: 'Taylor Swift-feet',
    password: 'UltraCoach2025!',
    role: 'runner',
  },
  {
    email: 'casey@ultracoach.dev',
    name: 'Casey Hillclimber',
    password: 'UltraCoach2025!',
    role: 'runner',
  },
]

async function createTestUsers() {
  const baseUrl = 'http://localhost:3001'
  logger.info('🏃‍♂️ Creating test users via Better Auth API...')

  for (const user of testUsers) {
    try {
      logger.info(`Creating user: ${user.name} (${user.email}) - ${user.role}`)

      const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          password: user.password,
          userType: user.role, // Better Auth expects userType field
          fullName: user.name, // Custom field
        }),
      })

      if (response.ok) {
        const result = await response.json()
        logger.info(`✅ Successfully created: ${user.email}`, {
          userId: result?.user?.id || 'unknown',
          role: result?.user?.role || user.role,
        })
      } else {
        const error = await response.text()
        logger.warn(`⚠️ Failed to create ${user.email}:`, {
          status: response.status,
          error: error.substring(0, 200),
        })
      }
    } catch (error) {
      logger.error(
        `❌ Error creating ${user.email}:`,
        error instanceof Error ? error.message : error
      )
    }

    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

async function main() {
  try {
    await createTestUsers()
    logger.info('🎉 Test user creation completed!')
    logger.info('📋 Login credentials for all users: UltraCoach2025!')
  } catch (error) {
    logger.error('💥 Script failed:', error)
    process.exit(1)
  }
}

main()
