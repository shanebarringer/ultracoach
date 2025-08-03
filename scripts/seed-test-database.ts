#!/usr/bin/env tsx
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { resolve } from 'path'

import { db } from '../src/lib/database'
import { createLogger } from '../src/lib/logger'
import * as schema from '../src/lib/schema'

// Load test environment variables
config({ path: resolve(process.cwd(), '.env.test') })

const logger = createLogger('test-database-seed')

// Test users with consistent credentials for CI
const testUsers = [
  {
    email: 'testcoach@ultracoach.dev',
    password: 'TestCoach123!',
    name: 'Test Coach',
    fullName: 'Test Coach User',
    role: 'coach' as const,
  },
  {
    email: 'testcoach2@ultracoach.dev',
    password: 'TestCoach456!',
    name: 'Test Coach 2',
    fullName: 'Test Coach 2 User',
    role: 'coach' as const,
  },
  {
    email: 'testrunner@ultracoach.dev',
    password: 'TestRunner123!',
    name: 'Test Runner',
    fullName: 'Test Runner User',
    role: 'runner' as const,
  },
  {
    email: 'testrunner2@ultracoach.dev',
    password: 'TestRunner456!',
    name: 'Test Runner 2',
    fullName: 'Test Runner 2 User',
    role: 'runner' as const,
  },
]

// Use the unified database connection from our main database module
// This ensures consistency with Better Auth and the rest of the application

async function seedTestUsers() {
  // Use the unified database connection
  logger.info('👥 Creating test users for CI using Better Auth Admin API...')

  // Import auth only when needed
  const { auth } = await import('../src/lib/better-auth')

  for (const userData of testUsers) {
    try {
      logger.info(`Creating test user: ${userData.email}`)

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.email, userData.email))
        .limit(1)

      if (existingUser.length > 0) {
        logger.info(`User ${userData.email} already exists, skipping...`)
        continue
      }

      // Use Better Auth Admin API to create user properly
      const result = await auth.api.adminCreateUser({
        body: {
          email: userData.email,
          password: userData.password,
          name: userData.name,
          role: userData.role,
          data: {
            fullName: userData.fullName,
            emailVerified: true, // Skip email verification for test users
          },
        },
      })

      if (result.error) {
        logger.error(`Failed to create test user ${userData.email}:`, result.error)
        continue
      }

      logger.info(`✅ Created test user with Better Auth API: ${userData.email}`)
    } catch (error) {
      logger.error(`Error creating test user ${userData.email}:`, error)
    }
  }
}

async function createMinimalTestData() {
  // Use the unified database connection
  logger.info('🏃‍♂️ Creating minimal test data...')

  try {
    // Get test users
    const coach = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, 'testcoach@ultracoach.dev'))
      .limit(1)

    const runner = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, 'testrunner@ultracoach.dev'))
      .limit(1)

    if (coach.length === 0 || runner.length === 0) {
      logger.warn('Test users not found, skipping test data creation')
      return
    }

    // Create a simple training plan for testing
    const [testPlan] = await db
      .insert(schema.training_plans)
      .values({
        title: 'Test Training Plan',
        description: 'A simple plan for testing purposes',
        coach_id: coach[0].id,
        runner_id: runner[0].id,
        target_race_date: new Date('2025-06-01'),
        target_race_distance: '50K',
      })
      .returning()

    // Create a few test workouts
    const today = new Date()
    const testWorkouts = [
      {
        training_plan_id: testPlan.id,
        date: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        planned_distance: '5.0',
        planned_duration: 2400,
        planned_type: 'easy',
        status: 'planned' as const,
      },
      {
        training_plan_id: testPlan.id,
        date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        planned_distance: '10.0',
        planned_duration: 4800,
        planned_type: 'long_run',
        status: 'planned' as const,
      },
    ]

    await db.insert(schema.workouts).values(testWorkouts)
    logger.info(`✅ Created test training plan with ${testWorkouts.length} workouts`)
  } catch (error) {
    logger.error('Failed to create test data:', error)
  }
}

async function main() {
  const startTime = Date.now()

  try {
    logger.info('🧪 Starting test database seeding...')

    // Create test users
    await seedTestUsers()

    // Create minimal test data
    await createMinimalTestData()

    // Show summary
    const userCount = await db
      .select()
      .from(schema.user)
      .then(r => r.length)
    const planCount = await db
      .select()
      .from(schema.training_plans)
      .then(r => r.length)
    const workoutCount = await db
      .select()
      .from(schema.workouts)
      .then(r => r.length)

    console.log(`
    🧪 Test Database Seeding Results:
    ├── Users: ${userCount}
    ├── Training Plans: ${planCount}
    └── Workouts: ${workoutCount}
    `)

    // Database connection will be cleaned up automatically by the unified database module

    const duration = Date.now() - startTime
    logger.info(`✅ Test database seeding completed in ${duration}ms`)

    console.log(`
    🎯 Test database ready!
    • Consistent test users created with known credentials
    • Minimal test data for reliable testing
    • Ready for CI/CD pipeline
    `)

    process.exit(0)
  } catch (error) {
    logger.error('❌ Test database seeding failed:', error)
    process.exit(1)
  }
}

// Handle script execution
if (require.main === module) {
  main()
}

export { main as seedTestDatabase }
