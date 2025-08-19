import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'

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
      return NextResponse.json(
        { error: 'No Strava connection found' },
        { status: 404 }
      )
    }

    const conn = connection[0]
    
    // Ensure token is valid and refresh if needed
    const validToken = await ensureValidToken({
      access_token: conn.access_token,
      refresh_token: conn.refresh_token,
      expires_at: conn.expires_at,
    })

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
    logger.error('Error fetching Strava activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Strava activities' },
      { status: 500 }
    )
  }
}