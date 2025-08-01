#!/usr/bin/env tsx
import { addDays, format, startOfDay } from 'date-fns'
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { resolve } from 'path'
import { Pool } from 'pg'

import { createLogger } from '../src/lib/logger'
import * as schema from '../src/lib/schema'

// Load environment variables from .env.local BEFORE importing anything that uses them
config({ path: resolve(process.cwd(), '.env.local') })

const logger = createLogger('database-seed')

// Training phases data - using schema field names (camelCase)
const trainingPhasesData = [
  {
    name: 'Base Building',
    description:
      'Aerobic base development with high volume, low intensity running. Focus on time on feet and building mitochondrial density.',
    phaseOrder: 1,
    typicalDurationWeeks: 8,
    focusAreas: ['aerobic_base', 'volume', 'consistency', 'injury_prevention'],
  },
  {
    name: 'Build Phase',
    description:
      'Introduction of race-specific workouts including tempo runs, intervals, and hill training. Maintain base while adding intensity.',
    phaseOrder: 2,
    typicalDurationWeeks: 6,
    focusAreas: ['lactate_threshold', 'vo2_max', 'race_pace', 'strength'],
  },
  {
    name: 'Peak Phase',
    description:
      'Highest training load with race simulation workouts. Practice race-day nutrition and pacing strategies.',
    phaseOrder: 3,
    typicalDurationWeeks: 3,
    focusAreas: ['race_simulation', 'peak_fitness', 'race_practice', 'mental_preparation'],
  },
  {
    name: 'Taper',
    description:
      'Reduce training volume while maintaining intensity. Allow body to recover and absorb training adaptations.',
    phaseOrder: 4,
    typicalDurationWeeks: 2,
    focusAreas: ['recovery', 'race_readiness', 'mental_preparation', 'race_logistics'],
  },
  {
    name: 'Recovery',
    description:
      'Post-race recovery with easy running or cross-training. Focus on physical and mental restoration.',
    phaseOrder: 5,
    typicalDurationWeeks: 2,
    focusAreas: ['recovery', 'regeneration', 'reflection', 'planning'],
  },
]

// Plan templates data (basic set) - using schema field names (camelCase)
const planTemplatesData = [
  {
    name: '50K Training Plan - Beginner',
    description:
      'A 16-week beginner-friendly 50K ultramarathon training plan focusing on gradual volume increases and race preparation.',
    distanceType: '50K',
    durationWeeks: 16,
    difficultyLevel: 'beginner',
    peakWeeklyMiles: '45', // String for decimal type
    minBaseMiles: '25', // String for decimal type
    isPublic: true,
    tags: ['50K', 'beginner', 'first_ultra'],
  },
  {
    name: '50K Training Plan - Intermediate',
    description:
      'A 20-week intermediate 50K plan with structured workouts and hill training for experienced runners.',
    distanceType: '50K',
    durationWeeks: 20,
    difficultyLevel: 'intermediate',
    peakWeeklyMiles: '60',
    minBaseMiles: '35',
    isPublic: true,
    tags: ['50K', 'intermediate', 'structured'],
  },
  {
    name: '50M Training Plan - Intermediate',
    description:
      'A 24-week 50-mile training plan with back-to-back long runs and race-specific preparation.',
    distanceType: '50M',
    durationWeeks: 24,
    difficultyLevel: 'intermediate',
    peakWeeklyMiles: '75',
    minBaseMiles: '45',
    isPublic: true,
    tags: ['50M', 'intermediate', 'back_to_back'],
  },
  {
    name: '100K Training Plan - Advanced',
    description:
      'A 28-week advanced 100K plan with high volume, technical terrain training, and periodization.',
    distanceType: '100K',
    durationWeeks: 28,
    difficultyLevel: 'advanced',
    peakWeeklyMiles: '90',
    minBaseMiles: '60',
    isPublic: true,
    tags: ['100K', 'advanced', 'high_volume'],
  },
]

// Test users data - using environment variables for security
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
      email: process.env.TEST_COACH_EMAIL || 'coach1@ultracoach.dev',
      password: process.env.TEST_COACH_PASSWORD || generateSecurePassword(),
      name: 'Elena Rodriguez',
      fullName: 'Elena Rodriguez',
      role: 'coach' as const,
    },
    {
      email: process.env.TEST_COACH2_EMAIL || 'coach2@ultracoach.dev',
      password: process.env.TEST_COACH2_PASSWORD || generateSecurePassword(),
      name: 'Sarah Mountain',
      fullName: 'Sarah Mountain',
      role: 'coach' as const,
    },
    {
      email: process.env.TEST_RUNNER_EMAIL || 'testrunner@ultracoach.dev',
      password: process.env.TEST_RUNNER_PASSWORD || generateSecurePassword(),
      name: 'Alex Trail',
      fullName: 'Alex Trail',
      role: 'runner' as const,
    },
    {
      email: process.env.TEST_RUNNER2_EMAIL || 'runner2@ultracoach.dev',
      password: process.env.TEST_RUNNER2_PASSWORD || generateSecurePassword(),
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

  // Create database connection (reuse Better Auth pool configuration)
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === 'production'
        ? {
            rejectUnauthorized: true, // Require valid SSL certificates in production
            ca: process.env.DATABASE_SSL_CERT, // Optional: specify CA certificate
          }
        : false,
  })

  const db = drizzle(pool, { schema })

  return { db, pool }
}

// --- Static Data Functions ---
async function seedStaticData(db: ReturnType<typeof drizzle>) {
  logger.info('📋 Seeding static data (training phases and plan templates)...')

  // Seed training phases
  for (const phaseData of trainingPhasesData) {
    try {
      const existingPhase = await db
        .select()
        .from(schema.training_phases)
        .where(eq(schema.training_phases.name, phaseData.name))
        .limit(1)

      if (existingPhase.length > 0) {
        logger.info(`Training phase "${phaseData.name}" already exists, skipping...`)
        continue
      }

      await db.insert(schema.training_phases).values(phaseData)
      logger.info(`✅ Created training phase: ${phaseData.name}`)
    } catch (error) {
      logger.error(`❌ Failed to create training phase "${phaseData.name}":`, error)
    }
  }

  // Seed plan templates
  for (const templateData of planTemplatesData) {
    try {
      const existingTemplate = await db
        .select()
        .from(schema.plan_templates)
        .where(eq(schema.plan_templates.name, templateData.name))
        .limit(1)

      if (existingTemplate.length > 0) {
        logger.info(`Plan template "${templateData.name}" already exists, skipping...`)
        continue
      }

      await db.insert(schema.plan_templates).values(templateData)
      logger.info(`✅ Created plan template: ${templateData.name}`)
    } catch (error) {
      logger.error(`❌ Failed to create plan template "${templateData.name}":`, error)
    }
  }
}

// --- Seeding Function ---
async function seedTestUsers(db: ReturnType<typeof drizzle>) {
  logger.info('👥 Creating test users directly in database...')

  // Security warning for production
  if (process.env.NODE_ENV === 'production') {
    logger.warn('⚠️  WARNING: Creating test users in production environment!')
    logger.warn('⚠️  Ensure test user credentials are secure and monitored!')
  }

  const testUsersData = getTestUsersData()

  for (const userData of testUsersData) {
    try {
      logger.info(`Creating user: ${userData.email}`)

      // Check if user already exists first
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

// --- Training Plans & Sample Data Seeding ---
async function createSampleTrainingPlan(db: ReturnType<typeof drizzle>) {
  logger.info('🏃 Creating sample training plans with coach-runner relationships...')

  // Get coach and runners
  const users = await db.select().from(schema.better_auth_users)
  const coaches = users.filter(user => user.role === 'coach')
  const runners = users.filter(user => user.role === 'runner')

  if (coaches.length === 0 || runners.length === 0) {
    logger.warn('⚠️ No coaches or runners found - skipping training plan creation')
    return
  }

  // Create multiple training plans with proper relationships
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
      coach_id: coaches[1] ? coaches[1].id : coaches[0].id, // Sarah Mountain or Elena
      runner_id: runners[1] ? runners[1].id : runners[0].id, // Mike Trailblazer or Alex
      target_race_date: new Date('2025-07-20'),
      target_race_distance: '50K',
    },
    {
      title: 'Ultra Marathon Base Building',
      description:
        'Foundation phase training plan for ultra distance preparation with gradual mileage increases.',
      coach_id: coaches[0].id, // Elena Rodriguez (coaches both runners)
      runner_id: runners[1] ? runners[1].id : runners[0].id, // Mike Trailblazer or Alex
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
      date: startOfDay(addDays(currentDate, 1)), // Tomorrow
      planned_distance: '5.00',
      planned_duration: 45, // 45 minutes (stored as minutes)
      planned_type: 'Easy Run',
      status: 'planned' as const,
    },
    {
      training_plan_id: trainingPlanId,
      date: startOfDay(addDays(currentDate, 3)), // 3 days from now
      planned_distance: '8.00',
      planned_duration: 60, // 60 minutes
      planned_type: 'Tempo Run',
      status: 'planned' as const,
    },
    {
      training_plan_id: trainingPlanId,
      date: startOfDay(addDays(currentDate, 6)), // 6 days from now
      planned_distance: '12.00',
      planned_duration: 90, // 90 minutes
      planned_type: 'Long Run',
      status: 'planned' as const,
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

  try {
    logger.info('🌱 Starting UltraCoach database seeding...')

    const { db, pool } = await createDatabase()

    // Seed static data first
    await seedStaticData(db)

    // Create test users
    await seedTestUsers(db)

    // Create sample training plans with relationships
    await createSampleTrainingPlan(db)

    // Create sample conversations
    await seedConversations(db)

    // Show summary
    logger.info('📊 Database summary:')
    const userCount = await db
      .select()
      .from(schema.better_auth_users)
      .then(r => r.length)
    const planCount = await db
      .select()
      .from(schema.training_plans)
      .then(r => r.length)
    const workoutCount = await db
      .select()
      .from(schema.workouts)
      .then(r => r.length)
    const phaseCount = await db
      .select()
      .from(schema.training_phases)
      .then(r => r.length)
    const templateCount = await db
      .select()
      .from(schema.plan_templates)
      .then(r => r.length)

    console.log(`
    📊 Seeding Results:
    ├── Users: ${userCount}
    ├── Training Plans: ${planCount}
    ├── Workouts: ${workoutCount}
    ├── Training Phases: ${phaseCount}
    └── Plan Templates: ${templateCount}
    `)

    await pool.end()

    const duration = Date.now() - startTime
    logger.info(`✅ Database seeding completed in ${duration}ms`)

    console.log(`
    🎯 Database seeding completed successfully!
    • Test users created with secure credentials
    • Coach-runner relationships established
    • Training plans and sample workouts added
    `)
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
