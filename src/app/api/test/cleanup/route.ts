import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { coach_runners } from '@/lib/schema'

const logger = createLogger('api:test:cleanup')

/**
 * Test cleanup endpoint - only available in development/test environments
 * Clears specified tables to ensure clean test state
 */
export async function POST(request: NextRequest) {
  // Only allow in development and test environments
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is not available in production' },
      { status: 403 }
    )
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
        message: 'coach_runners table cleared'
      })
    }

    return NextResponse.json(
      { error: 'Invalid table specified' },
      { status: 400 }
    )
  } catch (error) {
    logger.error('Error during test cleanup:', error)
    return NextResponse.json(
      { error: 'Cleanup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
