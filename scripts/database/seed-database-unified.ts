#!/usr/bin/env tsx
/**
 * Unified Database Seed Script for UltraCoach
 *
 * This script handles ALL seeding requirements for local development:
 * 1. Creates test users via Better Auth API (proper password hashing)
 * 2. Seeds static data (training phases, plan templates)
 * 3. Creates coach-runner relationships
 * 4. Creates sample training plans and workouts
 * 5. Creates sample conversations
 *
 * IMPORTANT: Requires the dev server to be running on port 3001
 *
 * Usage:
 *   pnpm db:seed          # Local development seeding
 *   pnpm db:fresh         # Reset database and seed fresh (supabase db reset + seed)
 */
import { randomUUID } from 'crypto'
import { addDays, format, startOfDay } from 'date-fns'
import { config } from 'dotenv'
import { and, eq, sql } from 'drizzle-orm'
import * as fs from 'fs'
import { resolve } from 'path'

import { db } from '../../src/lib/database'
import { createLogger } from '../../src/lib/logger'
import * as schema from '../../src/lib/schema'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const logger = createLogger('database-seed')

const BASE_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3001'

// =============================================================================
// TEST USER DEFINITIONS
// =============================================================================

// Use environment variables for passwords (with fallbacks)
const COACH_PASSWORD = process.env.TEST_COACH_PASSWORD || 'UltraCoach2025!'
const RUNNER_PASSWORD = process.env.TEST_RUNNER_PASSWORD || 'RunnerPass2025!'

const TEST_USERS = [
  // Primary test users (used by Playwright tests)
  {
    email: 'emma@ultracoach.dev',
    password: COACH_PASSWORD,
    name: 'Emma Mountain',
    role: 'coach' as const,
    isPrimary: true,
  },
  {
    email: 'alex.rivera@ultracoach.dev',
    password: RUNNER_PASSWORD,
    name: 'Alex Rivera',
    role: 'runner' as const,
    isPrimary: true,
  },
  {
    email: 'riley.parker@ultracoach.dev',
    password: RUNNER_PASSWORD,
    name: 'Riley Parker',
    role: 'runner' as const,
    isPrimary: true,
  },
  // Additional coaches
  {
    email: 'sarah.martinez@ultracoach.dev',
    password: COACH_PASSWORD,
    name: 'Sarah Martinez',
    role: 'coach' as const,
    isPrimary: false,
  },
  {
    email: 'michael.chen@ultracoach.dev',
    password: COACH_PASSWORD,
    name: 'Michael Chen',
    role: 'coach' as const,
    isPrimary: false,
  },
  // Additional runners
  {
    email: 'jordan.chen@ultracoach.dev',
    password: RUNNER_PASSWORD,
    name: 'Jordan Chen',
    role: 'runner' as const,
    isPrimary: false,
  },
  {
    email: 'casey.johnson@ultracoach.dev',
    password: RUNNER_PASSWORD,
    name: 'Casey Johnson',
    role: 'runner' as const,
    isPrimary: false,
  },
  {
    email: 'taylor.smith@ultracoach.dev',
    password: RUNNER_PASSWORD,
    name: 'Taylor Smith',
    role: 'runner' as const,
    isPrimary: false,
  },
  {
    email: 'morgan.davis@ultracoach.dev',
    password: RUNNER_PASSWORD,
    name: 'Morgan Davis',
    role: 'runner' as const,
    isPrimary: false,
  },
]

// =============================================================================
// STATIC DATA DEFINITIONS
// =============================================================================

const TRAINING_PHASES = [
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

const PLAN_TEMPLATES = [
  {
    name: '50K Training Plan - Beginner',
    description:
      'A 16-week beginner-friendly 50K ultramarathon training plan focusing on gradual volume increases and race preparation.',
    distanceType: '50K',
    durationWeeks: 16,
    difficultyLevel: 'beginner',
    peakWeeklyMiles: '45',
    minBaseMiles: '25',
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

// =============================================================================
// SERVER HEALTH CHECK
// =============================================================================

async function checkServerHealth(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${BASE_URL}/api/health`, {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    return response.ok
  } catch {
    return false
  }
}

// =============================================================================
// USER CREATION VIA BETTER AUTH API
// =============================================================================

async function createUserViaAPI(userData: (typeof TEST_USERS)[0]): Promise<boolean> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        userType: userData.role,
      }),
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      // User already exists is OK
      if (response.status === 400 && errorText.includes('ALREADY_EXISTS')) {
        return true
      }
      logger.warn(`Failed to create user ${userData.email}: ${errorText}`)
      return false
    }

    return true
  } catch (error) {
    clearTimeout(timeoutId)
    logger.error(`Error creating user ${userData.email}:`, error)
    return false
  }
}

async function cleanupExistingUser(email: string): Promise<void> {
  const existingUser = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1)

  if (existingUser.length > 0) {
    const userId = existingUser[0].id

    // Delete related records first (foreign key constraints)
    try {
      await db.execute(sql`DELETE FROM strava_connections WHERE user_id = ${userId}`)
      await db.delete(schema.account).where(eq(schema.account.userId, userId))
      await db.delete(schema.user).where(eq(schema.user.id, userId))
      logger.info(`  Cleaned up existing user: ${email}`)
    } catch (error) {
      logger.warn(`  Could not fully clean up ${email}:`, (error as Error).message)
    }
  }
}

async function seedUsers(): Promise<void> {
  logger.info('👥 Creating test users via Better Auth API...')

  // Clean up existing users first
  logger.info('  Cleaning up existing test users...')
  for (const userData of TEST_USERS) {
    await cleanupExistingUser(userData.email)
  }

  // Create users via API (proper password hashing)
  let successCount = 0
  for (const userData of TEST_USERS) {
    const success = await createUserViaAPI(userData)
    if (success) {
      successCount++
      logger.info(`  ✅ Created user: ${userData.email} (${userData.role})`)
    }
  }

  // Fix role and userType mapping in database
  logger.info('  Fixing Better Auth role/userType mapping...')

  // Coaches: role='user', userType='coach'
  const coachEmails = TEST_USERS.filter(u => u.role === 'coach').map(u => u.email)
  for (const email of coachEmails) {
    await db
      .update(schema.user)
      .set({ role: 'user', userType: 'coach' })
      .where(eq(schema.user.email, email))
  }

  // Runners: role='user', userType='runner'
  const runnerEmails = TEST_USERS.filter(u => u.role === 'runner').map(u => u.email)
  for (const email of runnerEmails) {
    await db
      .update(schema.user)
      .set({ role: 'user', userType: 'runner' })
      .where(eq(schema.user.email, email))
  }

  logger.info(`✅ Created ${successCount}/${TEST_USERS.length} test users`)
}

// =============================================================================
// STATIC DATA SEEDING
// =============================================================================

async function seedStaticData(): Promise<void> {
  logger.info('📋 Seeding static data (training phases and plan templates)...')

  // Seed training phases
  for (const phaseData of TRAINING_PHASES) {
    const existing = await db
      .select()
      .from(schema.training_phases)
      .where(eq(schema.training_phases.name, phaseData.name))
      .limit(1)

    if (existing.length > 0) {
      continue
    }

    await db.insert(schema.training_phases).values(phaseData)
    logger.info(`  ✅ Created training phase: ${phaseData.name}`)
  }

  // Seed plan templates
  for (const templateData of PLAN_TEMPLATES) {
    const existing = await db
      .select()
      .from(schema.plan_templates)
      .where(eq(schema.plan_templates.name, templateData.name))
      .limit(1)

    if (existing.length > 0) {
      continue
    }

    await db.insert(schema.plan_templates).values({
      name: templateData.name,
      description: templateData.description,
      distance_type: templateData.distanceType,
      duration_weeks: templateData.durationWeeks,
      difficulty_level: templateData.difficultyLevel,
      peak_weekly_miles: templateData.peakWeeklyMiles,
      min_base_miles: templateData.minBaseMiles,
      is_public: templateData.isPublic,
      tags: templateData.tags,
    })
    logger.info(`  ✅ Created plan template: ${templateData.name}`)
  }
}

// =============================================================================
// COACH-RUNNER RELATIONSHIPS
// =============================================================================

async function seedCoachRunnerRelationships(): Promise<void> {
  logger.info('🤝 Creating coach-runner relationships...')

  const users = await db.select().from(schema.user)
  const coaches = users.filter(user => user.userType === 'coach')
  const runners = users.filter(user => user.userType === 'runner')

  if (coaches.length === 0 || runners.length === 0) {
    logger.warn('  No coaches or runners found - skipping')
    return
  }

  // Connect Emma (primary coach) with Alex and Riley (primary runners)
  const primaryCoach = coaches.find(c => c.email === 'emma@ultracoach.dev')
  const primaryRunners = runners.filter(r =>
    ['alex.rivera@ultracoach.dev', 'riley.parker@ultracoach.dev'].includes(r.email)
  )

  if (primaryCoach) {
    for (const runner of primaryRunners) {
      const existing = await db
        .select()
        .from(schema.coach_runners)
        .where(
          and(
            eq(schema.coach_runners.coach_id, primaryCoach.id),
            eq(schema.coach_runners.runner_id, runner.id)
          )
        )
        .limit(1)

      if (existing.length > 0) continue

      await db.insert(schema.coach_runners).values({
        id: randomUUID(),
        coach_id: primaryCoach.id,
        runner_id: runner.id,
        status: 'active',
        relationship_type: 'standard',
        relationship_started_at: new Date(),
        notes: `Seeded relationship: ${primaryCoach.name} coaching ${runner.name}`,
        created_at: new Date(),
        updated_at: new Date(),
      })
      logger.info(`  ✅ Connected ${primaryCoach.name} ↔ ${runner.name}`)
    }
  }
}

// =============================================================================
// TRAINING PLANS & WORKOUTS
// =============================================================================

async function seedTrainingPlansAndWorkouts(): Promise<void> {
  logger.info('🏃 Creating sample training plans and workouts...')

  const relationships = await db
    .select()
    .from(schema.coach_runners)
    .where(eq(schema.coach_runners.status, 'active'))

  if (relationships.length === 0) {
    logger.warn('  No active coach-runner relationships - skipping')
    return
  }

  const users = await db.select().from(schema.user)

  for (const relationship of relationships) {
    const coach = users.find(u => u.id === relationship.coach_id)
    const runner = users.find(u => u.id === relationship.runner_id)

    if (!coach || !runner) continue

    // Check if plan exists
    const existingPlan = await db
      .select()
      .from(schema.training_plans)
      .where(
        and(
          eq(schema.training_plans.coach_id, coach.id),
          eq(schema.training_plans.runner_id, runner.id)
        )
      )
      .limit(1)

    if (existingPlan.length > 0) {
      logger.info(`  Plan for ${coach.name} → ${runner.name} already exists, skipping...`)
      continue
    }

    // Create training plan
    const [newPlan] = await db
      .insert(schema.training_plans)
      .values({
        title: `${runner.name}'s 50K Training Plan`,
        description: `Custom training plan for ${runner.name}'s first 50K ultramarathon`,
        coach_id: coach.id,
        runner_id: runner.id,
        target_race_date: addDays(new Date(), 140),
        target_race_distance: '50K',
      })
      .returning()

    logger.info(`  ✅ Created training plan for ${runner.name}`)

    // Create sample workouts
    const currentDate = new Date()
    const workouts = [
      {
        training_plan_id: newPlan.id,
        user_id: runner.id,
        title: `Easy Run - ${format(addDays(currentDate, 1), 'MMM dd')}`,
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
        training_plan_id: newPlan.id,
        user_id: runner.id,
        title: `Tempo Run - ${format(addDays(currentDate, 3), 'MMM dd')}`,
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
        training_plan_id: newPlan.id,
        user_id: runner.id,
        title: `Long Run - ${format(addDays(currentDate, 6), 'MMM dd')}`,
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

    await db.insert(schema.workouts).values(workouts)
    logger.info(`    Added ${workouts.length} sample workouts`)
  }
}

// =============================================================================
// UPDATE .ENV.LOCAL
// =============================================================================

function updateEnvLocal(): void {
  const envPath = resolve(process.cwd(), '.env.local')
  let envContent = ''

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8')
  }

  // Remove old test user lines
  const testUserKeys = [
    'TEST_COACH_EMAIL',
    'TEST_COACH_PASSWORD',
    'TEST_COACH2_EMAIL',
    'TEST_COACH2_PASSWORD',
    'TEST_COACH3_EMAIL',
    'TEST_COACH3_PASSWORD',
    'TEST_RUNNER_EMAIL',
    'TEST_RUNNER_PASSWORD',
    'TEST_RUNNER2_EMAIL',
    'TEST_RUNNER2_PASSWORD',
    'TEST_RUNNER3_EMAIL',
    'TEST_RUNNER3_PASSWORD',
  ]

  const lines = envContent.split('\n').filter(line => {
    const key = line.split('=')[0]
    return !testUserKeys.includes(key) && !line.startsWith('# Test user credentials')
  })

  // Add updated test user credentials
  lines.push('')
  lines.push('# Test user credentials (auto-generated by seed script)')
  lines.push(`TEST_COACH_EMAIL=emma@ultracoach.dev`)
  lines.push(`TEST_COACH_PASSWORD=${COACH_PASSWORD}`)
  lines.push(`TEST_COACH2_EMAIL=sarah.martinez@ultracoach.dev`)
  lines.push(`TEST_COACH2_PASSWORD=${COACH_PASSWORD}`)
  lines.push(`TEST_COACH3_EMAIL=michael.chen@ultracoach.dev`)
  lines.push(`TEST_COACH3_PASSWORD=${COACH_PASSWORD}`)
  lines.push(`TEST_RUNNER_EMAIL=alex.rivera@ultracoach.dev`)
  lines.push(`TEST_RUNNER_PASSWORD=${RUNNER_PASSWORD}`)
  lines.push(`TEST_RUNNER2_EMAIL=jordan.chen@ultracoach.dev`)
  lines.push(`TEST_RUNNER2_PASSWORD=${RUNNER_PASSWORD}`)
  lines.push(`TEST_RUNNER3_EMAIL=casey.johnson@ultracoach.dev`)
  lines.push(`TEST_RUNNER3_PASSWORD=${RUNNER_PASSWORD}`)
  lines.push('')

  fs.writeFileSync(envPath, lines.join('\n'))
  logger.info('✅ Updated .env.local with test user credentials')
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const startTime = Date.now()

  logger.info('🌱 Starting UltraCoach database seeding...')
  logger.info('')

  // Check if server is running
  logger.info('🔍 Checking server health...')
  const serverHealthy = await checkServerHealth()
  if (!serverHealthy) {
    logger.error('❌ Server is not running at ' + BASE_URL)
    logger.error('   Please start the dev server first: pnpm dev')
    logger.error('')
    logger.error('   Or use `pnpm db:fresh` to reset and seed in one command.')
    process.exit(1)
  }
  logger.info('  ✅ Server is healthy')
  logger.info('')

  // Update .env.local first
  updateEnvLocal()
  logger.info('')

  // Seed in order of dependencies
  await seedUsers()
  logger.info('')

  await seedStaticData()
  logger.info('')

  await seedCoachRunnerRelationships()
  logger.info('')

  await seedTrainingPlansAndWorkouts()
  logger.info('')

  // Summary
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
  const relationshipCount = await db
    .select()
    .from(schema.coach_runners)
    .then(r => r.length)

  const duration = Date.now() - startTime

  logger.info('📊 Database Summary:')
  logger.info(`   Users: ${userCount}`)
  logger.info(`   Training Plans: ${planCount}`)
  logger.info(`   Workouts: ${workoutCount}`)
  logger.info(`   Coach-Runner Relationships: ${relationshipCount}`)
  logger.info('')
  logger.info(`✅ Database seeding completed in ${duration}ms`)
  logger.info('')
  logger.info('🎯 Primary Test Users:')
  logger.info('   Coach: emma@ultracoach.dev / UltraCoach2025!')
  logger.info('   Runner: alex.rivera@ultracoach.dev / RunnerPass2025!')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    logger.error('❌ Database seeding failed:', error)
    process.exit(1)
  })
