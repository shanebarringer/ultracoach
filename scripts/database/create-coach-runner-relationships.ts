#!/usr/bin/env tsx
import crypto from 'crypto'
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { createLogger } from '../src/lib/logger'
import { account, conversations, training_plans, user } from '../src/lib/schema'

// Load environment variables from .env.local
config({ path: '.env.local' })

const logger = createLogger('coach-runner-setup')

// Database connection
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required')
}

const sql = postgres(connectionString)
const db = drizzle(sql)

interface RunnerData {
  email: string
  name: string
  fullName: string
  password: string
}

// Generate runner data for each coach
function generateRunnersForCoach(coachName: string, coachIndex: number): RunnerData[] {
  const runners: RunnerData[] = []
  const baseNames = [
    'Alex Thompson',
    'Jordan Martinez',
    'Casey Lee',
    'Morgan Davis',
    'Riley Johnson',
  ]

  for (let i = 0; i < 5; i++) {
    const runnerIndex = coachIndex * 5 + i + 1
    runners.push({
      email: `runner${runnerIndex}@ultracoach.dev`,
      name: baseNames[i],
      fullName: baseNames[i],
      password: 'UltraRunner2025!', // Strong default password
    })
  }

  return runners
}

async function createRunnerAccount(runnerData: RunnerData): Promise<string | null> {
  try {
    logger.info(`Creating runner account: ${runnerData.email}`)

    // Check if user already exists
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, runnerData.email))
      .limit(1)

    if (existingUser) {
      logger.info(`Runner ${runnerData.email} already exists, using existing account`)
      return existingUser.id
    }

    // Create user directly in database with proper Better Auth structure
    const bcrypt = require('bcrypt')
    const hashedPassword = await bcrypt.hash(runnerData.password, 12)
    const userId = crypto.randomUUID()

    // Insert user
    await db.insert(user).values({
      id: userId,
      name: runnerData.name,
      email: runnerData.email,
      emailVerified: false,
      role: 'runner',
      fullName: runnerData.fullName,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Insert credential account for password authentication
    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: runnerData.email,
      providerId: 'credential',
      userId: userId,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    logger.info(`Successfully created runner: ${runnerData.email}`)
    return userId
  } catch (error) {
    logger.error(`Error creating runner ${runnerData.email}:`, error)
    return null
  }
}

async function createTrainingPlan(
  coachId: string,
  runnerId: string,
  runnerName: string
): Promise<void> {
  try {
    const [existingPlan] = await db
      .select({ id: training_plans.id })
      .from(training_plans)
      .where(eq(training_plans.coach_id, coachId))
      .where(eq(training_plans.runner_id, runnerId))
      .limit(1)

    if (existingPlan) {
      logger.info(`Training plan already exists for coach ${coachId} and runner ${runnerId}`)
      return
    }

    await db.insert(training_plans).values({
      title: `${runnerName}'s Ultra Training Plan`,
      description: `Comprehensive ultramarathon training program designed for ${runnerName}`,
      coach_id: coachId,
      runner_id: runnerId,
      target_race_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days from now
      target_race_distance: '50K',
    })

    logger.info(`Created training plan for coach ${coachId} and runner ${runnerId}`)
  } catch (error) {
    logger.error(`Error creating training plan for coach ${coachId} and runner ${runnerId}:`, error)
  }
}

async function createCoachRunnerRelationship(
  coachId: string,
  runnerId: string,
  runnerName: string
): Promise<void> {
  try {
    // For now, we'll create the relationship through conversations and training plans
    // In the future, we should add a dedicated coach_runners table

    // Create conversation
    const [existingConversation] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.coach_id, coachId))
      .where(eq(conversations.runner_id, runnerId))
      .limit(1)

    if (!existingConversation) {
      await db.insert(conversations).values({
        coach_id: coachId,
        runner_id: runnerId,
        title: `Training Discussion with ${runnerName}`,
      })
      logger.info(`Created conversation for coach and ${runnerName}`)
    }

    logger.info(`✅ Coach-runner relationship established with ${runnerName}`)
  } catch (error) {
    logger.error(`Error creating coach-runner relationship for ${runnerName}:`, error)
  }
}

async function main() {
  try {
    logger.info('🏔️ Starting Coach-Runner Relationship Setup')

    // Get all coaches
    const coaches = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        fullName: user.fullName,
      })
      .from(user)
      .where(eq(user.role, 'coach'))

    if (coaches.length === 0) {
      logger.error('No coaches found in database!')
      return
    }

    logger.info(`Found ${coaches.length} coaches:`)
    coaches.forEach(coach => {
      logger.info(`  - ${coach.name} (${coach.email})`)
    })

    // Create 5 runners for each coach
    for (let coachIndex = 0; coachIndex < coaches.length; coachIndex++) {
      const coach = coaches[coachIndex]
      logger.info(`\n📋 Processing coach: ${coach.name} (${coach.email})`)

      const runnersData = generateRunnersForCoach(coach.name || 'Coach', coachIndex)

      for (const runnerData of runnersData) {
        logger.info(`  Creating runner: ${runnerData.name} (${runnerData.email})`)

        // Create runner account
        const runnerId = await createRunnerAccount(runnerData)
        if (!runnerId) {
          logger.error(`  Failed to create runner ${runnerData.email}, skipping...`)
          continue
        }

        // Create coach-runner relationship (conversation for now)
        await createCoachRunnerRelationship(coach.id, runnerId, runnerData.name)

        // Optionally create a training plan (only for first 2 runners per coach)
        const isFirstTwoRunners = runnersData.indexOf(runnerData) < 2
        if (isFirstTwoRunners) {
          await createTrainingPlan(coach.id, runnerId, runnerData.name)
        }

        logger.info(`  ✅ Successfully set up ${runnerData.name}`)
      }
    }

    logger.info('\n🎉 Coach-Runner relationship setup complete!')

    // Summary
    const totalRunners = await db
      .select({ count: user.id })
      .from(user)
      .where(eq(user.role, 'runner'))

    const totalPlans = await db.select({ count: training_plans.id }).from(training_plans)

    const totalConversations = await db.select({ count: conversations.id }).from(conversations)

    logger.info(`\n📊 Final counts:`)
    logger.info(`  - Coaches: ${coaches.length}`)
    logger.info(`  - Runners: ${totalRunners.length}`)
    logger.info(`  - Training Plans: ${totalPlans.length}`)
    logger.info(`  - Conversations: ${totalConversations.length}`)
  } catch (error) {
    logger.error('Failed to set up coach-runner relationships:', error)
    throw error
  } finally {
    await sql.end()
  }
}

// Update .env.local with new test user credentials
function updateEnvCredentials(runners: RunnerData[]) {
  logger.info('📝 Updating .env.local with new runner credentials...')

  const envPath = '.env.local'
  let envContent = ''

  try {
    envContent = require('fs').readFileSync(envPath, 'utf8')
  } catch (error) {
    logger.error('Could not read .env.local:', error)
    return
  }

  // Add runner credentials to the test user section
  const runnerCredentials = runners
    .map(
      (runner, index) =>
        `TEST_RUNNER${index + 3}_EMAIL=${runner.email}\nTEST_RUNNER${index + 3}_PASSWORD=${runner.password}`
    )
    .join('\n')

  // Append new credentials
  const updatedContent = `${envContent}\n\n# Additional Runner Credentials\n${runnerCredentials}\n`

  try {
    require('fs').writeFileSync(envPath, updatedContent)
    logger.info('✅ Updated .env.local with new runner credentials')
  } catch (error) {
    logger.error('Could not update .env.local:', error)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export default main
