#!/usr/bin/env tsx
/**
 * Test Better Auth Configuration and Database Schema
 *
 * This script verifies our Better Auth setup matches what's expected
 */
import { config } from 'dotenv'
import { resolve } from 'path'

import { db } from '../src/lib/database'
import { createLogger } from '../src/lib/logger'

// Load environment
config({ path: resolve(process.cwd(), '.env.local') })

const logger = createLogger('test-better-auth-config')

async function testBetterAuthConfig() {
  try {
    logger.info('🔍 Testing Better Auth configuration and database schema...')

    // Test 1: Check required environment variables
    logger.info('1. Checking environment variables...')
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : 'MISSING',
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET
        ? `[${process.env.BETTER_AUTH_SECRET.length} chars]`
        : 'MISSING',
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'NOT SET',
    }
    logger.info('Environment variables:', envVars)

    // Test 2: Check database tables exist
    logger.info('2. Checking Better Auth tables...')
    const tables = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'better_auth_%'
      ORDER BY table_name;
    `)

    const tableNames = tables.map((t: any) => t.table_name)
    logger.info('Better Auth tables found:', tableNames)

    const expectedTables = [
      'better_auth_accounts',
      'better_auth_sessions',
      'better_auth_users',
      'better_auth_verification_tokens',
    ]
    const missingTables = expectedTables.filter(t => !tableNames.includes(t))

    if (missingTables.length > 0) {
      logger.error('Missing required tables:', missingTables)
      return false
    }

    // Test 3: Check user table schema
    logger.info('3. Checking user table schema...')
    const userColumns = await db.execute(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'better_auth_users' 
      ORDER BY column_name;
    `)

    logger.info(
      'User table columns:',
      userColumns.map((c: any) => `${c.column_name}:${c.data_type}`)
    )

    // Test 4: Check session table has both id and token
    logger.info('4. Checking session table schema...')
    const sessionColumns = await db.execute(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'better_auth_sessions' 
      AND column_name IN ('id', 'token')
      ORDER BY column_name;
    `)

    logger.info(
      'Session table key columns:',
      sessionColumns.map((c: any) => `${c.column_name}:${c.data_type}`)
    )

    const hasIdColumn = sessionColumns.some((c: any) => c.column_name === 'id')
    const hasTokenColumn = sessionColumns.some((c: any) => c.column_name === 'token')

    if (!hasIdColumn || !hasTokenColumn) {
      logger.error('Session table missing required columns:', { hasIdColumn, hasTokenColumn })
      return false
    }

    // Test 5: Check test user credentials
    logger.info('5. Checking test user data...')
    const testUser = await db.execute(`
      SELECT u.id, u.email, u.user_type, u.role, a.provider_id
      FROM better_auth_users u
      LEFT JOIN better_auth_accounts a ON u.id = a.user_id
      WHERE u.email = 'sarah@ultracoach.dev';
    `)

    if (testUser.length === 0) {
      logger.error('Test user sarah@ultracoach.dev not found')
      return false
    }

    logger.info('Test user data:', {
      email: testUser[0].email,
      userType: testUser[0].user_type,
      role: testUser[0].role,
      providerId: testUser[0].provider_id,
    })

    // Test 6: Try importing Better Auth (without initializing)
    logger.info('6. Testing Better Auth import...')
    try {
      const { auth } = await import('../src/lib/better-auth')
      logger.info('✅ Better Auth import successful')

      // Check if we can get the auth instance
      logger.info('Better Auth instance created:', !!auth)

      return true
    } catch (importError) {
      logger.error('❌ Better Auth import failed:', importError)
      return false
    }
  } catch (error) {
    logger.error('❌ Better Auth config test failed:', error)
    return false
  }
}

// Run the test
testBetterAuthConfig()
  .then(success => {
    if (success) {
      logger.info('✅ Better Auth configuration test passed')
      process.exit(0)
    } else {
      logger.error('❌ Better Auth configuration test failed')
      process.exit(1)
    }
  })
  .catch(error => {
    logger.error('❌ Fatal error in Better Auth config test:', error)
    process.exit(1)
  })
