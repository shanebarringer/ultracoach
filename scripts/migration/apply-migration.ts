#!/usr/bin/env tsx
import { config } from 'dotenv'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { resolve } from 'path'
import { Pool } from 'pg'

import { createLogger } from '../src/lib/logger'

// Load environment variables from .env.local BEFORE importing anything that uses them
config({ path: resolve(process.cwd(), '.env.local') })

const logger = createLogger('migration')

async function applyMigration() {
  logger.info('🔧 Applying Better Auth session token migration...')

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  // Create database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === 'production'
        ? {
            rejectUnauthorized: true, // Require valid SSL certificates in production
            ca: process.env.DATABASE_SSL_CERT, // Optional: specify CA certificate
          }
        : false,
  })

  const db = drizzle(pool)

  try {
    // Apply the migration
    logger.info('Adding token column...')
    await db.execute(sql`
      ALTER TABLE better_auth_sessions 
      ADD COLUMN IF NOT EXISTS token text NOT NULL DEFAULT 'temp_token_' || generate_random_uuid()::text
    `)

    logger.info('Adding unique constraint...')
    try {
      await db.execute(sql`
        ALTER TABLE better_auth_sessions 
        ADD CONSTRAINT better_auth_sessions_token_unique UNIQUE (token)
      `)
    } catch (error: any) {
      // Constraint might already exist, check if it's due to that
      const errorString = String(error)
      logger.info('Caught error:', errorString)
      if (errorString.includes('already exists') || errorString.includes('relation')) {
        logger.info('Constraint already exists, skipping...')
      } else {
        throw error
      }
    }

    logger.info('Removing default...')
    await db.execute(sql`
      ALTER TABLE better_auth_sessions 
      ALTER COLUMN token DROP DEFAULT
    `)

    logger.info('✅ Migration applied successfully!')
  } catch (error) {
    logger.error('❌ Migration failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

// Handle script execution
if (require.main === module) {
  applyMigration()
    .then(() => {
      process.exit(0)
    })
    .catch(error => {
      logger.error('❌ Migration failed:', error)
      process.exit(1)
    })
}

export { applyMigration }
