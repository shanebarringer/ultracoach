import { NextRequest, NextResponse } from 'next/server'

import { createLogger } from '@/lib/logger'

const logger = createLogger('debug-auth')

export async function GET(_request: NextRequest) {
  logger.info('🔍 Debug auth endpoint called')

  try {
    // Test 1: Environment variables
    const envTest = {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasBetterAuthSecret: !!process.env.BETTER_AUTH_SECRET,
      hasVercelUrl: !!process.env.VERCEL_URL,
      nodeEnv: process.env.NODE_ENV,
      databaseUrlLength: process.env.DATABASE_URL?.length || 0,
      secretLength: process.env.BETTER_AUTH_SECRET?.length || 0,
    }

    logger.info('Environment test:', envTest)

    // Test 2: Try importing Better Auth
    const betterAuthImport = { success: false, error: null as string | null }
    try {
      await import('better-auth')
      betterAuthImport.success = true
      logger.info('✅ Better Auth import successful')
    } catch (error) {
      betterAuthImport.error = error instanceof Error ? error.message : 'Unknown error'
      logger.error('❌ Better Auth import failed:', error)
    }

    // Test 3: Try importing our schema
    const schemaImport = { success: false, error: null as string | null }
    try {
      await import('@/lib/schema')
      schemaImport.success = true
      logger.info('✅ Schema import successful')
    } catch (error) {
      schemaImport.error = error instanceof Error ? error.message : 'Unknown error'
      logger.error('❌ Schema import failed:', error)
    }

    // Test 4: Try database connection
    const dbTest = { success: false, error: null as string | null }
    try {
      const postgres = (await import('postgres')).default
      const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' })
      await sql`SELECT 1 as test`
      await sql.end()
      dbTest.success = true
      logger.info('✅ Database connection successful')
    } catch (error) {
      dbTest.error = error instanceof Error ? error.message : 'Unknown error'
      logger.error('❌ Database connection failed:', error)
    }

    // Test 5: Try Better Auth initialization
    const authInitTest = { success: false, error: null as string | null }
    try {
      // Only try if previous tests passed
      if (
        envTest.hasDatabaseUrl &&
        envTest.hasBetterAuthSecret &&
        betterAuthImport.success &&
        schemaImport.success
      ) {
        await import('@/lib/better-auth')
        authInitTest.success = true
        logger.info('✅ Better Auth initialization successful')
      } else {
        authInitTest.error = 'Skipped due to previous failures'
      }
    } catch (error) {
      authInitTest.error = error instanceof Error ? error.message : 'Unknown error'
      logger.error('❌ Better Auth initialization failed:', error)
    }

    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: envTest,
      betterAuthImport,
      schemaImport,
      databaseConnection: dbTest,
      betterAuthInit: authInitTest,
    }

    return NextResponse.json({
      success: true,
      diagnostics,
    })
  } catch (error) {
    logger.error('Debug endpoint error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
