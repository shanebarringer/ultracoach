#!/usr/bin/env tsx
/**
 * Complete Production Database Reset
 *
 * This script will:
 * 1. Drop all tables (in dependency order)
 * 2. Create fresh Better Auth schema
 * 3. Seed with comprehensive test data
 *
 * Run with: pnpm prod:db:reset
 */
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { createLogger } from '../src/lib/logger'

const logger = createLogger('ResetProductionDatabase')

// Load production environment variables
// Try .env.production first, fallback to .env.local if not found
let envPath = '.env.production'
try {
  config({ path: envPath })
  if (!process.env.DATABASE_URL) {
    throw new Error('No DATABASE_URL in .env.production')
  }
} catch {
  logger.warn('No .env.production found, falling back to .env.local')
  envPath = '.env.local'
  config({ path: envPath })
}

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  logger.error(`DATABASE_URL not found in ${envPath}`)
  logger.info('Please ensure you have the production DATABASE_URL configured')
  logger.info('Expected format: postgres://postgres:[password]@[host]:[port]/postgres')
  process.exit(1)
}

async function resetProductionDatabase() {
  logger.info('🔥 PRODUCTION DATABASE RESET - Starting complete reset...', {
    host: DATABASE_URL.includes('supabase') ? 'supabase' : 'unknown',
    timestamp: new Date().toISOString(),
  })

  // Create database connection
  const sql = postgres(DATABASE_URL, { ssl: 'require' })
  const db = drizzle(sql)

  try {
    // Step 1: Drop all tables in dependency order
    logger.info('📥 Step 1: Dropping all tables...')

    const dropQueries = [
      // Drop dependent tables first
      'DROP TABLE IF EXISTS messages CASCADE;',
      'DROP TABLE IF EXISTS conversations CASCADE;',
      'DROP TABLE IF EXISTS coach_runners CASCADE;',
      'DROP TABLE IF EXISTS workout_completions CASCADE;',
      'DROP TABLE IF EXISTS workouts CASCADE;',
      'DROP TABLE IF EXISTS training_plans CASCADE;',
      'DROP TABLE IF EXISTS plan_phases CASCADE;',
      'DROP TABLE IF EXISTS training_phases CASCADE;',
      'DROP TABLE IF EXISTS plan_templates CASCADE;',
      'DROP TABLE IF EXISTS template_phases CASCADE;',
      'DROP TABLE IF EXISTS races CASCADE;',
      'DROP TABLE IF EXISTS notifications CASCADE;',

      // Drop Better Auth tables (new ones)
      'DROP TABLE IF EXISTS better_auth_sessions CASCADE;',
      'DROP TABLE IF EXISTS better_auth_accounts CASCADE;',
      'DROP TABLE IF EXISTS better_auth_verification_tokens CASCADE;',
      'DROP TABLE IF EXISTS better_auth_users CASCADE;',

      // Drop legacy tables (the pesky old ones!)
      'DROP TABLE IF EXISTS user_settings CASCADE;',
      'DROP TABLE IF EXISTS user_onboarding CASCADE;',
      'DROP TABLE IF EXISTS user_feedback CASCADE;',
      'DROP TABLE IF EXISTS typing_status CASCADE;',
      'DROP TABLE IF EXISTS onboarding_steps CASCADE;',
      'DROP TABLE IF EXISTS message_workout_links CASCADE;',
      'DROP TABLE IF EXISTS session CASCADE;', // Legacy session table
      'DROP TABLE IF EXISTS account CASCADE;', // Legacy account table
      'DROP TABLE IF EXISTS verification CASCADE;', // Legacy verification table
      'DROP TABLE IF EXISTS "user" CASCADE;', // Legacy user table (quoted because reserved keyword)

      // Drop any remaining tables
      'DROP TABLE IF EXISTS schema_migrations CASCADE;',
    ]

    for (const query of dropQueries) {
      try {
        await sql.unsafe(query)
        logger.info(`✅ Executed: ${query}`)
      } catch (error) {
        logger.warn(`⚠️ Warning dropping table: ${error}`)
      }
    }

    logger.info('🏗️ Step 2: Creating fresh Better Auth schema...')

    // Step 2: Create Better Auth tables with correct schema
    const createBetterAuthTables = `
      -- Better Auth Users table
      CREATE TABLE better_auth_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        email_verified BOOLEAN NOT NULL DEFAULT false,
        name TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        role TEXT DEFAULT 'runner',
        full_name TEXT
      );

      -- Better Auth Sessions table (CRITICAL: must have both id and token)
      CREATE TABLE better_auth_sessions (
        id TEXT PRIMARY KEY,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        user_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,
        ip_address TEXT,
        user_agent TEXT,
        token TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Better Auth Accounts table
      CREATE TABLE better_auth_accounts (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES better_auth_users(id) ON DELETE CASCADE,
        access_token TEXT,
        refresh_token TEXT,
        id_token TEXT,
        expires_at TIMESTAMP WITH TIME ZONE,
        password TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider_id, account_id)
      );

      -- Better Auth Verification Tokens table
      CREATE TABLE better_auth_verification_tokens (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Training system tables
      CREATE TABLE races (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        distance_km NUMERIC NOT NULL,
        elevation_gain_m INTEGER,
        terrain TEXT,
        location TEXT,
        website_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE training_phases (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        description TEXT,
        focus_areas TEXT[],
        typical_duration_weeks INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE training_plans (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        title TEXT NOT NULL,
        description TEXT,
        coach_id TEXT REFERENCES better_auth_users(id) ON DELETE CASCADE,
        runner_id TEXT REFERENCES better_auth_users(id) ON DELETE CASCADE,
        target_race_id TEXT REFERENCES races(id) ON DELETE SET NULL,
        goal_type TEXT DEFAULT 'completion',
        goal_time_minutes INTEGER,
        start_date DATE,
        end_date DATE,
        difficulty_level TEXT DEFAULT 'intermediate',
        weekly_hours_target NUMERIC,
        is_template BOOLEAN DEFAULT false,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE workouts (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        training_plan_id TEXT REFERENCES training_plans(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        scheduled_date DATE,
        workout_type TEXT DEFAULT 'easy',
        duration_minutes INTEGER,
        distance_km NUMERIC,
        intensity_level INTEGER CHECK (intensity_level BETWEEN 1 AND 10),
        terrain_type TEXT DEFAULT 'trail',
        elevation_gain_m INTEGER,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE workout_completions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        workout_id TEXT REFERENCES workouts(id) ON DELETE CASCADE,
        runner_id TEXT REFERENCES better_auth_users(id) ON DELETE CASCADE,
        completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        actual_duration_minutes INTEGER,
        actual_distance_km NUMERIC,
        effort_rating INTEGER CHECK (effort_rating BETWEEN 1 AND 10),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(workout_id, runner_id)
      );

      CREATE TABLE coach_runners (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        coach_id TEXT REFERENCES better_auth_users(id) ON DELETE CASCADE,
        runner_id TEXT REFERENCES better_auth_users(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(coach_id, runner_id)
      );

      CREATE TABLE conversations (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        coach_id TEXT REFERENCES better_auth_users(id) ON DELETE CASCADE,
        runner_id TEXT REFERENCES better_auth_users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(coach_id, runner_id)
      );

      CREATE TABLE messages (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id TEXT REFERENCES better_auth_users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE notifications (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT REFERENCES better_auth_users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `

    await sql.unsafe(createBetterAuthTables)
    logger.info('✅ Created all tables with proper schema')

    // Step 3: Seed with test data
    logger.info('🌱 Step 3: Seeding with comprehensive test data...')

    // Coach data (from comprehensive-seed.ts)
    const coaches = [
      {
        name: 'Sarah Mountain',
        fullName: 'Sarah Mountain',
        email: 'sarah@ultracoach.dev',
        password: 'UltraCoach2025!',
      },
      {
        name: 'Marcus Trail',
        fullName: 'Marcus Trail',
        email: 'marcus@ultracoach.dev',
        password: 'UltraCoach2025!',
      },
      {
        name: 'Emma Summit',
        fullName: 'Emma Summit',
        email: 'emma@ultracoach.dev',
        password: 'UltraCoach2025!',
      },
    ]

    // Runner data (from comprehensive-seed.ts)
    const runners = [
      { name: 'Alex Rivera', email: 'alex.rivera@ultracoach.dev' },
      { name: 'Jordan Chen', email: 'jordan.chen@ultracoach.dev' },
      { name: 'Casey Johnson', email: 'casey.johnson@ultracoach.dev' },
      { name: 'Taylor Smith', email: 'taylor.smith@ultracoach.dev' },
      { name: 'Morgan Davis', email: 'morgan.davis@ultracoach.dev' },
      { name: 'Riley Parker', email: 'riley.parker@ultracoach.dev' },
      { name: 'Quinn Wilson', email: 'quinn.wilson@ultracoach.dev' },
      { name: 'Blake Torres', email: 'blake.torres@ultracoach.dev' },
      { name: 'Dakota Lee', email: 'dakota.lee@ultracoach.dev' },
      { name: 'Sage Rodriguez', email: 'sage.rodriguez@ultracoach.dev' },
      { name: 'River Martinez', email: 'river.martinez@ultracoach.dev' },
      { name: 'Phoenix Garcia', email: 'phoenix.garcia@ultracoach.dev' },
      { name: 'Skylar Anderson', email: 'skylar.anderson@ultracoach.dev' },
      { name: 'Avery Thompson', email: 'avery.thompson@ultracoach.dev' },
      { name: 'Cameron White', email: 'cameron.white@ultracoach.dev' },
    ]

    // Create coaches
    const coachIds = []
    for (const coach of coaches) {
      const userId = `${coach.name.replace(/\s+/g, '')}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

      await sql`
        INSERT INTO better_auth_users (id, email, name, role, full_name, email_verified)
        VALUES (${userId}, ${coach.email}, ${coach.name}, 'coach', ${coach.fullName}, true)
      `

      await sql`
        INSERT INTO better_auth_accounts (id, account_id, provider_id, user_id, password)
        VALUES (${userId + '_account'}, ${coach.email}, 'credential', ${userId}, ${coach.password})
      `

      coachIds.push({ id: userId, email: coach.email, name: coach.name })
      logger.info(`✅ Created coach: ${coach.email}`)
    }

    // Create runners
    const runnerIds = []
    for (const runner of runners) {
      const userId = `${runner.name.replace(/\s+/g, '')}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

      await sql`
        INSERT INTO better_auth_users (id, email, name, role, full_name, email_verified)
        VALUES (${userId}, ${runner.email}, ${runner.name}, 'runner', ${runner.name}, true)
      `

      await sql`
        INSERT INTO better_auth_accounts (id, account_id, provider_id, user_id, password)
        VALUES (${userId + '_account'}, ${runner.email}, 'credential', ${userId}, 'RunnerPass2025!')
      `

      runnerIds.push({ id: userId, email: runner.email, name: runner.name })
      logger.info(`✅ Created runner: ${runner.email}`)
    }

    // Create some coach-runner relationships (1 per coach)
    logger.info('🔗 Creating coach-runner relationships...')

    for (let i = 0; i < coachIds.length; i++) {
      const coach = coachIds[i]
      const runner = runnerIds[i * 5] // Each coach gets connected to one runner

      await sql`
        INSERT INTO coach_runners (id, coach_id, runner_id, status, created_at, updated_at)
        VALUES (${`rel_${Date.now()}_${i}`}, ${coach.id}, ${runner.id}, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `

      // Create conversation for this relationship
      await sql`
        INSERT INTO conversations (id, coach_id, runner_id, created_at, updated_at)
        VALUES (${`conv_${Date.now()}_${i}`}, ${coach.id}, ${runner.id}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `

      logger.info(`✅ Created relationship: ${coach.name} ↔ ${runner.name}`)
    }

    // Add some basic relationships, races, and training data
    logger.info('✅ Adding sample training data...')

    await sql`
      INSERT INTO races (name, distance_km, elevation_gain_m, terrain, location) VALUES
      ('Western States 100', 100, 5490, 'trail', 'California, USA'),
      ('Ultra-Trail du Mont-Blanc', 170, 10040, 'trail', 'Chamonix, France'),
      ('Leadville Trail 100', 100, 4570, 'trail', 'Colorado, USA')
    `

    logger.info('🎉 Production database reset completed successfully!')
    logger.info('📝 Summary:')
    logger.info('  - All tables dropped and recreated with correct Better Auth schema')
    logger.info('  - 3 coaches created: Sarah, Marcus, Emma')
    logger.info('  - 15 runners created (same as local development)')
    logger.info('  - 3 active coach-runner relationships established')
    logger.info('  - 3 conversations created for relationships')
    logger.info('  - Sample race data added')
    logger.info('  - Production database now matches local development data')
    logger.info('  - Ready for testing! 🚀')
  } catch (error) {
    logger.error('❌ Error resetting production database:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

// Run the script
resetProductionDatabase().catch(error => {
  console.error('Script failed:', error)
  process.exit(1)
})
