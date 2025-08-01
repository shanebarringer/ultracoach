#!/usr/bin/env tsx
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { resolve } from 'path'
import { Pool } from 'pg'

import { createLogger } from '../src/lib/logger'
import * as schema from '../src/lib/schema'

// Load environment variables from .env.local FIRST
config({ path: resolve(process.cwd(), '.env.local') })

const logger = createLogger('database-seed')

// --- Data Definitions ---
const getTestUsersData = () => {
  const generateSecurePassword = () => Math.random().toString(36).slice(-16)
  return [
    {
      email: 'coach1@ultracoach.dev',
      password: process.env.TEST_COACH_PASSWORD || generateSecurePassword(),
      name: 'Elena Rodriguez',
      fullName: 'Elena Rodriguez',
      role: 'coach' as const,
    },
    {
      email: 'testrunner@ultracoach.dev',
      password: process.env.TEST_RUNNER_PASSWORD || generateSecurePassword(),
      name: 'Alex Trail',
      fullName: 'Alex Trail',
      role: 'runner' as const,
    },
    {
      email: 'coach2@ultracoach.dev',
      password: generateSecurePassword(),
      name: 'Sarah Mountain',
      fullName: 'Sarah Mountain',
      role: 'coach' as const,
    },
    {
      email: 'runner2@ultracoach.dev',
      password: generateSecurePassword(),
      name: 'Mike Trailblazer',
      fullName: 'Mike Trailblazer',
      role: 'runner' as const,
    },
  ]
}

// --- Database Setup ---
async function createDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required')
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const db = drizzle(pool, { schema })
  return { db, pool }
}

// --- Seeding Function ---
async function seedTestUsers(db: ReturnType<typeof drizzle>) {
  logger.info('👥 Creating test users directly in database...')

  const testUsersData = getTestUsersData()

  for (const userData of testUsersData) {
    try {
      logger.info(`Creating user: ${userData.email}`)
      const existingUser = await db
        .select()
        .from(schema.better_auth_users)
        .where(eq(schema.better_auth_users.email, userData.email))
        .limit(1)
      if (existingUser.length > 0) {
        logger.info(`User ${userData.email} already exists, skipping...`)
        continue
      }

      // Generate unique IDs
      const userId = `seed_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
      const accountId = `account_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

      // Generate a simple hash for the password (not secure, just for seeding)
      const hashedPassword = `hashed_${userData.password}_seed`

      // Insert user directly into database
      const [newUser] = await db
        .insert(schema.better_auth_users)
        .values({
          id: userId,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          fullName: userData.fullName,
          emailVerified: true, // Skip email verification for seeded users
        })
        .returning()

      // Insert a basic account record for email/password auth
      await db.insert(schema.better_auth_accounts).values({
        id: accountId,
        userId: newUser.id,
        accountId: userData.email,
        providerId: 'credential',
        password: hashedPassword,
      })

      logger.info(`✅ Created user: ${userData.email}`)
    } catch (error) {
      logger.error(`🚨 EXCEPTION while creating user ${userData.email}:`, error)
    }
  }
}

// --- Training Plans & Relationships Seeding ---
async function seedTrainingPlansAndRelationships(db: ReturnType<typeof drizzle>) {
  logger.info('🏃 Creating training plans and coach-runner relationships...')

  // Get all users
  const users = await db.select().from(schema.better_auth_users)
  const coaches = users.filter(user => user.role === 'coach')
  const runners = users.filter(user => user.role === 'runner')

  if (coaches.length === 0 || runners.length === 0) {
    logger.warn('⚠️ No coaches or runners found - skipping training plan creation')
    return
  }

  // Create training plans with coach-runner relationships
  const trainingPlansData = [
    {
      title: '100 Mile Ultra Training - Spring Peak',
      description:
        'Comprehensive 24-week training plan targeting a 100-mile ultramarathon with periodized training phases.',
      coach_id: coaches[0].id, // Elena Rodriguez
      runner_id: runners[0].id, // Alex Trail
      target_race_date: new Date('2025-09-15'),
      target_race_distance: '100 miles',
    },
    {
      title: '50K Trail Race Preparation',
      description:
        '16-week plan focused on trail running techniques, elevation training, and race strategy.',
      coach_id: coaches[1].id, // Sarah Mountain
      runner_id: runners[1].id, // Mike Trailblazer
      target_race_date: new Date('2025-07-20'),
      target_race_distance: '50K',
    },
    {
      title: 'Ultra Marathon Base Building',
      description:
        'Foundation phase training plan for ultra distance preparation with gradual mileage increases.',
      coach_id: coaches[0].id, // Elena Rodriguez (coaches both runners)
      runner_id: runners[1].id, // Mike Trailblazer
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
      logger.info(
        `✅ Created training plan: "${planData.title}" (Coach: ${coaches.find(c => c.id === planData.coach_id)?.email}, Runner: ${runners.find(r => r.id === planData.runner_id)?.email})`
      )

      // Create sample workouts for each training plan
      await seedSampleWorkouts(db, newPlan.id, planData.title)
    } catch (error) {
      logger.error(`🚨 Failed to create training plan "${planData.title}":`, error)
    }
  }
}

// --- Sample Workouts Seeding ---
async function seedSampleWorkouts(
  db: ReturnType<typeof drizzle>,
  trainingPlanId: string,
  planTitle: string
) {
  const currentDate = new Date()
  const workoutsData = [
    {
      training_plan_id: trainingPlanId,
      date: new Date(currentDate.getTime() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
      planned_distance: '5.00',
      planned_duration: 2700, // 45 minutes
      planned_type: 'Easy Run',
      status: 'planned' as const,
    },
    {
      training_plan_id: trainingPlanId,
      date: new Date(currentDate.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      planned_distance: '8.00',
      planned_duration: 3600, // 60 minutes
      planned_type: 'Tempo Run',
      status: 'planned' as const,
    },
    {
      training_plan_id: trainingPlanId,
      date: new Date(currentDate.getTime() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
      planned_distance: '12.00',
      planned_duration: 5400, // 90 minutes
      planned_type: 'Long Run',
      status: 'planned' as const,
    },
  ]

  try {
    await db.insert(schema.workouts).values(workoutsData)
    logger.info(`  ✅ Added ${workoutsData.length} sample workouts for "${planTitle}"`)
  } catch (error) {
    logger.error(`  ❌ Failed to create sample workouts for "${planTitle}":`, error)
  }
}

// --- Conversations Seeding ---
async function seedConversations(db: ReturnType<typeof drizzle>) {
  logger.info('💬 Creating sample conversations between coaches and runners...')

  // Get all users and training plans
  const users = await db.select().from(schema.better_auth_users)
  const coaches = users.filter(user => user.role === 'coach')
  const runners = users.filter(user => user.role === 'runner')
  const trainingPlans = await db.select().from(schema.training_plans)

  if (coaches.length === 0 || runners.length === 0 || trainingPlans.length === 0) {
    logger.warn('⚠️ Insufficient data for conversations - skipping conversation creation')
    return
  }

  // Create conversations
  const conversationsData = [
    {
      coach_id: coaches[0].id, // Elena Rodriguez
      runner_id: runners[0].id, // Alex Trail
      training_plan_id: trainingPlans[0].id,
      title: 'Training Progress Check-in',
    },
    {
      coach_id: coaches[1].id, // Sarah Mountain
      runner_id: runners[1].id, // Mike Trailblazer
      training_plan_id: trainingPlans[1].id,
      title: 'Trail Running Technique Discussion',
    },
  ]

  for (const convData of conversationsData) {
    try {
      const existingConv = await db
        .select()
        .from(schema.conversations)
        .where(eq(schema.conversations.title, convData.title))
        .limit(1)

      if (existingConv.length > 0) {
        logger.info(`Conversation "${convData.title}" already exists, skipping...`)
        continue
      }

      const [newConv] = await db.insert(schema.conversations).values(convData).returning()
      const coach = coaches.find(c => c.id === convData.coach_id)
      const runner = runners.find(r => r.id === convData.runner_id)
      logger.info(
        `✅ Created conversation: "${convData.title}" (${coach?.name} ↔ ${runner?.name})`
      )
    } catch (error) {
      logger.error(`🚨 Failed to create conversation "${convData.title}":`, error)
    }
  }
}

// --- Main Execution ---
async function main() {
  const startTime = Date.now()
  logger.info('🌱 Starting UltraCoach database seeding...')

  try {
    const { db, pool } = await createDatabase()

    try {
      await seedTestUsers(db)
      await seedTrainingPlansAndRelationships(db)
      await seedConversations(db)
      logger.info('✅ Database seeding completed successfully!')
    } finally {
      await pool.end()
      const duration = Date.now() - startTime
      logger.info(`Seeding finished in ${duration}ms`)
    }
  } catch (error) {
    logger.error('❌ Database seeding failed:', error)
    // In test environment, don't exit process
    if (process.env.NODE_ENV === 'test') {
      throw error
    }
    process.exit(1)
  }
}

// Only run main() if not in test environment or when required directly
if (process.env.NODE_ENV !== 'test' && require.main === module) {
  main()
}

// Export for testing
export { main as seedDatabase }
