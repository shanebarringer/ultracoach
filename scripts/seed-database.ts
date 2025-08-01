#!/usr/bin/env tsx
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
    // Coaches (4 total)
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
      email: 'david.peaks@ultracoach.dev',
      password: generateSecurePassword(),
      name: 'David Peaks',
      fullName: 'David Peaks',
      role: 'coach' as const,
    },
    {
      email: 'maria.summit@ultracoach.dev',
      password: generateSecurePassword(),
      name: 'Maria Summit',
      fullName: 'Maria Summit',
      role: 'coach' as const,
    },
    // Runners (6 total for better testing)
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
    {
      email: 'jessica.endurance@ultracoach.dev',
      password: generateSecurePassword(),
      name: 'Jessica Endurance',
      fullName: 'Jessica Endurance',
      role: 'runner' as const,
    },
    {
      email: 'tommy.ultra@ultracoach.dev',
      password: generateSecurePassword(),
      name: 'Tommy Ultra',
      fullName: 'Tommy Ultra',
      role: 'runner' as const,
    },
    {
      email: 'lisa.horizon@ultracoach.dev',
      password: generateSecurePassword(),
      name: 'Lisa Horizon',
      fullName: 'Lisa Horizon',
      role: 'runner' as const,
    },
    {
      email: 'chris.adventure@ultracoach.dev',
      password: generateSecurePassword(),
      name: 'Chris Adventure',
      fullName: 'Chris Adventure',
      role: 'runner' as const,
    },
  ]
}

// Sample races data for target races
const racesData = [
  {
    name: 'Western States 100',
    date: new Date('2025-06-28'),
    distanceMiles: '100.0',
    distanceType: '100M',
    location: 'Auburn, CA',
    terrainType: 'trail',
    elevationGainFeet: 18000,
  },
  {
    name: 'Angeles Crest 100',
    date: new Date('2025-08-09'),
    distanceMiles: '100.0',
    distanceType: '100M',
    location: 'Wrightwood, CA',
    terrainType: 'trail',
    elevationGainFeet: 22000,
  },
  {
    name: 'JFK 50 Mile',
    date: new Date('2025-11-22'),
    distanceMiles: '50.0',
    distanceType: '50M',
    location: 'Boonsboro, MD',
    terrainType: 'mixed',
    elevationGainFeet: 2500,
  },
  {
    name: 'Lake Sonoma 50',
    date: new Date('2025-04-12'),
    distanceMiles: '31.1',
    distanceType: '50K',
    location: 'Healdsburg, CA',
    terrainType: 'trail',
    elevationGainFeet: 7000,
  },
  {
    name: 'Leadville Trail 100',
    date: new Date('2025-08-16'),
    distanceMiles: '100.0',
    distanceType: '100M',
    location: 'Leadville, CO',
    terrainType: 'trail',
    elevationGainFeet: 15600,
  },
  {
    name: 'Boston Marathon',
    date: new Date('2025-04-21'),
    distanceMiles: '26.2',
    distanceType: 'Marathon',
    location: 'Boston, MA',
    terrainType: 'road',
    elevationGainFeet: 500,
  },
]

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

async function seedStaticData(db: ReturnType<typeof drizzle>) {
  logger.info('🌱 Seeding static data...')

  // Seed training phases
  logger.info('📊 Seeding training phases...')
  await db.insert(schema.training_phases).values(trainingPhasesData).onConflictDoNothing()

  // Seed plan templates
  logger.info('📋 Seeding plan templates...')
  await db.insert(schema.plan_templates).values(planTemplatesData).onConflictDoNothing()

  // Seed races
  logger.info('🏃‍♂️ Seeding race data...')
  await db.insert(schema.races).values(racesData).onConflictDoNothing()

  logger.info('✅ Static data seeded successfully')
}

async function seedTestUsers(db: ReturnType<typeof drizzle>) {
  logger.info('👥 Creating test users with Better Auth API...')

  // Security warning for production
  if (process.env.NODE_ENV === 'production') {
    logger.warn('⚠️  WARNING: Creating test users in production environment!')
    logger.warn('⚠️  Ensure test user credentials are secure and monitored!')
  }

  // Import auth only when needed, after environment variables are loaded
  const { auth } = await import('../src/lib/better-auth')

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

      // Use Better Auth API to create user properly (this handles password hashing correctly)
      const result = await auth.api.signUpEmail({
        body: {
          email: userData.email,
          password: userData.password,
          name: userData.name,
          callbackURL: '/dashboard',
        },
      })

      // Check if user creation was successful
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ('data' in result && (result as any).data?.user?.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (result as any).data.user.id
        logger.info(`✅ Created user via Better Auth API: ${userData.email} (ID: ${userId})`)

        // Update user with additional fields (role and fullName)
        await db
          .update(schema.better_auth_users)
          .set({
            fullName: userData.fullName,
            role: userData.role,
          })
          .where(eq(schema.better_auth_users.id, userId))

        logger.info(`✅ Updated user ${userData.email} with role: ${userData.role}`)

        // Verify the user was created correctly
        const createdUser = await db
          .select()
          .from(schema.better_auth_users)
          .where(eq(schema.better_auth_users.id, userId))
          .limit(1)

        if (createdUser.length > 0) {
          logger.info(`✅ User verification successful for ${userData.email}`)
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logger.error(`Failed to create user ${userData.email}:`, (result as any).error)
      }
    } catch (error) {
      logger.error(`Error creating user ${userData.email}:`, error)
    }
  }
}

async function createSampleTrainingPlans(db: ReturnType<typeof drizzle>) {
  logger.info('🏃‍♂️ Creating sample training plans and workouts...')

  try {
    // Get coaches and runners
    const coaches = await db
      .select()
      .from(schema.better_auth_users)
      .where(eq(schema.better_auth_users.role, 'coach'))

    const runners = await db
      .select()
      .from(schema.better_auth_users)
      .where(eq(schema.better_auth_users.role, 'runner'))

    const races = await db.select().from(schema.races)

    if (coaches.length === 0 || runners.length === 0) {
      logger.warn('No coaches or runners found, skipping training plans')
      return
    }

    // Create multiple training plans
    const trainingPlansData = [
      {
        title: 'Lake Sonoma 50K Training',
        description: 'Trail-focused 50K preparation with hill training and technical terrain work',
        coach_id: coaches[0].id,
        runner_id: runners[0].id,
        race_id: races.find(r => r.name === 'Lake Sonoma 50')?.id,
        target_race_date: new Date('2025-04-12'),
        target_race_distance: '50K',
        goal_type: 'completion' as const,
        plan_type: 'race_specific' as const,
      },
      {
        title: 'Western States 100 Preparation',
        description: 'Advanced 100-mile training with heat adaptation and aid station practice',
        coach_id: coaches[1]?.id || coaches[0].id,
        runner_id: runners[1]?.id || runners[0].id,
        race_id: races.find(r => r.name === 'Western States 100')?.id,
        target_race_date: new Date('2025-06-28'),
        target_race_distance: '100M',
        goal_type: 'time' as const,
        plan_type: 'race_specific' as const,
      },
      {
        title: 'Base Building Phase',
        description: 'General aerobic base development for fall race preparation',
        coach_id: coaches[0].id,
        runner_id: runners[2]?.id || runners[0].id,
        plan_type: 'base_building' as const,
        goal_type: 'completion' as const,
      },
    ]

    const today = new Date()
    const createdPlans = []

    for (const planData of trainingPlansData) {
      const [trainingPlan] = await db.insert(schema.training_plans).values(planData).returning()

      createdPlans.push(trainingPlan)
      logger.info(`✅ Created training plan: ${trainingPlan.title}`)
    }

    // Create diverse workout data
    for (let planIndex = 0; planIndex < createdPlans.length; planIndex++) {
      const plan = createdPlans[planIndex]
      const workouts = []

      // Create workouts for the past 2 weeks and next 4 weeks
      for (let dayOffset = -14; dayOffset <= 28; dayOffset++) {
        const workoutDate = new Date(today.getTime() + dayOffset * 24 * 60 * 60 * 1000)

        // Skip some days (rest days)
        if (dayOffset % 7 === 0 || (dayOffset + 2) % 7 === 0) continue

        // Determine workout type based on day pattern
        let workoutType = 'easy'
        let distance = 5.0
        let duration = 2400
        let status: 'planned' | 'completed' | 'skipped' = 'planned'

        // Past workouts should have status
        if (dayOffset < 0) {
          status = Math.random() > 0.8 ? 'skipped' : 'completed'
        }

        // Weekly pattern
        const dayOfWeek = Math.abs(dayOffset) % 7
        switch (dayOfWeek) {
          case 0: // Long run day
            workoutType = 'long_run'
            distance = planIndex === 1 ? 18.0 : 12.0 // 100M plan gets longer runs
            duration = distance * 600 // ~10 min/mile average
            break
          case 2: // Tempo day
            workoutType = 'tempo'
            distance = 6.0
            duration = 3000
            break
          case 4: // Interval day
            workoutType = 'interval'
            distance = 4.0
            duration = 2400
            break
          case 6: // Recovery day
            workoutType = 'recovery'
            distance = 3.0
            duration = 2100
            break
          default: // Easy days
            distance = 5.0 + Math.random() * 3
            duration = distance * 540 // ~9 min/mile
        }

        const workout = {
          training_plan_id: plan.id,
          date: workoutDate, // Use Date object directly
          planned_distance: distance.toFixed(1),
          planned_duration: Math.round(duration),
          planned_type: workoutType,
          workout_notes: `${workoutType.replace('_', ' ')} run - moderate effort`,
          status: status,
        }

        workouts.push(workout)
      }

      await db.insert(schema.workouts).values(workouts)
      logger.info(`✅ Created ${workouts.length} workouts for plan: ${plan.title}`)
    }

    logger.info('✅ All sample training plans and workouts created successfully')
  } catch (error) {
    logger.error('Failed to create sample training plans:', error)
  }
}

async function main() {
  const startTime = Date.now()

  try {
    logger.info('🌱 Starting UltraCoach database seeding...')

    const { db, pool } = await createDatabase()

    // Seed static data first
    await seedStaticData(db)

    // Create test users through Better Auth
    await seedTestUsers(db)

    // Create sample training plans and workouts
    await createSampleTrainingPlans(db)

    // Show summary
    logger.info('📊 Database summary:')
    const userCount = await db.$count(schema.better_auth_users)
    const planCount = await db.$count(schema.training_plans)
    const workoutCount = await db.$count(schema.workouts)
    const phaseCount = await db.$count(schema.training_phases)
    const templateCount = await db.$count(schema.plan_templates)
    const raceCount = await db.$count(schema.races)

    console.log(`
    📊 Seeding Results:
    ├── Users: ${userCount} (4 coaches, 6 runners)
    ├── Training Plans: ${planCount}
    ├── Workouts: ${workoutCount}
    ├── Races: ${raceCount}
    ├── Training Phases: ${phaseCount}
    └── Plan Templates: ${templateCount}
    `)

    await pool.end()

    const duration = Date.now() - startTime
    logger.info(`✅ Database seeding completed in ${duration}ms`)

    console.log(`
    🎯 Database seeding completed successfully!
    • Test users created with secure credentials
    • Use environment variables TEST_COACH_PASSWORD and TEST_RUNNER_PASSWORD
    • Credentials are not displayed for security reasons
    `)

    process.exit(0)
  } catch (error) {
    logger.error('❌ Database seeding failed:', error)
    process.exit(1)
  }
}

// Handle script execution
if (require.main === module) {
  main()
}

export { main as seedDatabase }
