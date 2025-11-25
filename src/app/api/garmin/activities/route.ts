// Garmin Activities Endpoint
// Fetches recent activities from Garmin Connect
// Created: 2025-01-12
// Epic: ULT-16
import { eq } from 'drizzle-orm'

import { NextResponse } from 'next/server'

import { decrypt, isEncrypted } from '@/lib/crypto'
import { db } from '@/lib/database'
import { GarminAPIClient, isTokenExpired } from '@/lib/garmin-client'
import { createLogger } from '@/lib/logger'
import { garmin_connections } from '@/lib/schema'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('garmin-activities-api')

/**
 * GET /api/garmin/activities?start=0&limit=20
 * Fetches recent activities from Garmin
 */
export async function GET(request: Request) {
  try {
    // Verify user is authenticated
    const session = await getServerSession()
    if (!session || !session.user) {
      logger.warn('Unauthenticated activities request')
      return new Response('Unauthorized', { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const start = parseInt(searchParams.get('start') || '0')
    const limit = parseInt(searchParams.get('limit') || '20')

    logger.info('Fetching Garmin activities', {
      userId: session.user.id,
      start,
      limit,
    })

    // Get Garmin connection
    const connection = await db
      .select()
      .from(garmin_connections)
      .where(eq(garmin_connections.user_id, session.user.id))
      .limit(1)

    if (connection.length === 0) {
      return NextResponse.json({ error: 'No Garmin connection found' }, { status: 404 })
    }

    const conn = connection[0]

    // Check token expiration
    if (isTokenExpired(new Date(conn.token_expires_at))) {
      return NextResponse.json(
        { error: 'Garmin token expired. Please reconnect.' },
        { status: 401 }
      )
    }

    // Decrypt access token (supports both encrypted and legacy base64 format)
    const accessToken = isEncrypted(conn.access_token)
      ? decrypt(conn.access_token)
      : Buffer.from(conn.access_token, 'base64').toString('utf-8')

    // Fetch activities from Garmin
    const garminClient = new GarminAPIClient(accessToken)
    const activities = await garminClient.getActivities(start, limit)

    logger.debug('Activities fetched', {
      userId: session.user.id,
      count: activities.length,
    })

    return NextResponse.json({
      activities,
      start,
      limit,
      hasMore: activities.length === limit,
    })
  } catch (error) {
    logger.error('Activities fetch error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json({ error: 'Failed to fetch Garmin activities' }, { status: 500 })
  }
}
