import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { coach_runners } from '@/lib/schema'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('api:test:cleanup')

// Allowed environments for cleanup endpoint
// Note: Vercel preview environments are also allowed via VERCEL_ENV check below
const ALLOWED_ENVIRONMENTS = ['development', 'test']

/**
 * Test cleanup endpoint - only available in development/test environments
 * (including Vercel preview deployments)
 * Clears specified tables to ensure clean test state
 * Requires authentication to prevent abuse
 */
export async function POST(request: NextRequest) {
  // Environment allowlist check (more robust than just checking NODE_ENV)
  const currentEnv = process.env.NODE_ENV || 'development'
  const isAllowedEnv = ALLOWED_ENVIRONMENTS.includes(currentEnv)
  const isVercelPreview = process.env.VERCEL_ENV === 'preview'

  if (!isAllowedEnv && !isVercelPreview) {
    logger.warn('Cleanup endpoint accessed in disallowed environment', {
      nodeEnv: currentEnv,
      vercelEnv: process.env.VERCEL_ENV,
    })
    return NextResponse.json(
      { error: 'This endpoint is not available in this environment' },
      { status: 403 }
    )
  }

  // Authentication check - require valid session
  const session = await getServerSession()
  if (!session?.user) {
    logger.warn('Cleanup endpoint accessed without authentication')
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { table } = body

    if (table === 'coach_runners') {
      logger.info('Clearing coach_runners table for test cleanup')
      await db.delete(coach_runners)
      logger.info('Successfully cleared coach_runners table')

      return NextResponse.json({
        success: true,
        message: 'coach_runners table cleared',
      })
    }

    return NextResponse.json({ error: 'Invalid table specified' }, { status: 400 })
  } catch (error) {
    logger.error('Error during test cleanup:', error)
    return NextResponse.json(
      {
        error: 'Cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
