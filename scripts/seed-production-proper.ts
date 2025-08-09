#!/usr/bin/env tsx
/**
 * Production Database Seeding - Using Same Logic as Local Seeds
 *
 * Creates production users using the same database insertion pattern
 * as our local seed script for consistency and proper Better Auth integration.
 */
import { generateRandomString } from 'better-auth/crypto'
import { scrypt } from 'crypto'
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { promisify } from 'util'

import { db } from '../src/lib/database'
import * as schema from '../src/lib/schema'

// Load production environment variables
config({ path: '.env.production' })

// Simple console logger for scripts
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
}

// Password hashing using scrypt (matching Better Auth's default)
const scryptAsync = promisify(scrypt)

async function defaultHash(password: string): Promise<string> {
  const salt = generateRandomString(16)
  const hash = (await scryptAsync(password, salt, 32)) as Buffer
  return `${salt}:${hash.toString('hex')}`
}

// Production users data
function getProductionUsersData() {
  return [
    {
      email: 'admin@ultracoach.com',
      password: 'AdminUltraCoach2024!',
      name: 'UltraCoach Admin',
      fullName: 'UltraCoach Admin',
      role: 'coach' as const,
    },
    {
      email: 'demo.coach@ultracoach.com',
      password: 'DemoCoach2024!',
      name: 'Demo Coach',
      fullName: 'Demo Coach',
      role: 'coach' as const,
    },
    {
      email: 'demo.runner@ultracoach.com',
      password: 'DemoRunner2024!',
      name: 'Demo Runner',
      fullName: 'Demo Runner',
      role: 'runner' as const,
    },
  ]
}

async function seedProductionUsers() {
  logger.info('👥 Creating production users using Better Auth patterns...')
  logger.warn('⚠️  Creating users in PRODUCTION environment!')

  const productionUsersData = getProductionUsersData()

  // Import Better Auth instance
  const { auth } = await import('../src/lib/better-auth')

  for (const userData of productionUsersData) {
    try {
      logger.info(`Creating user: ${userData.email}`)

      // Check if user already exists first
      const existingUser = await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.email, userData.email))
        .limit(1)

      if (existingUser.length > 0) {
        logger.info(`User ${userData.email} already exists, updating role...`)

        // Update the role in case it wasn't set correctly
        await db
          .update(schema.user)
          .set({ role: userData.role, updatedAt: new Date() })
          .where(eq(schema.user.email, userData.email))

        logger.info(`✅ Updated role for: ${userData.email} (${userData.role})`)
        continue
      }

      // Use direct database insertion with Better Auth patterns
      // Generate a proper user ID
      const userId = generateRandomString(32) // Better Auth uses longer IDs

      // Insert user directly into database
      await db.insert(schema.user).values({
        id: userId,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        fullName: userData.fullName,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      logger.info(`✅ Created user: ${userData.email} (${userData.role})`)

      // Create credential account for password authentication
      // Use Better Auth's internal password hashing
      const hashedPassword =
        (await auth.options.emailAndPassword?.password?.hash?.(userData.password)) ||
        (await defaultHash(userData.password))

      await db.insert(schema.account).values({
        id: generateRandomString(32),
        accountId: userId, // Link to the user
        providerId: 'credential', // Important: Must be 'credential' for email/password
        userId: userId,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      logger.info(`✅ Created credential account for: ${userData.email}`)
    } catch (error) {
      logger.error(`🚨 EXCEPTION while creating user ${userData.email}:`, error)
    }
  }
}

async function main() {
  try {
    logger.info('🌱 Starting production database seeding...')

    await seedProductionUsers()

    // Show final user summary
    const users = await db.select().from(schema.user)
    logger.info('')
    logger.info('📊 Production Users Summary:')
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    for (const user of users) {
      logger.info(`${user.role.toUpperCase()}: ${user.email} (ID: ${user.id})`)
    }

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    logger.info('')
    logger.info('📋 Production Login Credentials:')
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    for (const userData of getProductionUsersData()) {
      logger.info(`${userData.role.toUpperCase()}: ${userData.email} / ${userData.password}`)
    }

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    logger.info('🔐 Store these credentials securely!')
    logger.info('✅ Production database seeding completed successfully!')
  } catch (error) {
    logger.error('❌ Production database seeding failed:', error)
    process.exit(1)
  }
}

// Run the seeding
main()
