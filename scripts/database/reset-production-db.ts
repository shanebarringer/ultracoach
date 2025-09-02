#!/usr/bin/env tsx
/**
 * Reset Production Database Script
 *
 * This script safely resets and reseeds the production database with corrected data
 */
import { randomUUID } from 'crypto'
import { addDays } from 'date-fns'
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { resolve } from 'path'

import { db } from '../src/lib/database'
import { createLogger } from '../src/lib/logger'
import { coach_runners, conversations, training_plans, user, workouts } from '../src/lib/schema'

// Load production environment variables
config({ path: resolve(process.cwd(), '.env.production') })

const logger = createLogger('reset-production-db')

// Production-safe user data (same as comprehensive seed script)
const coaches = [
  { name: 'Sarah Mountain', email: 'sarah@ultracoach.dev', userType: 'coach' },
  { name: 'Marcus Trail', email: 'marcus@ultracoach.dev', userType: 'coach' },
  { name: 'Emma Summit', email: 'emma@ultracoach.dev', userType: 'coach' },
]

const runners = [
  { name: 'Alex Rivera', email: 'alex.rivera@ultracoach.dev', userType: 'runner' },
  { name: 'Jordan Chen', email: 'jordan.chen@ultracoach.dev', userType: 'runner' },
  { name: 'Casey Johnson', email: 'casey.johnson@ultracoach.dev', userType: 'runner' },
  { name: 'Riley Parker', email: 'riley.parker@ultracoach.dev', userType: 'runner' },
  { name: 'Quinn Wilson', email: 'quinn.wilson@ultracoach.dev', userType: 'runner' },
  { name: 'Blake Torres', email: 'blake.torres@ultracoach.dev', userType: 'runner' },
]

async function clearProductionData() {
  logger.info('🧹 Clearing existing production data...')

  try {
    // Clear in proper order to respect foreign key constraints
    await db.delete(workouts)
    await db.delete(training_plans)
    await db.delete(conversations)
    await db.delete(coach_runners)

    // Note: We don't delete from user and account tables since those are managed by Better Auth
    // Instead, we'll update existing users or create new ones as needed

    logger.info('✅ Successfully cleared production data (preserved Better Auth tables)')
  } catch (error) {
    logger.error('❌ Error clearing production data:', error)
    throw error
  }
}

async function updateExistingUsers() {
  logger.info('🔧 Updating existing users with correct userType...')

  // Update coaches
  for (const coach of coaches) {
    try {
      const result = await db
        .update(user)
        .set({
          user_type: coach.userType,
          name: coach.name,
          full_name: coach.name,
          updated_at: new Date(),
        })
        .where(eq(user.email, coach.email))
        .returning({ id: user.id, email: user.email })

      if (result.length > 0) {
        logger.info(
          `✅ Updated coach: ${coach.name} (${coach.email}) → userType: ${coach.userType}`
        )
      } else {
        logger.info(`ℹ️  Coach not found: ${coach.email} (will need manual creation)`)
      }
    } catch (error) {
      logger.error(`❌ Failed to update coach ${coach.email}:`, error)
    }
  }

  // Update runners
  for (const runner of runners) {
    try {
      const result = await db
        .update(user)
        .set({
          user_type: runner.userType,
          name: runner.name,
          full_name: runner.name,
          updated_at: new Date(),
        })
        .where(eq(user.email, runner.email))
        .returning({ id: user.id, email: user.email })

      if (result.length > 0) {
        logger.info(
          `✅ Updated runner: ${runner.name} (${runner.email}) → userType: ${runner.userType}`
        )
      } else {
        logger.info(`ℹ️  Runner not found: ${runner.email} (will need manual creation)`)
      }
    } catch (error) {
      logger.error(`❌ Failed to update runner ${runner.email}:`, error)
    }
  }
}

async function createBasicRelationships() {
  logger.info('🤝 Creating basic coach-runner relationships...')

  // Get existing users
  const coachUsers = await db.select().from(user).where(eq(user.user_type, 'coach'))
  const runnerUsers = await db.select().from(user).where(eq(user.user_type, 'runner'))

  logger.info(`Found ${coachUsers.length} coaches and ${runnerUsers.length} runners`)

  // Create some sample relationships (if we have users)
  if (coachUsers.length > 0 && runnerUsers.length > 0) {
    for (let i = 0; i < Math.min(coachUsers.length, runnerUsers.length); i++) {
      const coach = coachUsers[i]
      const runner = runnerUsers[i]

      try {
        await db.insert(coach_runners).values({
          id: randomUUID(),
          coach_id: coach.id,
          runner_id: runner.id,
          status: 'active',
          relationship_type: 'standard',
          invited_by: null,
          relationship_started_at: new Date(),
          notes: `Production relationship - ${coach.name} coaching ${runner.name}`,
          created_at: new Date(),
          updated_at: new Date(),
        })

        logger.info(`✅ Created relationship: ${coach.name} ↔ ${runner.name}`)
      } catch (error) {
        logger.error(`❌ Failed to create relationship ${coach.name} ↔ ${runner.name}:`, error)
      }
    }
  }
}

async function verifyCorrections() {
  logger.info('🔍 Verifying userType corrections...')

  const allUsers = await db
    .select({
      email: user.email,
      role: user.role,
      user_type: user.user_type,
      name: user.name,
    })
    .from(user)

  logger.info('📊 Current user data:')
  for (const userData of allUsers) {
    const status =
      userData.user_type === 'coach'
        ? '✅ COACH'
        : userData.user_type === 'runner'
          ? '✅ RUNNER'
          : '❌ INCORRECT'
    logger.info(
      `   ${userData.email}: ${status} (userType: ${userData.user_type}, role: ${userData.role})`
    )
  }

  const coachCount = allUsers.filter(u => u.user_type === 'coach').length
  const runnerCount = allUsers.filter(u => u.user_type === 'runner').length

  logger.info(`📈 Summary: ${coachCount} coaches, ${runnerCount} runners`)
}

async function main() {
  try {
    logger.info('🚀 Starting production database reset and correction...')

    // Verify we're using production environment
    if (!process.env.DATABASE_URL?.includes('supabase.co')) {
      throw new Error('❌ This script requires production DATABASE_URL')
    }

    logger.info('🌍 Confirmed: Using production database')

    // Step 1: Clear non-user data
    await clearProductionData()

    // Step 2: Update existing users with correct userType
    await updateExistingUsers()

    // Step 3: Create basic relationships
    await createBasicRelationships()

    // Step 4: Verify corrections
    await verifyCorrections()

    logger.info('🎉 Production database reset and correction complete!')
    logger.info('')
    logger.info('📋 Next steps:')
    logger.info('   1. Test authentication with existing users')
    logger.info('   2. Verify role-based dashboard routing')
    logger.info('   3. Deploy latest code to production')
    logger.info('   4. Run end-to-end tests')
  } catch (error) {
    logger.error('❌ Production database reset failed:', error)
    process.exit(1)
  }
}

// Run the reset script
main()
  .then(() => {
    logger.info('✅ Production database reset script completed successfully')
    process.exit(0)
  })
  .catch(error => {
    logger.error('❌ Fatal error in production database reset:', error)
    process.exit(1)
  })
