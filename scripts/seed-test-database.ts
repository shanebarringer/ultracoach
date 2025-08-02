#!/usr/bin/env tsx
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { resolve } from 'path'
import { Pool } from 'pg'

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

async function createTestDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required for tests')
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false, // Local test database doesn't need SSL
  })

  const db = drizzle(pool, { schema })
  return { db, pool }
}

async function seedTestUsers(db: ReturnType<typeof drizzle>) {
  logger.info('👥 Creating test users for CI...')

  // Import auth only when needed
  const { auth } = await import('../src/lib/better-auth')

  for (const userData of testUsers) {
    try {
      logger.info(`Creating test user: ${userData.email}`)

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(schema.better_auth_users)
        .where(eq(schema.better_auth_users.email, userData.email))
        .limit(1)

      if (existingUser.length > 0) {
        logger.info(`User ${userData.email} already exists, skipping...`)
        continue
      }

      // Create test user directly in database with proper authentication
      const userId = `test_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
      const accountId = `account_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

      // Import bcrypt for password hashing
      const bcrypt = await import('bcrypt')
      const saltRounds = 12
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds)

      // Insert user directly into database
      const [newUser] = await db
        .insert(schema.better_auth_users)
        .values({
          id: userId,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          fullName: userData.fullName,
          emailVerified: true, // Skip email verification for test users
        })
        .returning()

      // Insert credential account record for password authentication
      await db.insert(schema.better_auth_accounts).values({
        id: accountId,
        userId: newUser.id,
        accountId: userData.email,
        providerId: 'credential',
        password: hashedPassword,
      })

      logger.info(`✅ Created test user with secure authentication: ${userData.email}`)
    } catch (error) {
      logger.error(`Error creating test user ${userData.email}:`, error)
    }
  }
}

async function createMinimalTestData(db: ReturnType<typeof drizzle>) {
  logger.info('🏃‍♂️ Creating minimal test data...')

  try {
    // Get test users
    const coach = await db
      .select()
      .from(schema.better_auth_users)
      .where(eq(schema.better_auth_users.email, 'testcoach@ultracoach.dev'))
      .limit(1)

    const runner = await db
      .select()
      .from(schema.better_auth_users)
      .where(eq(schema.better_auth_users.email, 'testrunner@ultracoach.dev'))
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

    const { db, pool } = await createTestDatabase()

    // Create test users
    await seedTestUsers(db)

    // Create minimal test data
    await createMinimalTestData(db)

    // Show summary
    const userCount = await db.$count(schema.better_auth_users)
    const planCount = await db.$count(schema.training_plans)
    const workoutCount = await db.$count(schema.workouts)

    console.log(`
    🧪 Test Database Seeding Results:
    ├── Users: ${userCount}
    ├── Training Plans: ${planCount}
    └── Workouts: ${workoutCount}
    `)

    await pool.end()

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
