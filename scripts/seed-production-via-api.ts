#!/usr/bin/env tsx
/**
 * Seed Production Database via API
 *
 * This script creates test users by calling the production Better Auth API directly,
 * which ensures they get created in the correct production database.
 */
import { createLogger } from '../src/lib/logger'

const logger = createLogger('SeedProductionViaAPI')

// Production URL - update this to match your actual deployment
const PRODUCTION_URL =
  'https://ultracoach-git-fix-nextjs-static-dynamic-rendering-shane-hehims-projects.vercel.app'

// Test users to create
const TEST_USERS = [
  {
    name: 'Sarah Mountain',
    fullName: 'Sarah Mountain',
    email: 'sarah@ultracoach.dev',
    password: 'UltraCoach2025!',
    role: 'coach',
  },
  {
    name: 'Marcus Trail',
    fullName: 'Marcus Trail',
    email: 'marcus@ultracoach.dev',
    password: 'UltraCoach2025!',
    role: 'coach',
  },
  {
    name: 'Emma Summit',
    fullName: 'Emma Summit',
    email: 'emma@ultracoach.dev',
    password: 'UltraCoach2025!',
    role: 'coach',
  },
  {
    name: 'Alex Rivers',
    fullName: 'Alex Rivers',
    email: 'alex.rivers@ultracoach.dev',
    password: 'RunnerPass123!',
    role: 'runner',
  },
  {
    name: 'Jordan Peak',
    fullName: 'Jordan Peak',
    email: 'jordan.peak@ultracoach.dev',
    password: 'RunnerPass123!',
    role: 'runner',
  },
]

async function seedProductionViaAPI() {
  logger.info('🌱 Starting production database seeding via API...', {
    productionUrl: PRODUCTION_URL,
    usersToCreate: TEST_USERS.length,
  })

  let successCount = 0
  let errorCount = 0

  for (const user of TEST_USERS) {
    try {
      logger.info(`Creating user: ${user.email} (${user.role})`)

      const response = await fetch(`${PRODUCTION_URL}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'UltraCoach-Production-Seeder/1.0',
        },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          password: user.password,
          role: user.role,
          fullName: user.fullName,
        }),
      })

      const responseText = await response.text()

      if (response.ok) {
        logger.info(`✅ Successfully created: ${user.email}`, {
          status: response.status,
        })
        successCount++
      } else {
        logger.error(`❌ Failed to create: ${user.email}`, {
          status: response.status,
          statusText: response.statusText,
          response: responseText,
        })
        errorCount++
      }

      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      logger.error(`❌ Error creating user ${user.email}:`, error)
      errorCount++
    }
  }

  logger.info('🏁 Production seeding completed!', {
    successful: successCount,
    failed: errorCount,
    total: TEST_USERS.length,
  })

  if (errorCount === 0) {
    logger.info('✅ All users created successfully! Production database is now seeded.')
  } else {
    logger.warn(`⚠️  ${errorCount} users failed to create. Check the logs above.`)
  }
}

// Run the script
seedProductionViaAPI().catch(error => {
  console.error('Script failed:', error)
  process.exit(1)
})
