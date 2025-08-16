#!/usr/bin/env tsx
/**
 * Secure Production Database Seeding Script
 * 
 * Uses Better Auth sign-up API for proper password hashing compatibility.
 * Replaces the deprecated database-operations.ts approach.
 * 
 * IMPORTANT: This script assumes the production app is running and accessible
 */
import { config } from 'dotenv'
import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { resolve } from 'path'
import postgres from 'postgres'

import { createLogger } from '../src/lib/logger'
import * as schema from '../src/lib/schema'

// Load production environment variables
config({ path: resolve(process.cwd(), '.env.production') })

const logger = createLogger('seed-production-secure')

const PRODUCTION_USERS = [
  {
    email: 'sarah@ultracoach.dev',
    password: 'UltraCoach2025!',
    name: 'Sarah Mountain',
    role: 'coach',
  },
  {
    email: 'marcus@ultracoach.dev', 
    password: 'UltraCoach2025!',
    name: 'Marcus Trail',
    role: 'coach',
  },
  {
    email: 'alex.rivera@ultracoach.dev',
    password: 'RunnerPass2025!',
    name: 'Alex Rivera',
    role: 'runner',
  },
  {
    email: 'jordan.chen@ultracoach.dev',
    password: 'RunnerPass2025!',
    name: 'Jordan Chen',
    role: 'runner',
  },
  {
    email: 'riley.parker@ultracoach.dev',
    password: 'RunnerPass2025!',
    name: 'Riley Parker',
    role: 'runner',
  }
]

// Setup production database connection
function setupProductionDB() {
  const databaseUrl = process.env.DATABASE_URL!
  
  if (!databaseUrl) {
    logger.error('DATABASE_URL not found in .env.production')
    throw new Error('Production DATABASE_URL not configured')
  }

  logger.info('🔗 Connecting to production database')
  const sql = postgres(databaseUrl, { ssl: 'require' })
  return drizzle(sql)
}

async function cleanupExistingUsers(db: ReturnType<typeof setupProductionDB>) {
  logger.info('🧹 Cleaning up existing test users in production...')
  
  try {
    // Find and delete existing test users
    for (const userData of PRODUCTION_USERS) {
      const existingUser = await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.email, userData.email))
        .limit(1)

      if (existingUser.length > 0) {
        const userId = existingUser[0].id
        await db.delete(schema.account).where(eq(schema.account.userId, userId))
        await db.delete(schema.user).where(eq(schema.user.id, userId))
        logger.info(`Cleaned up existing user: ${userData.email}`)
      }
    }
    
    logger.info('✅ Production cleanup completed')
  } catch (error) {
    logger.error('❌ Error during production cleanup:', error)
    throw error
  }
}

async function createUserWithBetterAuth(userData: typeof PRODUCTION_USERS[0], baseUrl: string): Promise<boolean> {
  logger.info(`Creating user via Better Auth API: ${userData.email}`)
  
  try {
    const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        role: userData.role,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(`Failed to create ${userData.email}: HTTP ${response.status}: ${errorText}`)
      return false
    }

    logger.info(`✅ Created user: ${userData.email} (${userData.role})`)
    return true
    
  } catch (error) {
    logger.error(`Error creating ${userData.email}:`, error)
    return false
  }
}

async function fixRoleMapping(db: ReturnType<typeof setupProductionDB>) {
  logger.info('🔧 Fixing role and userType mapping in production...')
  
  try {
    // Fix coaches
    await db.update(schema.user)
      .set({ role: 'user', userType: 'coach' })
      .where(sql`email IN ('sarah@ultracoach.dev', 'marcus@ultracoach.dev')`)
    
    // Fix runners  
    await db.update(schema.user)
      .set({ role: 'user', userType: 'runner' })
      .where(sql`email IN ('alex.rivera@ultracoach.dev', 'jordan.chen@ultracoach.dev', 'riley.parker@ultracoach.dev')`)
    
    logger.info('✅ Production role mapping fixed')
  } catch (error) {
    logger.error('❌ Error fixing production role mapping:', error)
    throw error
  }
}

async function verifyUsers(db: ReturnType<typeof setupProductionDB>) {
  logger.info('🔍 Verifying created users in production...')
  
  const finalUsers = await db
    .select()
    .from(schema.user)
    .where(sql`email IN ('sarah@ultracoach.dev', 'marcus@ultracoach.dev', 'alex.rivera@ultracoach.dev', 'jordan.chen@ultracoach.dev', 'riley.parker@ultracoach.dev')`)
  
  logger.info('Final verification:')
  for (const user of finalUsers) {
    logger.info(`  - ${user.email}: role=${user.role}, userType=${user.userType}`)
  }
  
  return finalUsers.length
}

async function seedProductionDatabase() {
  let db: ReturnType<typeof setupProductionDB> | null = null
  
  try {
    logger.info('🌱 Starting secure production database seeding...')
    
    // Setup database connection
    db = setupProductionDB()
    
    // Determine production URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.PRODUCTION_URL || 'https://ultracoach.vercel.app'
    
    logger.info(`📡 Using production URL: ${baseUrl}`)
    
    // Check if production app is accessible
    try {
      const healthCheck = await fetch(baseUrl)
      if (!healthCheck.ok) {
        throw new Error(`Production app not responding: ${healthCheck.status}`)
      }
      logger.info('✅ Production app is accessible')
    } catch (error) {
      logger.error(`❌ Production app not accessible at ${baseUrl}`)
      logger.error('   Please ensure the production deployment is running')
      logger.error('   Error:', error)
      process.exit(1)
    }
    
    // Step 1: Clean up existing users  
    await cleanupExistingUsers(db)
    
    // Step 2: Create users with Better Auth API
    logger.info('👥 Creating users with Better Auth API...')
    let successCount = 0
    
    for (const userData of PRODUCTION_USERS) {
      const success = await createUserWithBetterAuth(userData, baseUrl)
      if (success) successCount++
    }
    
    logger.info(`📊 Created ${successCount}/${PRODUCTION_USERS.length} users successfully`)
    
    // Step 3: Fix role mapping
    await fixRoleMapping(db)
    
    // Step 4: Verify final state
    const finalUserCount = await verifyUsers(db)
    
    if (finalUserCount === PRODUCTION_USERS.length) {
      logger.info('🎉 Production database seeding completed successfully!')
      logger.info('✅ All test users created with proper Better Auth compatibility')
      logger.info('✅ Authentication should work properly in production')
    } else {
      logger.error(`❌ Seeding incomplete - expected ${PRODUCTION_USERS.length} users, got ${finalUserCount}`)
      process.exit(1)
    }
    
  } catch (error) {
    logger.error('💥 Critical error during production database seeding:', error)
    process.exit(1)
  }
}

// Run the seeding
seedProductionDatabase()
  .then(() => {
    logger.info('🏁 Production database seeding script completed')
    process.exit(0)
  })
  .catch(error => {
    logger.error('💥 Fatal error in production seeding:', error)
    process.exit(1)
  })