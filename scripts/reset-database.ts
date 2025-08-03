#!/usr/bin/env tsx
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { resolve } from 'path'
import { Pool } from 'pg'

import { createLogger } from '../src/lib/logger'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const logger = createLogger('database-reset')

async function resetDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })

  const db = drizzle(pool)

  try {
    logger.info('🗑️ Dropping all tables...')

    // Drop all tables (order matters due to foreign key constraints)
    const dropQueries = [
      'DROP TABLE IF EXISTS messages CASCADE',
      'DROP TABLE IF EXISTS conversations CASCADE',
      'DROP TABLE IF EXISTS workouts CASCADE',
      'DROP TABLE IF EXISTS training_plan_phases CASCADE',
      'DROP TABLE IF EXISTS training_plans CASCADE',
      'DROP TABLE IF EXISTS plan_templates CASCADE',
      'DROP TABLE IF EXISTS training_phases CASCADE',
      'DROP TABLE IF EXISTS better_auth_verification_tokens CASCADE',
      'DROP TABLE IF EXISTS better_auth_sessions CASCADE',
      'DROP TABLE IF EXISTS better_auth_accounts CASCADE',
      'DROP TABLE IF EXISTS better_auth_users CASCADE',
      // Also drop old auth schema tables if they exist
      'DROP TABLE IF EXISTS verification CASCADE',
      'DROP TABLE IF EXISTS session CASCADE',
      'DROP TABLE IF EXISTS account CASCADE',
      'DROP TABLE IF EXISTS "user" CASCADE',
    ]

    for (const query of dropQueries) {
      try {
        await db.execute({ sql: query })
        logger.info(`✅ Executed: ${query}`)
      } catch (error) {
        // It's OK if table doesn't exist
        logger.debug(`Table not found (OK): ${query}`)
      }
    }

    logger.info('✅ All tables dropped successfully')

    // Now push the schema to recreate all tables
    logger.info('🏗️ Recreating database schema...')

    await pool.end()

    console.log(`
🎯 Database reset complete!
• All tables have been dropped
• Ready for schema recreation

Next steps:
1. Run: pnpm drizzle-kit push
2. Run: pnpm seed-database
    `)
  } catch (error) {
    logger.error('❌ Database reset failed:', error)
    await pool.end()
    throw error
  }
}

async function main() {
  try {
    await resetDatabase()
    process.exit(0)
  } catch (error) {
    logger.error('❌ Script failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { resetDatabase }
