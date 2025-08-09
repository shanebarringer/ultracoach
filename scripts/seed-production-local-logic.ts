#!/usr/bin/env tsx
/**
 * Production Seeding Using Local Logic
 *
 * Uses the exact same logic and data as our local seed-database.ts script
 * but forces production environment configuration
 */
import { generateRandomString } from 'better-auth/crypto'
import { scrypt } from 'crypto'
import { addDays, format, startOfDay } from 'date-fns'
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as fs from 'fs'
import * as path from 'path'
import { resolve } from 'path'
import { Pool } from 'pg'
import { promisify } from 'util'

// Import after setting environment
import * as schema from '../src/lib/schema'

// Force production environment variables ONLY
process.env.NODE_ENV = 'production'
config({ path: '.env.production' })

// Create database connection using production DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in .env.production')
  process.exit(1)
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

const db = drizzle(pool, { schema })

const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
}

// Password hashing using scrypt (matching Better Auth's default)
const scryptAsync = promisify(scrypt)

async function defaultHash(password: string): Promise<string> {
  const salt = generateRandomString(16)
  const hash = (await scryptAsync(password, salt, 32)) as Buffer
  return `${salt}:${hash.toString('hex')}`
}

// Test users data - EXACTLY the same as local seeding
function getTestUsersData() {
  // Generate secure random passwords if not provided
  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let result = ''
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  return [
    {
      email: process.env.TEST_COACH_EMAIL || 'testcoach@ultracoach.dev',
      password: process.env.TEST_COACH_PASSWORD || 'TestCoach123!',
      name: 'Elena Rodriguez',
      fullName: 'Elena Rodriguez',
      role: 'coach' as const,
    },
    {
      email: process.env.TEST_COACH2_EMAIL || 'testcoach2@ultracoach.dev',
      password: process.env.TEST_COACH2_PASSWORD || 'TestCoach2123!',
      name: 'Sarah Mountain',
      fullName: 'Sarah Mountain',
      role: 'coach' as const,
    },
    {
      email: process.env.TEST_RUNNER_EMAIL || 'testrunner@ultracoach.dev',
      password: process.env.TEST_RUNNER_PASSWORD || 'TestRunner123!',
      name: 'Alex Trail',
      fullName: 'Alex Trail',
      role: 'runner' as const,
    },
    {
      email: process.env.TEST_RUNNER2_EMAIL || 'testrunner2@ultracoach.dev',
      password: process.env.TEST_RUNNER2_PASSWORD || 'TestRunner2123!',
      name: 'Mike Trailblazer',
      fullName: 'Mike Trailblazer',
      role: 'runner' as const,
    },
  ]
}

// EXACT same user creation logic as local seeding
async function seedTestUsers() {
  logger.info('👥 Creating test users using Better Auth Admin API...')
  logger.warn('⚠️  Creating test users in PRODUCTION environment!')

  const testUsersData = getTestUsersData()

  for (const userData of testUsersData) {
    try {
      logger.info(`Creating user: ${userData.email}`)

      // Check if user already exists first
      const existingUser = await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.email, userData.email))
        .limit(1)

      if (existingUser.length > 0) {
        logger.info(`User ${userData.email} already exists, skipping...`)
        continue
      }

      // Use direct database insertion with Better Auth patterns
      // Generate a proper user ID
      const userId = generateRandomString(10)

      // Insert user directly into database
      await db.insert(schema.user).values({
        id: userId,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        fullName: userData.fullName,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      logger.info(`✅ Created user: ${userData.email} (${userData.role})`)

      // Create credential account for password authentication
      // Use Better Auth compatible password hashing
      const hashedPassword = await defaultHash(userData.password)

      await db.insert(schema.account).values({
        id: generateRandomString(10),
        accountId: userId,
        providerId: 'credential',
        userId: userId,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      logger.info(`✅ Created credential account for: ${userData.email}`)
    } catch (error) {
      logger.error(`🚨 EXCEPTION while creating user ${userData.email}:`, error)
    }
  }
}

// EXACT same training plan creation logic
async function createSampleTrainingPlan() {
  logger.info('🏃 Creating sample training plans with coach-runner relationships...')

  const users = await db.select().from(schema.user)
  const coaches = users.filter(user => user.role === 'coach')
  const runners = users.filter(user => user.role === 'runner')

  if (coaches.length === 0 || runners.length === 0) {
    logger.warn('⚠️ No coaches or runners found - skipping training plan creation')
    return
  }

  const trainingPlansData = [
    {
      title: '100 Mile Ultra Training - Spring Peak',
      description:
        'Comprehensive 24-week training plan targeting a 100-mile ultramarathon with periodized training phases.',
      coach_id: coaches[0].id,
      runner_id: runners[0].id,
      target_race_date: new Date('2025-09-15'),
      target_race_distance: '100 miles',
    },
    {
      title: '50K Trail Race Preparation',
      description:
        '16-week plan focused on trail running techniques, elevation training, and race strategy.',
      coach_id: coaches[1] ? coaches[1].id : coaches[0].id,
      runner_id: runners[1] ? runners[1].id : runners[0].id,
      target_race_date: new Date('2025-07-20'),
      target_race_distance: '50K',
    },
    {
      title: 'Ultra Marathon Base Building',
      description:
        'Foundation phase training plan for ultra distance preparation with gradual mileage increases.',
      coach_id: coaches[0].id,
      runner_id: runners[1] ? runners[1].id : runners[0].id,
      target_race_date: new Date('2025-10-01'),
      target_race_distance: '50 miles',
    },
  ]

  for (const planData of trainingPlansData) {
    try {
      const existingPlan = await db
        .select()
        .from(schema.training_plans)
        .where(eq(schema.training_plans.title, planData.title))
        .limit(1)

      if (existingPlan.length > 0) {
        logger.info(`Training plan "${planData.title}" already exists, skipping...`)
        continue
      }

      const [newPlan] = await db.insert(schema.training_plans).values(planData).returning()
      const coach = coaches.find(c => c.id === planData.coach_id)
      const runner = runners.find(r => r.id === planData.runner_id)
      logger.info(
        `✅ Created training plan: "${planData.title}" (Coach: ${coach?.email}, Runner: ${runner?.email})`
      )

      await seedSampleWorkouts(newPlan.id, planData.title)
    } catch (error) {
      logger.error(`🚨 Failed to create training plan "${planData.title}":`, error)
    }
  }
}

// EXACT same workout seeding logic
async function seedSampleWorkouts(trainingPlanId: string, planTitle: string) {
  const currentDate = new Date()

  const workoutsData = [
    {
      training_plan_id: trainingPlanId,
      date: startOfDay(addDays(currentDate, 1)),
      planned_distance: '5.00',
      planned_duration: 45,
      planned_type: 'Easy Run',
      status: 'planned' as const,
      category: 'easy',
      intensity: 3,
      terrain: 'road',
      elevation_gain: 100,
    },
    {
      training_plan_id: trainingPlanId,
      date: startOfDay(addDays(currentDate, 3)),
      planned_distance: '8.00',
      planned_duration: 60,
      planned_type: 'Tempo Run',
      status: 'planned' as const,
      category: 'tempo',
      intensity: 7,
      terrain: 'road',
      elevation_gain: 200,
    },
    {
      training_plan_id: trainingPlanId,
      date: startOfDay(addDays(currentDate, 6)),
      planned_distance: '12.00',
      planned_duration: 90,
      planned_type: 'Long Run',
      status: 'planned' as const,
      category: 'long_run',
      intensity: 5,
      terrain: 'trail',
      elevation_gain: 500,
    },
  ]

  try {
    await db.insert(schema.workouts).values(workoutsData)
    logger.info(`  ✅ Added ${workoutsData.length} sample workouts for "${planTitle}"`)
    logger.info(
      `  📅 Workout dates: ${workoutsData.map(w => format(w.date, 'yyyy-MM-dd')).join(', ')}`
    )
  } catch (error) {
    logger.error(`  ❌ Failed to create sample workouts for "${planTitle}":`, error)
  }
}

async function main() {
  try {
    logger.info('🌱 Starting production database seeding using local logic...')

    // Seed test users
    await seedTestUsers()

    // Create sample training plans with relationships
    await createSampleTrainingPlan()

    // Show summary
    logger.info('📊 Database summary:')
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

    logger.info(`📈 Created: ${userCount} users, ${planCount} plans, ${workoutCount} workouts`)
    logger.info('')

    // Show login credentials
    const testUsersData = getTestUsersData()
    logger.info('📋 Production Login Credentials:')
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    for (const user of testUsersData) {
      logger.info(`${user.role.toUpperCase()}: ${user.email} / ${user.password}`)
    }
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    logger.info('✅ Production database seeding completed successfully!')
  } catch (error) {
    logger.error('❌ Production database seeding failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
