#!/usr/bin/env tsx
/**
 * Comprehensive UltraCoach Production Seeding Script
 *
 * Production version of comprehensive-seed.ts
 * Uses .env.production and production database connection
 */
import { randomUUID } from 'crypto'
import { addDays } from 'date-fns'
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as fs from 'fs'
import { resolve } from 'path'
import postgres from 'postgres'

import { createLogger } from '../src/lib/logger'
import * as schema from '../src/lib/schema'

// Load PRODUCTION environment variables
config({ path: resolve(process.cwd(), '.env.production') })

const logger = createLogger('comprehensive-seed-production')

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  logger.error('DATABASE_URL not found in .env.production')
  process.exit(1)
}

// Create production database connection
const sql = postgres(DATABASE_URL, { ssl: 'require' })
const db = drizzle(sql, { schema })

// Same data as comprehensive-seed.ts but for production
// Use environment variable for primary coach email
const COACH_EMAIL = process.env.TEST_COACH_EMAIL || 'emma@ultracoach.dev'
const COACH_PASSWORD = process.env.TEST_COACH_PASSWORD || 'UltraCoach2025!'

const coaches = [
  {
    name: 'Emma Johnson',
    fullName: 'Emma Johnson',
    email: COACH_EMAIL,
    password: COACH_PASSWORD,
    specialties: ['50-mile', 'nutrition', 'mental training'],
  },
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
]

const runners = [
  // Same 15 runners as local version
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

// Import Better Auth with production config
async function createUsers() {
  logger.info('👥 Creating production users with direct database insertion...')

  const createdUsers: Array<{ id: string; role: 'coach' | 'runner'; name: string; email: string }> =
    []

  // Import Better Auth password hashing
  const { generateRandomString } = await import('better-auth/crypto')
  const { scrypt } = await import('crypto')
  const { promisify } = await import('util')
  const scryptAsync = promisify(scrypt)

  async function hashPassword(password: string): Promise<string> {
    const salt = generateRandomString(16)
    const hash = (await scryptAsync(password, salt, 32)) as Buffer
    return `${salt}:${hash.toString('hex')}`
  }

  // Create coaches
  for (const coach of coaches) {
    const userId = generateRandomString(10)
    const hashedPassword = await hashPassword(coach.password)

    // Insert user with CORRECT Better Auth fields
    await db.insert(schema.user).values({
      id: userId,
      email: coach.email,
      name: coach.name,
      role: 'user', // ✅ Better Auth standard role
      userType: 'coach', // ✅ Our application-specific role
      fullName: coach.fullName,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Create credential account
    await db.insert(schema.account).values({
      id: generateRandomString(10),
      accountId: coach.email,
      providerId: 'credential',
      userId: userId,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    createdUsers.push({ id: userId, role: 'coach', name: coach.name, email: coach.email })
    logger.info(`✅ Created coach: ${coach.name} (${coach.email})`)
  }

  // Create runners
  for (const runner of runners) {
    const userId = generateRandomString(10)
    const hashedPassword = await hashPassword('RunnerPass2025!')

    // Insert user with CORRECT Better Auth fields
    await db.insert(schema.user).values({
      id: userId,
      email: runner.email,
      name: runner.name,
      role: 'user', // ✅ Better Auth standard role
      userType: 'runner', // ✅ Our application-specific role
      fullName: runner.fullName,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Create credential account
    await db.insert(schema.account).values({
      id: generateRandomString(10),
      accountId: runner.email,
      providerId: 'credential',
      userId: userId,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    createdUsers.push({ id: userId, role: 'runner', name: runner.name, email: runner.email })
    logger.info(`✅ Created runner: ${runner.name} (${runner.email})`)
  }

  return createdUsers
}

async function main() {
  try {
    logger.info('🚀 Starting production comprehensive seeding...')

    // Create all users with correct Better Auth fields
    const users = await createUsers()

    logger.info('🎉 Production seeding complete!')
    logger.info(`📊 Summary: ${users.length} users created with proper Better Auth schema`)
    logger.info('   • role: "user" (Better Auth standard)')
    logger.info('   • userType: "coach"|"runner" (application roles)')
  } catch (error) {
    logger.error('❌ Production seeding failed:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

main()
