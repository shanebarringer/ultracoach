import { eq } from 'drizzle-orm'

import { NextResponse } from 'next/server'

import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { strava_connections } from '@/lib/schema'
import { ensureValidToken, getRecentActivities } from '@/lib/strava'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('strava-activities-api')

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Strava connection
    const connection = await db
      .select()
      .from(strava_connections)
      .where(eq(strava_connections.user_id, session.user.id))
      .limit(1)

    if (connection.length === 0) {
      return NextResponse.json({ error: 'No Strava connection found' }, { status: 404 })
    }

    const conn = connection[0]

    logger.info('Strava connection details', {
      userId: session.user.id,
      stravaAthleteId: conn.strava_athlete_id,
      expiresAt: conn.expires_at,
      currentTime: new Date(),
      isExpired: new Date() >= new Date(conn.expires_at),
      scope: conn.scope,
    })

    // Check if connection has required scopes for activities
    if (!conn.scope || !conn.scope.includes('activity:read_all')) {
      logger.error('Insufficient Strava permissions', {
        userId: session.user.id,
        currentScope: conn.scope,
        requiredScope: 'activity:read_all',
      })
      return NextResponse.json(
        {
          error:
            'Insufficient Strava permissions. Please reconnect your Strava account with activity reading permissions.',
          reconnectRequired: true,
        },
        { status: 403 }
      )
    }

    // Ensure token is valid and refresh if needed
    let validToken
    try {
      validToken = await ensureValidToken({
        access_token: conn.access_token,
        refresh_token: conn.refresh_token,
        expires_at: conn.expires_at,
      })
    } catch (error) {
      logger.error('Token refresh failed, reconnection required', {
        userId: session.user.id,
        error: error instanceof Error ? error.message : String(error),
      })
      return NextResponse.json(
        {
          error:
            'Strava token has expired and could not be refreshed. Please reconnect your Strava account.',
          reconnectRequired: true,
        },
        { status: 401 }
      )
    }

    // Update connection if token was refreshed
    if (validToken.access_token !== conn.access_token) {
      await db
        .update(strava_connections)
        .set({
          access_token: validToken.access_token,
          refresh_token: validToken.refresh_token,
          expires_at: validToken.expires_at,
          updated_at: new Date(),
        })
        .where(eq(strava_connections.id, conn.id))

      logger.info('Refreshed Strava access token', {
        userId: session.user.id,
        stravaAthleteId: conn.strava_athlete_id,
      })
    }

    // Fetch recent activities from Strava
    const activities = await getRecentActivities(validToken.access_token, 1, 20)

    logger.info('Retrieved Strava activities', {
      userId: session.user.id,
      activityCount: Array.isArray(activities) ? activities.length : 0,
    })

    return NextResponse.json({
      activities: activities || [],
      connection: {
        athlete_id: conn.strava_athlete_id,
        connected_since: conn.created_at,
        scope: conn.scope,
      },
    })
  } catch (error) {
    logger.error('Error fetching Strava activities:', {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'UnknownError',
    })
    return NextResponse.json({ error: 'Failed to fetch Strava activities' }, { status: 500 })
  }
}
