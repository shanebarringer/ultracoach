#!/usr/bin/env tsx
/**
 * Production Database Reset Script
 *
 * This script:
 * 1. Connects to the production database
 * 2. Drops all existing tables
 * 3. Applies all migrations in order
 * 4. Seeds the database with production-ready data
 *
 * Usage: pnpm tsx scripts/reset-production-database.ts
 */
import { execSync } from 'child_process'
import { config } from 'dotenv'
import { readFileSync, readdirSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'

// Simple console logger for scripts
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
}

// Load production environment variables
config({ path: '.env.production' })

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  logger.error('DATABASE_URL not found in .env.production')
  process.exit(1)
}

logger.info('🔄 Starting production database reset...')

async function resetProductionDatabase() {
  try {
    // Step 1: Drop all tables
    logger.info('💥 Dropping all existing tables...')

    const dropTablesQuery = `
DO $$ DECLARE
  r RECORD;
BEGIN
  -- Drop all tables
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
  
  -- Drop all sequences
  FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequencename) || ' CASCADE';
  END LOOP;
  
  -- Drop all functions
  FOR r IN (SELECT proname FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || ' CASCADE';
  END LOOP;
END $$;
`

    // Write query to temporary file to avoid shell escaping issues
    const tempFile = join(process.cwd(), 'temp-drop-tables.sql')
    writeFileSync(tempFile, dropTablesQuery)

    execSync(`psql "${DATABASE_URL}" -f "${tempFile}"`, { stdio: 'inherit' })

    // Clean up temp file
    unlinkSync(tempFile)

    // Step 2: Apply all migrations
    logger.info('📊 Applying database migrations...')

    const migrationsDir = join(process.cwd(), 'supabase', 'migrations')
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()

    for (const migrationFile of migrationFiles) {
      logger.info(`  Applying: ${migrationFile}`)
      const migrationPath = join(migrationsDir, migrationFile)
      execSync(`psql "${DATABASE_URL}" -f "${migrationPath}"`, { stdio: 'inherit' })
    }

    logger.info('✅ Production database reset completed successfully!')
    logger.info('🌱 Database is now ready for seeding with production data')
  } catch (error) {
    logger.error('❌ Production database reset failed:', error)
    process.exit(1)
  }
}

// Run the reset
resetProductionDatabase()
