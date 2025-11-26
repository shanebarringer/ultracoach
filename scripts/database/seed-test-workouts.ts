#!/usr/bin/env tsx
/**
 * Seed Test Workouts for Playwright Users
 *
 * Creates basic workouts for test users to ensure tests have data to work with
 */
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables - CI uses environment variables directly, not .env.local
if (process.env.NODE_ENV !== 'test') {
  try {
    const fs = require('fs')
    const envPath = resolve(process.cwd(), '.env.local')
    if (fs.existsSync(envPath)) {
      config({ path: envPath })
    }
  } catch {
    // Silently continue if .env.local doesn't exist or can't be loaded
  }
}

// Create sample workouts for Alex Rivera (runner used in workout completion tests)
const SAMPLE_WORKOUTS = [
  {
    title: 'Easy Run',
    planned_type: 'Easy Run',
    planned_distance: '4.00',
    planned_duration: 35,
    status: 'planned',
    date_offset: 1, // Tomorrow
  },
  {
    title: 'Tempo Run',
    planned_type: 'Tempo Run',
    planned_distance: '6.00',
    planned_duration: 50,
    status: 'planned',
    date_offset: 2, // In 2 days
  },
  {
    title: 'Long Run',
    planned_type: 'Long Run',
    planned_distance: '12.00',
    planned_duration: 90,
    status: 'planned',
    date_offset: 3, // In 3 days
  },
  {
    title: 'Easy Run',
    planned_type: 'Easy Run',
    planned_distance: '5.00',
    planned_duration: 45,
    status: 'planned',
    date_offset: 4, // In 4 days
  },
  {
    title: 'Interval Training',
    planned_type: 'Interval Training',
    planned_distance: '8.00',
    planned_duration: 65,
    status: 'planned',
    date_offset: 5, // In 5 days
  },
  {
    title: 'Recovery Run',
    planned_type: 'Recovery Run',
    planned_distance: '3.00',
    planned_duration: 25,
    status: 'planned',
    date_offset: 6, // In 6 days
  },
]

async function seedTestWorkouts() {
  // Import modules after environment setup
  const { db } = await import('../../src/lib/database')
  const { createLogger } = await import('../../src/lib/logger')
  const { workouts, user } = await import('../../src/lib/schema')
  const { eq } = await import('drizzle-orm')

  const logger = createLogger('seed-test-workouts')

  try {
    logger.info('🏃‍♂️ Seeding test workouts for Playwright tests...')

    // Find Alex Rivera's user ID
    const alexUser = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, 'alex.rivera@ultracoach.dev'))
      .limit(1)

    if (alexUser.length === 0) {
      logger.error('❌ Alex Rivera user not found. Run create-playwright-test-users.ts first.')
      process.exit(1)
    }

    const alexUserId = alexUser[0].id
    logger.info(`✅ Found Alex Rivera user: ${alexUserId}`)

    // Clear existing workouts for Alex Rivera
    const deletedCount = await db.delete(workouts).where(eq(workouts.user_id, alexUserId))
    logger.info(`🧹 Cleared ${deletedCount.length || 0} existing workouts`)

    // Create new workouts
    const workoutData = SAMPLE_WORKOUTS.map(workout => {
      const date = new Date()
      date.setDate(date.getDate() + workout.date_offset)

      return {
        user_id: alexUserId,
        title: workout.title,
        planned_type: workout.planned_type,
        planned_distance: workout.planned_distance,
        planned_duration: workout.planned_duration,
        status: workout.status,
        date: date,
      }
    })

    const createdWorkouts = await db
      .insert(workouts)
      .values(workoutData)
      .returning({ id: workouts.id })

    logger.info(`✅ Created ${createdWorkouts.length} test workouts for Alex Rivera`)
    logger.info(`🎭 Workouts are ready for Playwright workout completion tests`)

    // Verify workouts were created
    const verifyWorkouts = await db
      .select({ id: workouts.id, title: workouts.title, status: workouts.status })
      .from(workouts)
      .where(eq(workouts.user_id, alexUserId))

    logger.info(`🔍 Verification: Found ${verifyWorkouts.length} workouts:`)
    verifyWorkouts.forEach(w => {
      logger.info(`  - ${w.title} (${w.status})`)
    })
  } catch (error) {
    logger.error('💥 Error seeding test workouts:', error)
    process.exit(1)
  }
}

seedTestWorkouts()
  .then(() => {
    console.log('🏆 Test workout seeding completed successfully')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
