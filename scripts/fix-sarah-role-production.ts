#!/usr/bin/env tsx
/**
 * Fix Sarah's role in production database
 *
 * This script updates the user with ID 'YCvRROMcX1Yy7gwKfUrYfqc7lMJD7cbM'
 * (the actual user ID from the production session) to have role 'coach'.
 */
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { createLogger } from '../src/lib/logger'
import { user } from '../src/lib/schema'

// Load environment variables from .env.local
config({ path: '.env.local' })

const logger = createLogger('FixSarahRoleProduction')

async function fixSarahRoleInProduction() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    logger.error('DATABASE_URL environment variable is required')
    process.exit(1)
  }

  logger.info('Connecting to production database...', {
    host: databaseUrl.includes('supabase') ? 'supabase' : 'unknown',
  })

  // Create database connection
  const sql = postgres(databaseUrl, { ssl: 'require' })
  const db = drizzle(sql)

  try {
    // The user ID from production session logs
    const productionSarahId = 'YCvRROMcX1Yy7gwKfUrYfqc7lMJD7cbM'

    // First, check if this user exists
    logger.info('Looking for Sarah in production database...', {
      userId: productionSarahId,
    })

    const existingUser = await db
      .select({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      })
      .from(user)
      .where(eq(user.id, productionSarahId))
      .limit(1)

    if (existingUser.length === 0) {
      logger.error('User not found in production database', {
        userId: productionSarahId,
      })

      // Let's check what users DO exist
      const allUsers = await db
        .select({
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        })
        .from(user)
        .limit(10)

      logger.info('First 10 users in production database:', {
        users: allUsers.map(u => ({
          id: u.id.slice(0, 8) + '...',
          email: u.email,
          role: u.role,
        })),
      })

      process.exit(1)
    }

    const currentUser = existingUser[0]
    logger.info('Found Sarah in production database', {
      currentRole: currentUser.role,
      email: currentUser.email,
      name: currentUser.name,
    })

    if (currentUser.role === 'coach') {
      logger.info('Sarah already has coach role, no update needed')
      return
    }

    // Update Sarah's role to coach
    logger.info("Updating Sarah's role to coach...", {
      userId: productionSarahId,
      fromRole: currentUser.role,
      toRole: 'coach',
    })

    const updateResult = await db
      .update(user)
      .set({
        role: 'coach',
        updatedAt: new Date(),
      })
      .where(eq(user.id, productionSarahId))
      .returning({
        id: user.id,
        email: user.email,
        role: user.role,
      })

    if (updateResult.length > 0) {
      logger.info("✅ Successfully updated Sarah's role to coach", {
        updatedUser: updateResult[0],
      })
    } else {
      logger.error("❌ Failed to update Sarah's role")
    }
  } catch (error) {
    logger.error("Error fixing Sarah's role:", error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

// Run the script
fixSarahRoleInProduction().catch(error => {
  console.error('Script failed:', error)
  process.exit(1)
})
