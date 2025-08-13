#!/usr/bin/env tsx
/**
 * Test Signup Flow Script
 *
 * This script tests the signup flow by creating test users and checking if
 * userType is properly assigned in the database
 */
import { randomUUID } from 'crypto'
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { resolve } from 'path'

import { auth } from '../src/lib/better-auth'
import { db } from '../src/lib/database'
import { createLogger } from '../src/lib/logger'
import { user } from '../src/lib/schema'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const logger = createLogger('test-signup-flow')

async function testSignupFlow() {
  try {
    logger.info('🧪 Testing signup flow userType assignment...')

    // Create a test coach using Better Auth signUp API (simulating frontend signup)
    const testCoachEmail = `test-coach-${Date.now()}@example.com`
    const testRunnerEmail = `test-runner-${Date.now()}@example.com`

    // Test 1: Coach signup
    logger.info('📝 Test 1: Creating coach via Better Auth API...')

    const coachResult = await auth.api.signUpEmail({
      body: {
        email: testCoachEmail,
        password: 'TestPassword123!',
        name: 'Test Coach User',
        role: 'coach', // This should map to userType in DB
        fullName: 'Test Coach User',
      },
    })

    if (coachResult.error) {
      logger.error('❌ Coach signup failed:', coachResult.error)
    } else {
      logger.info('✅ Coach signup successful')

      // Check database record
      const coachRecord = await db
        .select({ id: user.id, email: user.email, role: user.role })
        .from(user)
        .where(eq(user.email, testCoachEmail))
      if (coachRecord.length > 0) {
        logger.info('🔍 Coach database record:', {
          email: coachRecord[0].email,
          role: coachRecord[0].role,
          userType: coachRecord[0].user_type,
        })

        if (coachRecord[0].user_type === 'coach') {
          logger.info('✅ Coach userType correctly assigned!')
        } else {
          logger.error('❌ Coach userType incorrect:', coachRecord[0].user_type)
        }
      }
    }

    // Test 2: Runner signup
    logger.info('📝 Test 2: Creating runner via Better Auth API...')

    const runnerResult = await auth.api.signUpEmail({
      body: {
        email: testRunnerEmail,
        password: 'TestPassword123!',
        name: 'Test Runner User',
        role: 'runner', // This should map to userType in DB
        fullName: 'Test Runner User',
      },
    })

    if (runnerResult.error) {
      logger.error('❌ Runner signup failed:', runnerResult.error)
    } else {
      logger.info('✅ Runner signup successful')

      // Check database record
      const runnerRecord = await db
        .select({ id: user.id, email: user.email, role: user.role })
        .from(user)
        .where(eq(user.email, testRunnerEmail))
      if (runnerRecord.length > 0) {
        logger.info('🔍 Runner database record:', {
          email: runnerRecord[0].email,
          role: runnerRecord[0].role,
          userType: runnerRecord[0].user_type,
        })

        if (runnerRecord[0].user_type === 'runner') {
          logger.info('✅ Runner userType correctly assigned!')
        } else {
          logger.error('❌ Runner userType incorrect:', runnerRecord[0].user_type)
        }
      }
    }

    // Clean up test users
    logger.info('🧹 Cleaning up test users...')
    await db.delete(user).where(eq(user.email, testCoachEmail))
    await db.delete(user).where(eq(user.email, testRunnerEmail))
    logger.info('✅ Cleanup complete')
  } catch (error) {
    logger.error('❌ Test failed:', error)
    throw error
  }
}

// Run the test
testSignupFlow()
  .then(() => {
    logger.info('✅ Signup flow test completed successfully')
    process.exit(0)
  })
  .catch(error => {
    logger.error('❌ Fatal error in signup flow test:', error)
    process.exit(1)
  })
