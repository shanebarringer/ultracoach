#!/usr/bin/env tsx
/**
 * Create coach-runner relationships for testing
 */
import { createLogger } from '../src/lib/logger'

const logger = createLogger('create-test-relationships')

// Test user credentials with their new IDs
const COACH = {
  name: 'Sarah Chen',
  email: 'sarah@ultracoach.dev',
  userId: '4rOAVOBibps2j5hAN9A8X5mM6B23bTSW',
}

const RUNNERS = [
  {
    name: 'Riley Parker',
    email: 'riley.parker@ultracoach.dev',
    userId: 'NU12c66I1ACHqNvmRFJDAY6pr0w0OVZL',
  },
  {
    name: 'Alex Rivera',
    email: 'alex.rivera@ultracoach.dev',
    userId: 'btQaqCnR9fzWxCJpg6M6Kolf8JCPmJap',
  },
]

async function createRelationship(coachId: string, runnerId: string) {
  const BASE_URL = 'http://localhost:3001'

  try {
    logger.info(
      `🔗 Creating relationship: ${COACH.name} → ${RUNNERS.find(r => r.userId === runnerId)?.name}`
    )

    // First sign in as coach to get session
    const loginResponse = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: COACH.email,
        password: 'UltraCoach2025!',
      }),
    })

    if (!loginResponse.ok) {
      throw new Error(`Coach login failed: ${await loginResponse.text()}`)
    }

    // Extract session cookies
    const cookies = loginResponse.headers.get('set-cookie') || ''

    // Create the relationship
    const relationshipResponse = await fetch(`${BASE_URL}/api/coach-runners`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies,
      },
      body: JSON.stringify({
        target_user_id: runnerId,
        relationship_type: 'standard',
        notes: 'Test relationship for Playwright E2E tests',
      }),
    })

    if (relationshipResponse.ok) {
      const relationship = await relationshipResponse.json()
      logger.info(`✅ Relationship created successfully!`, {
        id: relationship.id,
        status: relationship.status,
      })
      return true
    } else {
      const errorText = await relationshipResponse.text()
      logger.error(`❌ Failed to create relationship:`, errorText)
      return false
    }
  } catch (error) {
    logger.error(`💥 Error creating relationship:`, error)
    return false
  }
}

async function createAllTestRelationships() {
  logger.info('🚀 Creating test relationships for messaging tests...')

  const results = []
  for (const runner of RUNNERS) {
    const success = await createRelationship(COACH.userId, runner.userId)
    results.push({
      coach: COACH.name,
      runner: runner.name,
      success,
    })
  }

  // Summary
  console.log('\n📊 Relationship Creation Results:')
  results.forEach(({ coach, runner, success }) => {
    console.log(`${success ? '✅' : '❌'} ${coach} ↔ ${runner}`)
  })

  const allSuccess = results.every(r => r.success)

  if (allSuccess) {
    console.log('\n🎉 All test relationships created!')
    console.log('\n🧪 Playwright tests should now work properly')
    console.log('\n📧 Test Users Ready:')
    console.log(`- Coach: ${COACH.name} (${COACH.email})`)
    RUNNERS.forEach(runner => {
      console.log(`- Runner: ${runner.name} (${runner.email})`)
    })
  } else {
    console.log('\n⚠️  Some relationships failed to create')
  }

  return allSuccess
}

// Run the relationship creation
createAllTestRelationships()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    logger.error('💥 Script failed:', error)
    process.exit(1)
  })
