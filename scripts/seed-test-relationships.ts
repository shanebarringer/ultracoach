#!/usr/bin/env tsx
/**
 * Seeds test data for coach-runner relationships
 * Creates additional test users that are NOT connected
 * This ensures tests can find available coaches/runners to connect with
 */
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import path from 'path'

import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { user } from '@/lib/schema'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

const logger = createLogger('seed-test-relationships')

async function seedTestRelationships() {
  try {
    logger.info('Starting test relationship data seeding...')

    // Check if extra test users already exist
    const existingTestCoach = await db
      .select()
      .from(user)
      .where(eq(user.email, 'test.coach@ultracoach.dev'))
      .limit(1)

    if (existingTestCoach.length === 0) {
      logger.info('Creating additional test coaches and runners...')

      // Create additional test coaches (unconnected)
      const testCoaches = [
        {
          id: 'test-coach-1-unconnected',
          email: 'test.coach@ultracoach.dev',
          name: 'Test Coach',
          fullName: 'Test Coach One',
          role: 'user' as const,
          userType: 'coach' as const,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'test-coach-2-unconnected',
          email: 'test.coach2@ultracoach.dev',
          name: 'Coach Two',
          fullName: 'Test Coach Two',
          role: 'user' as const,
          userType: 'coach' as const,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      // Create additional test runners (unconnected)
      const testRunners = [
        {
          id: 'test-runner-1-unconnected',
          email: 'test.runner@ultracoach.dev',
          name: 'Test Runner',
          fullName: 'Test Runner One',
          role: 'user' as const,
          userType: 'runner' as const,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'test-runner-2-unconnected',
          email: 'test.runner2@ultracoach.dev',
          name: 'Runner Two',
          fullName: 'Test Runner Two',
          role: 'user' as const,
          userType: 'runner' as const,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      // Insert test users
      await db.insert(user).values([...testCoaches, ...testRunners])
      logger.info('Created 2 test coaches and 2 test runners')
    } else {
      logger.info('Test users already exist, skipping creation')
    }

    // Verify available coaches and runners
    const coaches = await db.select().from(user).where(eq(user.userType, 'coach'))

    const runners = await db.select().from(user).where(eq(user.userType, 'runner'))

    logger.info(`Total coaches in database: ${coaches.length}`)
    logger.info(`Total runners in database: ${runners.length}`)

    // Note: We're NOT creating any coach_runner relationships
    // This ensures tests can find available users to connect with

    logger.info('Test relationship data seeding completed successfully!')
  } catch (error) {
    logger.error('Error seeding test relationships:', error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

// Run the seeding
seedTestRelationships()
