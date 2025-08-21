#!/usr/bin/env tsx

/**
 * Sync Production Schema Script
 * 
 * This script syncs the production database schema to match our local development schema exactly.
 * It uses our current schema definition to recreate all tables with the correct structure.
 */

import { config } from 'dotenv'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { createLogger } from '../src/lib/logger'
import * as schema from '../src/lib/schema'

const logger = createLogger('sync-production-schema')

async function main() {
  try {
    // Load production environment variables
    config({ path: '.env.production' })

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required')
    }

    logger.info('Starting production schema sync', {
      environment: 'production',
      timestamp: new Date().toISOString(),
    })

    // Create connection
    const client = postgres(process.env.DATABASE_URL, {
      ssl: { rejectUnauthorized: false },
      max: 1,
      idle_timeout: 30,
      connect_timeout: 30,
      prepare: false,
    })

    const db = drizzle(client, { schema })

    // Run any pending migrations
    logger.info('Applying migrations...')
    await migrate(db, { migrationsFolder: './supabase/migrations' })

    logger.info('Production schema sync completed successfully')

    // Clean up
    await client.end()
    process.exit(0)
  } catch (error) {
    logger.error('Production schema sync failed', { error })
    process.exit(1)
  }
}

main()