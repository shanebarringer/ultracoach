#!/usr/bin/env tsx

/**
 * Database Keep-Alive Script
 * 
 * Prevents Supabase production database from auto-pausing due to inactivity.
 * This script should be run periodically (e.g., every 6 hours) via cron job or scheduled task.
 * 
 * Usage:
 *   NODE_ENV=production tsx scripts/database-keepalive.ts
 * 
 * Cron job example (every 6 hours):
 *   0 0/6 * * * cd /path/to/ultracoach && NODE_ENV=production tsx scripts/database-keepalive.ts
 */

import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql } from 'drizzle-orm'
import postgres from 'postgres'

import { createLogger } from '../src/lib/logger'

const logger = createLogger('database-keepalive')

async function main() {
  try {
    // Load production environment variables
    const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local'
    config({ path: envFile })

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required')
    }

    logger.info('Starting database keep-alive ping', {
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    })

    // Create a temporary database connection
    const client = postgres(process.env.DATABASE_URL, {
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 1, // Single connection for this script
      idle_timeout: 30,
      connect_timeout: 10,
      prepare: false,
    })

    const db = drizzle(client)

    // Simple keep-alive query
    const startTime = Date.now()
    const result = await db.execute(
      sql`SELECT 1 as keepalive, current_database(), current_user, now() as timestamp, pg_database_size(current_database()) as db_size`
    )
    const queryTime = Date.now() - startTime

    const row = result[0] as any

    logger.info('Database keep-alive successful', {
      queryTime,
      database: row?.current_database,
      user: row?.current_user,
      timestamp: row?.timestamp,
      dbSize: row?.db_size,
    })

    // Clean up connection
    await client.end()

    logger.info('Database keep-alive completed successfully')
    process.exit(0)
  } catch (error) {
    logger.error('Database keep-alive failed', { error })
    process.exit(1)
  }
}

// Run the script
main()