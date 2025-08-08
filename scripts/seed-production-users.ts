#!/usr/bin/env tsx
/**
 * Production User Seeding Script
 *
 * Creates production-ready users via Better Auth API to ensure proper password hashing
 *
 * Usage: pnpm tsx scripts/seed-production-users.ts
 */
import { config } from 'dotenv'

// Simple console logger for scripts
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
}

// Load production environment variables
config({ path: '.env.production' })

const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL
if (!BETTER_AUTH_URL) {
  logger.error('BETTER_AUTH_URL not found in .env.production')
  process.exit(1)
}

// Production users to create
const PRODUCTION_USERS = [
  {
    email: 'admin@ultracoach.com',
    password: 'AdminUltraCoach2024!',
    name: 'UltraCoach Admin',
    role: 'coach',
  },
  {
    email: 'demo.coach@ultracoach.com',
    password: 'DemoCoach2024!',
    name: 'Demo Coach',
    role: 'coach',
  },
  {
    email: 'demo.runner@ultracoach.com',
    password: 'DemoRunner2024!',
    name: 'Demo Runner',
    role: 'runner',
  },
] as const

async function createProductionUser(user: (typeof PRODUCTION_USERS)[0]) {
  try {
    logger.info(`Creating user: ${user.email}`)

    const response = await fetch(`${BETTER_AUTH_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'UltraCoach-Production-Seeder/1.0',
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        name: user.name,
        role: user.role,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    logger.info(`✅ Created user: ${user.email} (ID: ${result.user?.id})`)

    return result
  } catch (error) {
    logger.error(`❌ Failed to create user ${user.email}:`, error)
    throw error
  }
}

async function seedProductionUsers() {
  try {
    logger.info('🌱 Starting production user seeding...')
    logger.info(`📍 Using Better Auth URL: ${BETTER_AUTH_URL}`)

    for (const user of PRODUCTION_USERS) {
      await createProductionUser(user)
      // Longer delay between user creations to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    logger.info('✅ Production user seeding completed successfully!')
    logger.info('')
    logger.info('📋 Production Login Credentials:')
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    for (const user of PRODUCTION_USERS) {
      logger.info(`${user.role.toUpperCase()}: ${user.email} / ${user.password}`)
    }

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    logger.info('🔐 Store these credentials securely!')
  } catch (error) {
    logger.error('❌ Production user seeding failed:', error)
    process.exit(1)
  }
}

// Run the seeding
seedProductionUsers()
