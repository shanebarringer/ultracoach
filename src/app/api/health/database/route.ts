import { sql } from 'drizzle-orm'

import { NextResponse } from 'next/server'

import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'

const logger = createLogger('api/health/database')

export async function GET() {
  try {
    // Simple keep-alive query that touches the database
    const startTime = Date.now()
    const result = await db.execute(
      sql`SELECT 1 as health_check, current_database(), current_user, now() as timestamp`
    )
    const queryTime = Date.now() - startTime

    // postgres-js returns results directly as an array
    const row = result[0] as {
      health_check: number
      current_database: string
      current_user: string
      timestamp: Date
    }

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        query_time_ms: queryTime,
        current_database: row?.current_database,
        current_user: row?.current_user,
        server_time: row?.timestamp,
      },
    }

    logger.info('Database health check completed', {
      queryTime,
      database: row?.current_database,
    })

    return NextResponse.json(healthData, { status: 200 })
  } catch (error) {
    logger.error('Database health check failed', { error })

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 503 }
    )
  }
}
