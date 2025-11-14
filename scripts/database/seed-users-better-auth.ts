#!/usr/bin/env tsx
import { config } from 'dotenv'
import * as fs from 'fs'
import { resolve } from 'path'

import { createLogger } from '../../src/lib/logger'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const logger = createLogger('seed-users-better-auth')

// Use environment variable for coach email with emma@ultracoach.dev as default
const COACH_EMAIL = process.env.TEST_COACH_EMAIL || 'emma@ultracoach.dev'
const COACH_PASSWORD = process.env.TEST_COACH_PASSWORD || 'UltraCoach2025!'

// Test users with their passwords and user types
// IMPORTANT: These must match the test credentials in tests/utils/test-helpers.ts
const testUsers = [
  {
    email: COACH_EMAIL,
    password: COACH_PASSWORD,
    name: 'Emma Johnson',
    userType: 'coach',
    fullName: 'Emma Johnson',
  },
  {
    email: 'sarah.martinez@ultracoach.dev',
    password: 'UltraCoach2025!',
    name: 'Sarah Martinez',
    userType: 'coach',
    fullName: 'Sarah Martinez',
  },
  {
    email: 'michael.chen@ultracoach.dev',
    password: 'UltraCoach2025!',
    name: 'Michael Chen',
    userType: 'coach',
    fullName: 'Michael Chen',
  },
  {
    email: 'alex.rivera@ultracoach.dev',
    password: 'RunnerPass2025!',
    name: 'Alex Rivera',
    userType: 'runner',
    fullName: 'Alex Rivera',
  },
  {
    email: 'riley.parker@ultracoach.dev',
    password: 'RunnerPass2025!',
    name: 'Riley Parker',
    userType: 'runner',
    fullName: 'Riley Parker',
  },
]

async function signUpUser(userData: (typeof testUsers)[0]) {
  const response = await fetch('http://localhost:3001/api/auth/sign-up/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: userData.email,
      password: userData.password,
      name: userData.name,
      userType: userData.userType,
      fullName: userData.fullName,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`HTTP ${response.status}: ${error}`)
  }

  return await response.json()
}

async function clearExistingUsers() {
  logger.info('🗑️ Clearing existing users and accounts...')

  const { db } = await import('../../src/lib/database')
  const schema = await import('../../src/lib/schema')

  // Delete accounts first (due to foreign key constraints)
  await db.delete(schema.account)
  await db.delete(schema.user)

  logger.info('✅ Cleared existing users and accounts')
}

async function createTestUsers() {
  logger.info('👥 Creating test users via Better Auth sign-up API...')

  for (const userData of testUsers) {
    try {
      logger.info(`Creating user: ${userData.email}`)

      const result = await signUpUser(userData)
      logger.info(`✅ Created user: ${userData.email} (${userData.userType})`)
    } catch (error) {
      logger.error(`❌ Error creating ${userData.email}:`, error)
    }
  }
}

async function createCoachRunnerRelationships() {
  logger.info('🔗 Creating coach-runner relationships...')

  const { db } = await import('../../src/lib/database')
  const { user } = await import('../../src/lib/schema')
  const { eq, sql } = await import('drizzle-orm')

  // Find coach and runner IDs
  const coachUser = await db.select().from(user).where(eq(user.email, COACH_EMAIL)).limit(1)

  const alexUser = await db
    .select()
    .from(user)
    .where(eq(user.email, 'alex.rivera@ultracoach.dev'))
    .limit(1)

  const rileyUser = await db
    .select()
    .from(user)
    .where(eq(user.email, 'riley.parker@ultracoach.dev'))
    .limit(1)

  if (coachUser.length === 0 || alexUser.length === 0 || rileyUser.length === 0) {
    logger.error('❌ Cannot create relationships - missing required users')
    return
  }

  const coachId = coachUser[0].id
  const alexId = alexUser[0].id
  const rileyId = rileyUser[0].id

  // Create relationships (idempotent with ON CONFLICT DO NOTHING)
  await db.execute(sql`
    INSERT INTO coach_runners (id, coach_id, runner_id, status, relationship_type, invited_by, relationship_started_at, created_at, updated_at)
    VALUES
      (gen_random_uuid(), ${coachId}, ${alexId}, 'active', 'standard', 'coach', NOW(), NOW(), NOW()),
      (gen_random_uuid(), ${coachId}, ${rileyId}, 'active', 'standard', 'coach', NOW(), NOW(), NOW())
    ON CONFLICT DO NOTHING
  `)

  logger.info(
    `✅ Coach-runner relationships created: ${COACH_EMAIL} -> alex.rivera@ultracoach.dev, riley.parker@ultracoach.dev`
  )
}

function updateEnvLocal() {
  const envPath = resolve(process.cwd(), '.env.local')
  let envContent = ''

  // Read existing .env.local if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8')
  }

  // Remove existing test user credentials from env content
  const testUserKeys = [
    'TEST_COACH_EMAIL',
    'TEST_COACH_PASSWORD',
    'TEST_COACH2_EMAIL',
    'TEST_COACH2_PASSWORD',
    'TEST_RUNNER_EMAIL',
    'TEST_RUNNER_PASSWORD',
    'TEST_RUNNER2_EMAIL',
    'TEST_RUNNER2_PASSWORD',
  ]

  // Remove old test user lines
  const lines = envContent.split('\n').filter(line => {
    const key = line.split('=')[0]
    return !testUserKeys.includes(key) && !line.startsWith('# Test user credentials')
  })

  // Add updated test user credentials
  lines.push('')
  lines.push('# Test user credentials (auto-generated by Better Auth seed script)')

  const roleCounters: Record<'coach' | 'runner', number> = { coach: 0, runner: 0 }
  testUsers.forEach(user => {
    // Type-safe role access with validation
    const userRole = user.userType as 'coach' | 'runner'
    if (userRole !== 'coach' && userRole !== 'runner') {
      logger.warn(`Skipping user ${user.email} with invalid userType: ${user.userType}`)
      return
    }

    roleCounters[userRole]++
    const role = userRole.toUpperCase()
    const suffix = roleCounters[userRole] > 1 ? roleCounters[userRole].toString() : ''
    const roleKey = `${role}${suffix}`

    lines.push(`TEST_${roleKey}_EMAIL=${user.email}`)
    lines.push(`TEST_${roleKey}_PASSWORD=${user.password}`)
  })

  lines.push('')

  // Write updated content back to .env.local
  fs.writeFileSync(envPath, lines.join('\n'))
  logger.info(`✅ Updated .env.local with test user credentials`)
}

async function main() {
  try {
    logger.info('🌱 Starting Better Auth user seeding...')

    // Clear existing users first
    await clearExistingUsers()

    // Update .env.local with credentials
    updateEnvLocal()

    // Create test users via Better Auth API
    await createTestUsers()

    // Create coach-runner relationships
    await createCoachRunnerRelationships()

    logger.info('✅ Better Auth user seeding completed')
    logger.info(`
🎯 Test users created! Use these credentials to login:
• ${COACH_EMAIL} / ${COACH_PASSWORD} (Coach)
• sarah.martinez@ultracoach.dev / UltraCoach2025! (Coach)
• michael.chen@ultracoach.dev / UltraCoach2025! (Coach)
• alex.rivera@ultracoach.dev / RunnerPass2025! (Runner - linked to ${COACH_EMAIL})
• riley.parker@ultracoach.dev / RunnerPass2025! (Runner - linked to ${COACH_EMAIL})
    `)
    process.exit(0)
  } catch (error) {
    logger.error('❌ Better Auth user seeding failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
