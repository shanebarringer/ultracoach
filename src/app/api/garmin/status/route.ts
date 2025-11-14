// Garmin Connection Status Endpoint
// Returns current Garmin connection status
// Created: 2025-01-12
// Epic: ULT-16

import { NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { garmin_connections } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { getServerSession } from '@/utils/auth-server'
import { createLogger } from '@/lib/logger'
import { isTokenExpired } from '@/lib/garmin-client'

const logger = createLogger('garmin-status-api')

/**
 * GET /api/garmin/status
 * Returns Garmin connection status for authenticated user
 */
export async function GET(request: Request) {
  try {
    // Verify user is authenticated
    const session = await getServerSession()
    if (!session || !session.user) {
      logger.warn('Unauthenticated Garmin status check')
      return new Response('Unauthorized', { status: 401 })
    }

    // Fetch Garmin connection from database
    const connection = await db
      .select({
        id: garmin_connections.id,
        garmin_user_id: garmin_connections.garmin_user_id,
        token_expires_at: garmin_connections.token_expires_at,
        sync_status: garmin_connections.sync_status,
        last_sync_at: garmin_connections.last_sync_at,
        created_at: garmin_connections.created_at,
      })
      .from(garmin_connections)
      .where(eq(garmin_connections.user_id, session.user.id))
      .limit(1)

    // No connection found
    if (connection.length === 0) {
      return NextResponse.json({
        connected: false,
        garminUserId: null,
        lastSync: null,
        tokenExpired: null,
        syncStatus: null,
      })
    }

    const conn = connection[0]

    // Check if token is expired
    const tokenExpired = isTokenExpired(new Date(conn.token_expires_at))

    logger.debug('Garmin connection status', {
      userId: session.user.id,
      connected: true,
      tokenExpired,
      syncStatus: conn.sync_status,
    })

    return NextResponse.json({
      connected: true,
      garminUserId: conn.garmin_user_id,
      lastSync: conn.last_sync_at,
      tokenExpired,
      syncStatus: conn.sync_status,
      connectedAt: conn.created_at,
    })
  } catch (error) {
    logger.error('Garmin status check error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      { error: 'Failed to check Garmin connection status' },
      { status: 500 }
    )
  }
}
