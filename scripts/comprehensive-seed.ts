#!/usr/bin/env tsx
/**
 * Comprehensive UltraCoach Seeding Script
 *
 * This script creates fresh test data with proper coach-runner relationships:
 * - 3 coaches with proper Better Auth credentials
 * - 15 runners (5 potential per coach)
 * - 1 active relationship per coach (3 total active relationships)
 * - 12 runners available for connection discovery
 * - Sample training plans for connected coach-runner pairs
 * - Realistic workout data for testing
 */
import { randomUUID } from 'crypto'
import { addDays, format, startOfDay } from 'date-fns'
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import * as fs from 'fs'
import * as path from 'path'
import { resolve } from 'path'

import { auth } from '../src/lib/better-auth'
import { db } from '../src/lib/database'
import { createLogger } from '../src/lib/logger'
import {
  account,
  coach_runners,
  conversations,
  training_plans,
  user,
  workouts,
} from '../src/lib/schema'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const logger = createLogger('comprehensive-seed')

// Coach data
const coaches = [
  {
    name: 'Sarah Mountain',
    fullName: 'Sarah Mountain',
    email: 'sarah@ultracoach.dev',
    password: 'UltraCoach2025!',
    specialties: ['100-mile', 'technical terrain', 'high altitude'],
  },
  {
    name: 'Marcus Trail',
    fullName: 'Marcus Trail',
    email: 'marcus@ultracoach.dev',
    password: 'UltraCoach2025!',
    specialties: ['50K', 'speed work', 'injury prevention'],
  },
  {
    name: 'Emma Summit',
    fullName: 'Emma Summit',
    email: 'emma@ultracoach.dev',
    password: 'UltraCoach2025!',
    specialties: ['50-mile', 'nutrition', 'mental training'],
  },
]

// Runner data - 15 runners with varied backgrounds
const runners = [
  // Runners 1-5: Potential for Sarah Mountain
  {
    name: 'Alex Rivera',
    fullName: 'Alex Rivera',
    email: 'alex.rivera@ultracoach.dev',
    experience: 'beginner',
  },
  {
    name: 'Jordan Chen',
    fullName: 'Jordan Chen',
    email: 'jordan.chen@ultracoach.dev',
    experience: 'intermediate',
  },
  {
    name: 'Casey Johnson',
    fullName: 'Casey Johnson',
    email: 'casey.johnson@ultracoach.dev',
    experience: 'advanced',
  },
  {
    name: 'Taylor Smith',
    fullName: 'Taylor Smith',
    email: 'taylor.smith@ultracoach.dev',
    experience: 'beginner',
  },
  {
    name: 'Morgan Davis',
    fullName: 'Morgan Davis',
    email: 'morgan.davis@ultracoach.dev',
    experience: 'intermediate',
  },

  // Runners 6-10: Potential for Marcus Trail
  {
    name: 'Riley Parker',
    fullName: 'Riley Parker',
    email: 'riley.parker@ultracoach.dev',
    experience: 'beginner',
  },
  {
    name: 'Quinn Wilson',
    fullName: 'Quinn Wilson',
    email: 'quinn.wilson@ultracoach.dev',
    experience: 'advanced',
  },
  {
    name: 'Blake Torres',
    fullName: 'Blake Torres',
    email: 'blake.torres@ultracoach.dev',
    experience: 'intermediate',
  },
  {
    name: 'Dakota Lee',
    fullName: 'Dakota Lee',
    email: 'dakota.lee@ultracoach.dev',
    experience: 'beginner',
  },
  {
    name: 'Sage Rodriguez',
    fullName: 'Sage Rodriguez',
    email: 'sage.rodriguez@ultracoach.dev',
    experience: 'intermediate',
  },

  // Runners 11-15: Potential for Emma Summit
  {
    name: 'River Martinez',
    fullName: 'River Martinez',
    email: 'river.martinez@ultracoach.dev',
    experience: 'advanced',
  },
  {
    name: 'Phoenix Garcia',
    fullName: 'Phoenix Garcia',
    email: 'phoenix.garcia@ultracoach.dev',
    experience: 'beginner',
  },
  {
    name: 'Skylar Anderson',
    fullName: 'Skylar Anderson',
    email: 'skylar.anderson@ultracoach.dev',
    experience: 'intermediate',
  },
  {
    name: 'Rowan Thompson',
    fullName: 'Rowan Thompson',
    email: 'rowan.thompson@ultracoach.dev',
    experience: 'advanced',
  },
  {
    name: 'Nova Clark',
    fullName: 'Nova Clark',
    email: 'nova.clark@ultracoach.dev',
    experience: 'beginner',
  },
]

// Training plan templates based on coach specialties
const trainingPlanTemplates = [
  {
    title: 'Alpine 100-Mile Mastery',
    description:
      'Comprehensive 20-week program for tackling 100-mile mountain races with technical terrain and elevation gain.',
    duration_weeks: 20,
    target_distance: 100,
    coach_specialty: '100-mile',
  },
  {
    title: '50K Trail Domination',
    description: '12-week speed-focused plan for conquering your first or fastest 50K trail race.',
    duration_weeks: 12,
    target_distance: 50,
    coach_specialty: '50K',
  },
  {
    title: 'Backcountry 50-Mile Journey',
    description:
      '16-week holistic training approach combining physical preparation with mental resilience and fueling strategies.',
    duration_weeks: 16,
    target_distance: 50,
    coach_specialty: '50-mile',
  },
]

async function clearExistingData() {
  logger.info('🧹 Clearing existing data...')

  try {
    // Clear in proper order to respect foreign key constraints
    await db.delete(workouts)
    await db.delete(training_plans)
    await db.delete(conversations)
    await db.delete(coach_runners)
    await db.delete(account)
    await db.delete(user)

    logger.info('✅ Successfully cleared all existing data')
  } catch (error) {
    logger.error('❌ Error clearing data:', error)
    throw error
  }
}

async function createUsers() {
  logger.info('👥 Creating coaches and runners using Better Auth admin API...')

  const createdUsers: Array<{ id: string; role: 'coach' | 'runner'; name: string; email: string }> =
    []

  // Get Better Auth context for admin operations
  const ctx = await auth.$context

  // Create coaches using Better Auth admin API
  for (const coach of coaches) {
    try {
      const newUser = await ctx.adapter.create({
        model: 'user',
        data: {
          name: coach.name,
          email: coach.email,
          emailVerified: false,
          role: 'coach',
          fullName: coach.fullName,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      // Create credential account with properly hashed password
      const hashedPassword = await ctx.password.hash(coach.password)
      await ctx.adapter.create({
        model: 'account',
        data: {
          userId: newUser.id,
          accountId: newUser.id,
          providerId: 'credential',
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      createdUsers.push({
        id: newUser.id,
        role: 'coach',
        name: coach.name,
        email: coach.email,
      })
      logger.info(`✅ Created coach: ${coach.name} (${coach.email})`)
    } catch (error) {
      logger.error(`❌ Failed to create coach ${coach.name}:`, error)
    }
  }

  // Create runners using Better Auth admin API
  for (const runner of runners) {
    try {
      const newUser = await ctx.adapter.create({
        model: 'user',
        data: {
          name: runner.name,
          email: runner.email,
          emailVerified: false,
          role: 'runner',
          fullName: runner.fullName,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      // Create credential account with properly hashed password
      const hashedPassword = await ctx.password.hash('RunnerPass2025!')
      await ctx.adapter.create({
        model: 'account',
        data: {
          userId: newUser.id,
          accountId: newUser.id,
          providerId: 'credential',
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      createdUsers.push({
        id: newUser.id,
        role: 'runner',
        name: runner.name,
        email: runner.email,
      })
      logger.info(`✅ Created runner: ${runner.name} (${runner.email})`)
    } catch (error) {
      logger.error(`❌ Failed to create runner ${runner.name}:`, error)
    }
  }

  return createdUsers
}

async function createRelationships(
  users: Array<{ id: string; role: 'coach' | 'runner'; name: string; email: string }>
) {
  logger.info('🤝 Creating coach-runner relationships...')

  const coachUsers = users.filter(u => u.role === 'coach')
  const runnerUsers = users.filter(u => u.role === 'runner')

  // Connect 1 runner to each coach (3 active relationships)
  // Connect runners 0, 5, 10 (one from each group of 5)
  const connectedRunnerIndices = [0, 5, 10]

  for (let i = 0; i < coachUsers.length; i++) {
    const coach = coachUsers[i]
    const runner = runnerUsers[connectedRunnerIndices[i]]

    // Create active coach-runner relationship
    await db.insert(coach_runners).values({
      id: randomUUID(),
      coach_id: coach.id,
      runner_id: runner.id,
      status: 'active',
      relationship_type: 'standard',
      invited_by: null,
      relationship_started_at: new Date(),
      notes: `Connected during comprehensive seeding - ${coach.name} coaching ${runner.name}`,
      created_at: new Date(),
      updated_at: new Date(),
    })

    logger.info(`✅ Connected ${coach.name} ↔ ${runner.name}`)
  }

  logger.info(`✅ Created 3 active relationships, 12 runners available for discovery`)
}

async function createTrainingPlans(
  users: Array<{ id: string; role: 'coach' | 'runner'; name: string; email: string }>
) {
  logger.info('📋 Creating training plans for connected coach-runner pairs...')

  const coachUsers = users.filter(u => u.role === 'coach')
  const runnerUsers = users.filter(u => u.role === 'runner')
  const connectedRunnerIndices = [0, 5, 10]

  for (let i = 0; i < coachUsers.length; i++) {
    const coach = coachUsers[i]
    const runner = runnerUsers[connectedRunnerIndices[i]]
    const template = trainingPlanTemplates[i]

    const planId = randomUUID()
    const targetRaceDate = addDays(new Date(), template.duration_weeks * 7)

    await db.insert(training_plans).values({
      id: planId,
      title: template.title,
      description: template.description,
      coach_id: coach.id,
      runner_id: runner.id,
      target_race_date: targetRaceDate,
      duration_weeks: template.duration_weeks,
      created_at: new Date(),
      updated_at: new Date(),
    })

    logger.info(`✅ Created training plan: "${template.title}" for ${runner.name}`)
  }
}

async function createSampleWorkouts(
  users: Array<{ id: string; role: 'coach' | 'runner'; name: string; email: string }>
) {
  logger.info('🏃‍♂️ Creating sample workouts...')

  const runnerUsers = users.filter(u => u.role === 'runner')
  const connectedRunnerIndices = [0, 5, 10]

  // Get training plans to associate workouts
  const plans = await db.select().from(training_plans)

  const workoutTypes = ['long_run', 'tempo', 'interval', 'easy', 'recovery']
  const workoutDescriptions = {
    long_run: 'Steady endurance run building aerobic base',
    tempo: 'Comfortably hard sustained effort',
    interval: 'High intensity intervals with recovery',
    easy: 'Conversational pace recovery run',
    recovery: 'Very easy recovery and mobility work',
  }

  for (let planIndex = 0; planIndex < plans.length; planIndex++) {
    const plan = plans[planIndex]

    // Create 5 sample workouts per plan (mix of completed and planned)
    for (let workoutIndex = 0; workoutIndex < 5; workoutIndex++) {
      const workoutType = workoutTypes[workoutIndex]
      const isCompleted = workoutIndex < 3 // First 3 are completed
      const workoutDate = isCompleted
        ? addDays(new Date(), -7 + workoutIndex * 2) // Past dates for completed
        : addDays(new Date(), workoutIndex * 2) // Future dates for planned

      await db.insert(workouts).values({
        id: randomUUID(),
        training_plan_id: plan.id,
        runner_id: plan.runner_id,
        date: workoutDate,
        planned_type: workoutType,
        planned_distance: (workoutIndex * 3 + 5).toString(), // 5, 8, 11, 14, 17 miles as string for decimal
        planned_duration: (workoutIndex * 3 + 5) * 9, // ~9 min/mile estimate (integer)
        actual_type: isCompleted ? workoutType : null,
        actual_distance: isCompleted ? ((workoutIndex * 3 + 5) * 0.95).toFixed(2) : null, // Slight variance as decimal string
        actual_duration: isCompleted ? Math.round((workoutIndex * 3 + 5) * 9 * 1.05) : null, // Slight variance, rounded to integer
        status: isCompleted ? 'completed' : 'planned',
        notes: workoutDescriptions[workoutType as keyof typeof workoutDescriptions],
        created_at: new Date(),
        updated_at: new Date(),
      })
    }

    logger.info(`✅ Created 5 workouts for training plan: ${plan.title}`)
  }
}

async function updateEnvCredentials(
  users: Array<{ id: string; role: 'coach' | 'runner'; name: string; email: string }>
) {
  logger.info('🔐 Updating .env.local with test credentials...')

  const envPath = resolve(process.cwd(), '.env.local')
  let envContent = ''

  // Read existing .env.local
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8')
  }

  // Remove old test credentials
  const lines = envContent.split('\n').filter(line => {
    const key = line.split('=')[0]
    return !key.startsWith('TEST_') && !line.startsWith('# Test user credentials')
  })

  // Add new credentials
  lines.push('')
  lines.push('# Test user credentials (auto-generated by comprehensive seed script)')

  const coachUsers = users.filter(u => u.role === 'coach')
  const runnerUsers = users.filter(u => u.role === 'runner')

  // Add coach credentials
  coachUsers.forEach((coach, index) => {
    const suffix = index === 0 ? '' : (index + 1).toString()
    lines.push(`TEST_COACH${suffix}_EMAIL=${coach.email}`)
    lines.push(`TEST_COACH${suffix}_PASSWORD=UltraCoach2025!`)
  })

  // Add runner credentials (just the first few for testing)
  runnerUsers.slice(0, 3).forEach((runner, index) => {
    const suffix = index === 0 ? '' : (index + 1).toString()
    lines.push(`TEST_RUNNER${suffix}_EMAIL=${runner.email}`)
    lines.push(`TEST_RUNNER${suffix}_PASSWORD=RunnerPass2025!`)
  })

  lines.push('')

  // Write updated content
  fs.writeFileSync(envPath, lines.join('\n'))
  logger.info('✅ Updated .env.local with fresh test credentials')
}

async function main() {
  try {
    logger.info('🚀 Starting comprehensive UltraCoach seeding...')

    // Clear existing data
    await clearExistingData()

    // Create all users
    const users = await createUsers()

    // Create relationships (1 per coach, 12 available)
    await createRelationships(users)

    // Create training plans for connected pairs
    await createTrainingPlans(users)

    // Create sample workouts
    await createSampleWorkouts(users)

    // Update credentials
    await updateEnvCredentials(users)

    // Summary
    logger.info('🎉 Comprehensive seeding complete!')
    logger.info('📊 Summary:')
    logger.info(`   • 3 coaches created with proper Better Auth credentials`)
    logger.info(`   • 15 runners created (5 potential per coach)`)
    logger.info(`   • 3 active coach-runner relationships established`)
    logger.info(`   • 12 runners available for connection discovery`)
    logger.info(`   • 3 training plans created for connected pairs`)
    logger.info(`   • 15 sample workouts created (mix of completed/planned)`)
    logger.info(`   • .env.local updated with test credentials`)

    logger.info('🔐 Test Accounts:')
    logger.info('   Coaches: sarah@ultracoach.dev, marcus@ultracoach.dev, emma@ultracoach.dev')
    logger.info(
      '   Runners: alex.rivera@ultracoach.dev, riley.parker@ultracoach.dev, river.martinez@ultracoach.dev'
    )
    logger.info('   All passwords: UltraCoach2025! (coaches), RunnerPass2025! (runners)')
  } catch (error) {
    logger.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

// Run the seeding script
main()
  .then(() => {
    logger.info('✅ Seeding script completed successfully')
    process.exit(0)
  })
  .catch(error => {
    logger.error('❌ Fatal error in seeding script:', error)
    process.exit(1)
  })
