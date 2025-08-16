#!/usr/bin/env tsx
/**
 * Shared Database Operations Module
 *
 * This module provides unified database operations that work with both
 * local (.env.local) and production (.env.production) environments.
 *
 * Key features:
 * - Environment-aware connection management
 * - Proper Better Auth schema with corrected role/userType fields
 * - Shared seeding logic using corrected Drizzle migrations
 * - Consistent user creation with proper field mapping
 */
import { generateRandomString } from 'better-auth/crypto'
import { scrypt } from 'crypto'
import { addDays, format, startOfDay } from 'date-fns'
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { drizzle as drizzlePG } from 'drizzle-orm/postgres-js'
import * as fs from 'fs'
import * as path from 'path'
import { resolve } from 'path'
import { Pool } from 'pg'
import postgres from 'postgres'
import { promisify } from 'util'

import { db } from '../../src/lib/database'
import { createLogger } from '../../src/lib/logger'
import * as schema from '../../src/lib/schema'

// Types
export interface DatabaseConfig {
  environment: 'local' | 'production'
  envFile: string
  databaseUrl: string
  db: ReturnType<typeof drizzle> | ReturnType<typeof drizzlePG>
}

export interface TestUser {
  email: string
  password: string
  name: string
  fullName: string
  role: 'coach' | 'runner'
}

// Environment Detection and Setup
export function setupEnvironment(targetEnv: 'local' | 'production' = 'local'): DatabaseConfig {
  const logger = createLogger('database-setup')

  let envFile: string
  let databaseUrl: string

  if (targetEnv === 'production') {
    envFile = '.env.production'
    config({ path: resolve(process.cwd(), envFile) })
    databaseUrl = process.env.DATABASE_URL!

    if (!databaseUrl) {
      logger.error(`DATABASE_URL not found in ${envFile}`)
      throw new Error('Production DATABASE_URL not configured')
    }

    logger.info(`🔗 Connected to production database`)
    const sql = postgres(databaseUrl, { ssl: 'require' })
    const prodDb = drizzlePG(sql)

    return {
      environment: 'production',
      envFile,
      databaseUrl,
      db: prodDb,
    }
  } else {
    envFile = '.env.local'
    config({ path: resolve(process.cwd(), envFile) })
    databaseUrl = process.env.DATABASE_URL!

    if (!databaseUrl) {
      logger.error(`DATABASE_URL not found in ${envFile}`)
      throw new Error('Local DATABASE_URL not configured')
    }

    logger.info(`🔗 Connected to local database`)
    // Use the existing database connection from our main module
    return {
      environment: 'local',
      envFile,
      databaseUrl,
      db: db,
    }
  }
}

// Password Hashing (Better Auth compatible)
// ⚠️ SECURITY NOTICE: This custom implementation is deprecated and causes authentication failures
// Use Better Auth's sign-up API instead for proper password hashing compatibility
const scryptAsync = promisify(scrypt)

export async function hashPassword(password: string): Promise<string> {
  const logger = createLogger('database-operations')
  logger.warn(
    '⚠️ WARNING: Custom password hashing is deprecated and causes authentication failures!'
  )
  logger.warn('   Use Better Auth sign-up API instead for proper compatibility')
  logger.warn('   See: scripts/create-test-users-via-api.ts for correct approach')

  const salt = generateRandomString(16)
  const hash = (await scryptAsync(password, salt, 32)) as Buffer
  return `${salt}:${hash.toString('hex')}`
}

// Test User Data Generation
export function getTestUsersData(): TestUser[] {
  return [
    {
      email: process.env.TEST_COACH_EMAIL || 'sarah@ultracoach.dev',
      password: process.env.TEST_COACH_PASSWORD || 'UltraCoach2025!',
      name: 'Sarah Mountain',
      fullName: 'Sarah Mountain',
      role: 'coach' as const,
    },
    {
      email: process.env.TEST_COACH2_EMAIL || 'marcus@ultracoach.dev',
      password: process.env.TEST_COACH2_PASSWORD || 'UltraCoach2025!',
      name: 'Marcus Trail',
      fullName: 'Marcus Trail',
      role: 'coach' as const,
    },
    {
      email: process.env.TEST_RUNNER_EMAIL || 'alex.rivera@ultracoach.dev',
      password: process.env.TEST_RUNNER_PASSWORD || 'RunnerPass2025!',
      name: 'Alex Trail',
      fullName: 'Alex Trail',
      role: 'runner' as const,
    },
    {
      email: process.env.TEST_RUNNER2_EMAIL || 'jordan.chen@ultracoach.dev',
      password: process.env.TEST_RUNNER2_PASSWORD || 'RunnerPass2025!',
      name: 'Jordan Chen',
      fullName: 'Jordan Chen',
      role: 'runner' as const,
    },
  ]
}

// User Creation with Proper Better Auth Fields
export async function createUser(
  dbConfig: DatabaseConfig,
  userData: TestUser,
  logger: ReturnType<typeof createLogger>
): Promise<string> {
  logger.warn('⚠️ WARNING: This function uses deprecated custom password hashing!')
  logger.warn('   Users created this way will have authentication failures.')
  logger.warn('   Use scripts/create-test-users-via-api.ts instead for Better Auth compatibility.')
  logger.info(`Creating user: ${userData.email}`)

  // Check if user already exists
  const existingUser = await dbConfig.db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, userData.email))
    .limit(1)

  if (existingUser.length > 0) {
    logger.info(`User ${userData.email} already exists, skipping...`)
    return existingUser[0].id
  }

  // Generate proper user ID
  const userId = generateRandomString(10)

  // Insert user with CORRECT Better Auth field mapping
  await dbConfig.db.insert(schema.user).values({
    id: userId,
    email: userData.email,
    name: userData.name,
    role: 'user', // ✅ Better Auth standard role
    userType: userData.role, // ✅ Our application-specific role (coach/runner)
    fullName: userData.fullName,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  logger.info(`✅ Created user: ${userData.email} (${userData.role})`)

  // Create credential account for password authentication
  // ⚠️ This will use deprecated password hashing that causes auth failures!
  const passwordHash = await hashPassword(userData.password)

  await dbConfig.db.insert(schema.account).values({
    id: generateRandomString(10),
    accountId: userData.email,
    providerId: 'credential',
    userId: userId,
    password: passwordHash,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  logger.warn(`⚠️ Created credential account with deprecated password hash for: ${userData.email}`)
  logger.warn('   This user will likely have authentication failures!')

  return userId
}

// Static Data Seeding
export async function seedStaticData(
  dbConfig: DatabaseConfig,
  logger: ReturnType<typeof createLogger>
): Promise<void> {
  logger.info('📋 Seeding static data (training phases and plan templates)...')

  // Training phases data
  const trainingPhasesData = [
    {
      name: 'Base Building',
      description: 'Build aerobic base and running volume',
      duration_weeks: 4,
      focus_areas: ['aerobic_development', 'volume_building'],
      intensity_distribution: { easy: 80, moderate: 15, hard: 5 },
    },
    {
      name: 'Build Phase',
      description: 'Introduce race-specific training and speed work',
      duration_weeks: 4,
      focus_areas: ['race_pace', 'threshold_training'],
      intensity_distribution: { easy: 70, moderate: 20, hard: 10 },
    },
    // Add other phases as needed...
  ]

  // Seed training phases
  for (const phaseData of trainingPhasesData) {
    try {
      const existingPhase = await dbConfig.db
        .select()
        .from(schema.training_phases)
        .where(eq(schema.training_phases.name, phaseData.name))
        .limit(1)

      if (existingPhase.length === 0) {
        await dbConfig.db.insert(schema.training_phases).values({
          id: generateRandomString(10),
          name: phaseData.name,
          description: phaseData.description,
          duration_weeks: phaseData.duration_weeks,
          focus_areas: phaseData.focus_areas,
          intensity_distribution: phaseData.intensity_distribution,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        logger.info(`✅ Created training phase: ${phaseData.name}`)
      } else {
        logger.info(`Training phase "${phaseData.name}" already exists, skipping...`)
      }
    } catch (error) {
      logger.error(`❌ Failed to create training phase "${phaseData.name}":`, error)
    }
  }
}

// Environment File Update
export function updateEnvFile(
  envFile: string,
  testUsers: TestUser[],
  logger: ReturnType<typeof createLogger>
): void {
  const envPath = resolve(process.cwd(), envFile)
  let envContent = ''

  // Read existing env file if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8')
  }

  // Remove existing test user credentials
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

  const lines = envContent.split('\n').filter(line => {
    const key = line.split('=')[0]
    return !testUserKeys.includes(key) && !line.startsWith('# Test user credentials')
  })

  // Add updated test user credentials
  lines.push('')
  lines.push('# Test user credentials (auto-generated by seed script)')

  const roleCounters = { coach: 0, runner: 0 }
  testUsers.forEach(user => {
    roleCounters[user.role]++
    const role = user.role.toUpperCase()
    const suffix = roleCounters[user.role] > 1 ? roleCounters[user.role].toString() : ''
    const roleKey = `${role}${suffix}`

    lines.push(`TEST_${roleKey}_EMAIL=${user.email}`)
    lines.push(`TEST_${roleKey}_PASSWORD=${user.password}`)
  })

  lines.push('')

  fs.writeFileSync(envPath, lines.join('\n'))
  logger.info(`✅ Updated ${envFile} with test user credentials`)
}

// Complete Database Seeding
export async function seedDatabase(targetEnv: 'local' | 'production' = 'local'): Promise<void> {
  const logger = createLogger(`database-seed-${targetEnv}`)

  logger.info(`🌱 Starting ${targetEnv} database seeding...`)

  try {
    // Setup environment and database connection
    const dbConfig = setupEnvironment(targetEnv)

    // Get test user data
    const testUsers = getTestUsersData()

    // Update environment file with credentials
    updateEnvFile(dbConfig.envFile, testUsers, logger)

    // Seed static data
    await seedStaticData(dbConfig, logger)

    // Create test users
    logger.info('👥 Creating test users with proper Better Auth fields...')
    const userIds: string[] = []

    for (const userData of testUsers) {
      const userId = await createUser(dbConfig, userData, logger)
      userIds.push(userId)
    }

    logger.info(`✅ ${targetEnv} database seeding completed successfully!`)
    logger.info(`📊 Summary:`)
    logger.info(`  - Users created: ${userIds.length}`)
    logger.info(`  - Environment: ${targetEnv}`)
    logger.info(`  - Config file: ${dbConfig.envFile}`)
  } catch (error) {
    logger.error(`❌ ${targetEnv} database seeding failed:`, error)
    throw error
  }
}
