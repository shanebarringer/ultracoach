import { NextResponse } from 'next/server'

import { createLogger } from '@/lib/logger'

const logger = createLogger('api/health')

export async function GET() {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      checks: {
        server: 'healthy',
        // Add more checks as needed (auth, external services, etc.)
      },
    }

    logger.info('Health check completed', {
      status: 'healthy',
      uptime: healthData.uptime,
    })

    return NextResponse.json(healthData, { status: 200 })
  } catch (error) {
    logger.error('Health check failed', { error })

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}
