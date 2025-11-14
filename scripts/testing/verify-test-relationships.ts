#!/usr/bin/env tsx
/**
 * Verify Test Relationships
 *
 * Verifies that coach-runner relationships exist for Playwright test users.
 * This script is designed to run in CI pipelines to ensure test data is properly configured.
 */
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { resolve } from 'path'

import { db } from '../../src/lib/database'
import { createLogger } from '../../src/lib/logger'
import { coach_runners, user } from '../../src/lib/schema'

// Load environment variables - CI uses environment variables directly, not .env.local
if (process.env.NODE_ENV !== 'test') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs')
    const envPath = resolve(process.cwd(), '.env.local')
    if (fs.existsSync(envPath)) {
      config({ path: envPath })
    }
  } catch {
    // Silently continue if .env.local doesn't exist or can't be loaded
  }
}

const logger = createLogger('verify-test-relationships')

/**
 * Verify that coach-runner relationships exist for test users
 */
async function verifyRelationships() {
  logger.info('🔍 Verifying coach-runner relationships for test users...')

  // Get coach email from environment variable
  const coachEmail = process.env.TEST_COACH_EMAIL || 'emma@ultracoach.dev'
  const runnerEmails = ['alex.rivera@ultracoach.dev', 'riley.parker@ultracoach.dev']

  logger.info(`   Coach: ${coachEmail}`)
  logger.info(`   Expected Runners: ${runnerEmails.join(', ')}`)

  // Verify coach exists
  const coachResults = await db.select().from(user).where(eq(user.email, coachEmail)).limit(1)

  if (coachResults.length === 0) {
    logger.error(`❌ Coach not found: ${coachEmail}`)
    logger.error('   Ensure create-playwright-test-users.ts has been run successfully')
    process.exit(1)
  }

  const coach = coachResults[0]
  logger.info(`✅ Coach found: ${coach.name} (${coach.email}) [ID: ${coach.id}]`)

  // Verify runners exist
  const runnerResults = await db.select().from(user).where(eq(user.email, runnerEmails[0])).limit(2)

  logger.info(`   Found ${runnerResults.length} runner(s)`)

  // Query relationships for this coach
  const relationships = await db
    .select()
    .from(coach_runners)
    .where(eq(coach_runners.coach_id, coach.id))

  logger.info(`   Found ${relationships.length} relationship(s) for coach ${coach.name}`)

  // Verify relationships exist
  if (relationships.length === 0) {
    logger.error('❌ No coach-runner relationships found!')
    logger.error('   Expected at least 2 relationships (coach → alex, coach → riley)')
    logger.error('   Ensure create-playwright-test-users.ts has been run successfully')
    logger.error('   and relationships were created in the database')
    process.exit(1)
  }

  // Log relationship details for debugging
  for (const relationship of relationships) {
    // Get runner details for this relationship
    const runnerResults = await db
      .select()
      .from(user)
      .where(eq(user.id, relationship.runner_id))
      .limit(1)

    if (runnerResults.length > 0) {
      const runner = runnerResults[0]
      logger.info(
        `   ✅ Relationship: ${coach.name} → ${runner.name} (${runner.email}) [Status: ${relationship.status}]`
      )
    } else {
      logger.warn(
        `   ⚠️  Relationship exists but runner not found [Runner ID: ${relationship.runner_id}]`
      )
    }
  }

  // Verify minimum required relationships (at least 2)
  const expectedMinRelationships = 2
  if (relationships.length < expectedMinRelationships) {
    logger.error(
      `❌ Insufficient relationships: Found ${relationships.length}, expected at least ${expectedMinRelationships}`
    )
    logger.error('   Ensure both alex.rivera and riley.parker relationships exist')
    process.exit(1)
  }

  logger.info('✅ Coach-runner relationships verified successfully')
  logger.info(`   Total relationships: ${relationships.length}`)
  process.exit(0)
}

// Execute verification
verifyRelationships().catch(error => {
  logger.error('❌ Verification failed with error:')
  logger.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
