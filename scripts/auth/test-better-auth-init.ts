#!/usr/bin/env tsx
/**
 * Test Better Auth Initialization
 *
 * This script tests Better Auth initialization step-by-step
 * to isolate exactly where it's failing.
 */
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { config } from 'dotenv'
import postgres from 'postgres'

import { createLogger } from '../src/lib/logger'
import { account, session, user, verification } from '../src/lib/schema'

// Load production environment
config({ path: '.env.production' })

const logger = createLogger('TestBetterAuthInit')

async function testBetterAuthInit() {
  logger.info('🧪 Testing Better Auth initialization steps...')

  const DATABASE_URL = process.env.DATABASE_URL
  if (!DATABASE_URL) {
    logger.error('DATABASE_URL not found')
    return false
  }

  logger.info('✅ DATABASE_URL loaded')

  // Test 1: Database connection
  let db: ReturnType<typeof postgres>
  try {
    logger.info('📡 Step 1: Testing database connection...')
    db = postgres(DATABASE_URL, { ssl: 'require' })

    // Simple query to test connection
    const result = await db`SELECT NOW() as current_time`
    logger.info('✅ Database connection successful:', { time: result[0].current_time })
  } catch (error) {
    logger.error('❌ Database connection failed:', error)
    return false
  }

  // Test 2: Schema table verification
  try {
    logger.info('🗄️ Step 2: Verifying schema tables exist...')

    const tables = await db`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('better_auth_users', 'better_auth_sessions', 'better_auth_accounts', 'better_auth_verification_tokens')
      ORDER BY table_name
    `

    const tableNames = tables.map(t => t.table_name)
    logger.info('✅ Schema tables verified:', { tables: tableNames })

    if (tableNames.length !== 4) {
      logger.error('❌ Missing required Better Auth tables')
      return false
    }
  } catch (error) {
    logger.error('❌ Schema verification failed:', error)
    return false
  }

  // Test 3: Drizzle adapter creation
  try {
    logger.info('⚙️ Step 3: Testing Drizzle adapter creation...')

    const adapter = drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: user,
        account: account,
        session: session,
        verification: verification,
      },
    })

    logger.info('✅ Drizzle adapter created successfully')

    // Check schema table structure
    logger.info('Schema table structures:', {
      user: typeof user,
      session: typeof session,
      account: typeof account,
      verification: typeof verification,
      userMeta: user.$inferSelect ? 'has $inferSelect' : 'missing $inferSelect',
      sessionMeta: session.$inferSelect ? 'has $inferSelect' : 'missing $inferSelect',
    })
  } catch (error) {
    logger.error('❌ Drizzle adapter creation failed:', error)
    return false
  }

  // Test 4: Better Auth secret validation
  try {
    logger.info('🔐 Step 4: Testing Better Auth secret...')

    const secret = process.env.BETTER_AUTH_SECRET
    if (!secret) {
      logger.error('❌ BETTER_AUTH_SECRET missing')
      return false
    }

    if (secret.length < 32) {
      logger.error('❌ BETTER_AUTH_SECRET too short')
      return false
    }

    logger.info('✅ Better Auth secret validated:', {
      length: secret.length,
      isHex: /^[0-9a-fA-F]+$/.test(secret),
    })
  } catch (error) {
    logger.error('❌ Secret validation failed:', error)
    return false
  }

  // Test 5: Full Better Auth initialization (the real test)
  try {
    logger.info('🚀 Step 5: Testing full Better Auth initialization...')

    // Import here to avoid circular dependencies
    const { betterAuth } = await import('better-auth')

    const baseURL = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/auth`
      : 'https://ultracoach.vercel.app/api/auth'

    logger.info('Using baseURL:', baseURL)

    const auth = betterAuth({
      database: drizzleAdapter(db, {
        provider: 'pg',
        schema: {
          user: user,
          account: account,
          session: session,
          verification: verification,
        },
      }),
      baseURL,
      secret: process.env.BETTER_AUTH_SECRET!,
      trustedOrigins: ['https://ultracoach.vercel.app'],
    })

    logger.info('✅ Better Auth initialization successful!')
    return true
  } catch (error) {
    logger.error('❌ Better Auth initialization failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : undefined,
    })
    return false
  } finally {
    if (db) {
      await db.end()
    }
  }
}

// Run the test
testBetterAuthInit()
  .then(success => {
    if (success) {
      logger.info('🎉 All Better Auth initialization tests passed!')
      process.exit(0)
    } else {
      logger.error('💥 Better Auth initialization tests failed')
      process.exit(1)
    }
  })
  .catch(error => {
    logger.error('🚨 Test script error:', error)
    process.exit(1)
  })
