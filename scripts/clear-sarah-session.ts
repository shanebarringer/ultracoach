#!/usr/bin/env tsx
/**
 * Clear Sarah's Better Auth session to force fresh role detection
 *
 * This will delete any cached session data and force a fresh login
 * which should pick up the correct role from the database.
 */
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { createLogger } from '../src/lib/logger'
import { session, user } from '../src/lib/schema'

// Load environment variables
config({ path: '.env.local' })

const logger = createLogger('ClearSarahSession')

async function clearSarahSession() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    logger.error('DATABASE_URL environment variable is required')
    process.exit(1)
  }

  logger.info("Connecting to database to clear Sarah's sessions...")

  const sql = postgres(databaseUrl, { ssl: false }) // Local connection
  const db = drizzle(sql)

  try {
    // Find all Sarah records (by email)
    const sarahUsers = await db
      .select({ id: user.id, email: user.email, userType: user.userType })
      .from(user)
      .where(eq(user.email, 'sarah@ultracoach.dev'))

    if (sarahUsers.length === 0) {
      logger.warn('No Sarah users found in database')
      return
    }

    logger.info('Found Sarah users:', {
      count: sarahUsers.length,
      users: sarahUsers.map(u => ({
        id: u.id.slice(0, 8) + '...',
        role: u.role,
        email: u.email,
      })),
    })

    // Clear all sessions for all Sarah users
    for (const sarahUser of sarahUsers) {
      logger.info(`Clearing sessions for user ID: ${sarahUser.id.slice(0, 8)}...`)

      const deletedSessions = await db
        .delete(session)
        .where(eq(session.userId, sarahUser.id))
        .returning({ id: session.id })

      logger.info(
        `Cleared ${deletedSessions.length} sessions for user ${sarahUser.id.slice(0, 8)}...`
      )
    }

    logger.info(
      '✅ Successfully cleared all Sarah sessions. User must log in again to get fresh session with correct role.'
    )
  } catch (error) {
    logger.error('Error clearing Sarah sessions:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

// Run the script
clearSarahSession().catch(error => {
  console.error('Script failed:', error)
  process.exit(1)
})
