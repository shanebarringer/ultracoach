#!/usr/bin/env tsx

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local BEFORE importing anything that uses them
config({ path: resolve(process.cwd(), '.env.local') })

import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { Pool } from 'pg'
import { seed, reset } from 'drizzle-seed'
import { createLogger } from '../src/lib/logger'
import * as schema from '../src/lib/schema'

const logger = createLogger('database-seed')

// Training phases data - using schema field names (camelCase)
const trainingPhasesData = [
  {
    name: 'Base Building',
    description: 'Aerobic base development with high volume, low intensity running. Focus on time on feet and building mitochondrial density.',
    phaseOrder: 1,
    typicalDurationWeeks: 8,
    focusAreas: ['aerobic_base', 'volume', 'consistency', 'injury_prevention'],
  },
  {
    name: 'Build Phase',
    description: 'Introduction of race-specific workouts including tempo runs, intervals, and hill training. Maintain base while adding intensity.',
    phaseOrder: 2,
    typicalDurationWeeks: 6,
    focusAreas: ['lactate_threshold', 'vo2_max', 'race_pace', 'strength'],
  },
  {
    name: 'Peak Phase',
    description: 'Highest training load with race simulation workouts. Practice race-day nutrition and pacing strategies.',
    phaseOrder: 3,
    typicalDurationWeeks: 3,
    focusAreas: ['race_simulation', 'peak_fitness', 'race_practice', 'mental_preparation'],
  },
  {
    name: 'Taper',
    description: 'Reduce training volume while maintaining intensity. Allow body to recover and absorb training adaptations.',
    phaseOrder: 4,
    typicalDurationWeeks: 2,
    focusAreas: ['recovery', 'race_readiness', 'mental_preparation', 'race_logistics'],
  },
  {
    name: 'Recovery',
    description: 'Post-race recovery with easy running or cross-training. Focus on physical and mental restoration.',
    phaseOrder: 5,
    typicalDurationWeeks: 2,
    focusAreas: ['recovery', 'regeneration', 'reflection', 'planning'],
  },
]

// Plan templates data (basic set) - using schema field names (camelCase)
const planTemplatesData = [
  {
    name: '50K Training Plan - Beginner',
    description: 'A 16-week beginner-friendly 50K ultramarathon training plan focusing on gradual volume increases and race preparation.',
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
    description: 'A 20-week intermediate 50K plan with structured workouts and hill training for experienced runners.',
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
    description: 'A 24-week 50-mile training plan with back-to-back long runs and race-specific preparation.',
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
    description: 'A 28-week advanced 100K plan with high volume, technical terrain training, and periodization.',
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
      email: process.env.TEST_COACH_EMAIL || 'testcoach@ultracoach.dev',
      password: process.env.TEST_COACH_PASSWORD || generateSecurePassword(),
      name: 'Test Coach',
      fullName: 'Test Coach User',
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
      name: 'Test Runner',
      fullName: 'Test Runner User', 
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

async function createDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  // Create database connection (reuse Better Auth pool configuration)
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: true, // Require valid SSL certificates in production
      ca: process.env.DATABASE_SSL_CERT, // Optional: specify CA certificate
    } : false,
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
      const existingUser = await db.select().from(schema.better_auth_users).where(eq(schema.better_auth_users.email, userData.email)).limit(1)

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
      if ('data' in result && (result as any).data?.user?.id) {
        const userId = (result as any).data.user.id
        logger.info(`✅ Created user via Better Auth API: ${userData.email} (ID: ${userId})`)
        
        // Update user with additional fields (role and fullName)
        await db.update(schema.better_auth_users)
          .set({ 
            fullName: userData.fullName,
            role: userData.role 
          })
          .where(eq(schema.better_auth_users.id, userId))
        
        logger.info(`✅ Updated user ${userData.email} with role: ${userData.role}`)
        
        // Verify the user was created correctly
        const createdUser = await db.select().from(schema.better_auth_users).where(eq(schema.better_auth_users.id, userId)).limit(1)
        
        if (createdUser.length > 0) {
          logger.info(`✅ User verification successful for ${userData.email}`)
        }
        
      } else {
        logger.error(`Failed to create user ${userData.email}:`, (result as any).error)
      }

    } catch (error) {
      logger.error(`Error creating user ${userData.email}:`, error)
    }
  }
}

async function createSampleTrainingPlan(db: ReturnType<typeof drizzle>) {
  logger.info('🏃‍♂️ Creating sample training plan...')

  try {
    // Get coach and runner
    const [coach] = await db.select().from(schema.better_auth_users).where(eq(schema.better_auth_users.email, 'testcoach@ultracoach.dev')).limit(1)

    const [runner] = await db.select().from(schema.better_auth_users).where(eq(schema.better_auth_users.email, 'testrunner@ultracoach.dev')).limit(1)

    if (!coach || !runner) {
      logger.warn('Coach or runner not found, skipping sample training plan')
      return
    }

    // Create training plan
    const [trainingPlan] = await db.insert(schema.training_plans).values({
      title: 'Sample 50K Training Plan',
      description: 'A beginner-friendly 50K training plan for testing purposes',
      coach_id: coach.id,  // Use database column name
      runner_id: runner.id, // Use database column name
      target_race_date: new Date('2025-09-15'),
      target_race_distance: '50K',
    }).returning()

    // Create sample workouts
    const today = new Date()
    const workouts = [
      {
        training_plan_id: trainingPlan.id, // Use database column name
        date: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
        planned_distance: '5.0', // Use database column name and string for decimal
        planned_duration: 2400, // 40 minutes in seconds
        planned_type: 'easy', // Use database column name
        status: 'planned' as const,
      },
      {
        training_plan_id: trainingPlan.id, // Use database column name
        date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        planned_distance: '8.0', // Use database column name and string for decimal
        planned_duration: 4800, // 80 minutes in seconds
        planned_type: 'long_run', // Use database column name
        status: 'planned' as const,
      },
      {
        training_plan_id: trainingPlan.id, // Use database column name
        date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        planned_distance: '3.0', // Use database column name and string for decimal
        planned_duration: 1800, // 30 minutes in seconds
        planned_type: 'recovery', // Use database column name
        status: 'planned' as const,
      },
    ]

    await db.insert(schema.workouts).values(workouts)

    logger.info(`✅ Created sample training plan: ${trainingPlan.title}`)
  } catch (error) {
    logger.error('Failed to create sample training plan:', error)
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
    
    // Create sample training plan
    await createSampleTrainingPlan(db)

    // Show summary
    logger.info('📊 Database summary:')
    const userCount = await db.$count(schema.better_auth_users)
    const planCount = await db.$count(schema.training_plans)
    const workoutCount = await db.$count(schema.workouts)
    const phaseCount = await db.$count(schema.training_phases)
    const templateCount = await db.$count(schema.plan_templates)

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
    🎯 Ready to test authentication with:
    • testcoach@ultracoach.dev (use TEST_COACH_PASSWORD env var)
    • testrunner@ultracoach.dev (use TEST_RUNNER_PASSWORD env var)
    • Note: If env vars not set, secure random passwords were generated during seeding
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