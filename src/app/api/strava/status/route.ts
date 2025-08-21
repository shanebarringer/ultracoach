import { eq } from 'drizzle-orm'

import { NextResponse } from 'next/server'

import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { strava_connections } from '@/lib/schema'
import { STRAVA_ENABLED } from '@/lib/strava'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('strava-status-api')

export async function GET() {
  try {
    // Check if Strava is enabled
    if (!STRAVA_ENABLED) {
      return NextResponse.json({
        connected: false,
        enabled: false,
        error: 'Strava integration is not configured',
      })
    }

    // Check authentication
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check for existing Strava connection
    const connection = await db
      .select({
        id: strava_connections.id,
        strava_athlete_id: strava_connections.strava_athlete_id,
        expires_at: strava_connections.expires_at,
        scope: strava_connections.scope,
        athlete_data: strava_connections.athlete_data,
        created_at: strava_connections.created_at,
      })
      .from(strava_connections)
      .where(eq(strava_connections.user_id, session.user.id))
      .limit(1)

    if (connection.length === 0) {
      return NextResponse.json({
        connected: false,
        enabled: true,
      })
    }

    const conn = connection[0]
    const now = new Date()
    const expiresAt = new Date(conn.expires_at)
    const isExpired = expiresAt.getTime() <= now.getTime()

    // Extract athlete info safely
    const athleteData = conn.athlete_data as Record<string, unknown>
    const athleteInfo = {
      id: conn.strava_athlete_id,
      name: athleteData
        ? `${athleteData.firstname || ''} ${athleteData.lastname || ''}`.trim()
        : 'Unknown',
      username: athleteData?.username || null,
      profile: athleteData?.profile_medium || athleteData?.profile || null,
    }

    logger.info('Retrieved Strava connection status', {
      userId: session.user.id,
      stravaAthleteId: conn.strava_athlete_id,
      isExpired,
      scope: conn.scope,
    })

    return NextResponse.json({
      connected: true,
      enabled: true,
      athlete: athleteInfo,
      scope: conn.scope,
      expires_at: conn.expires_at,
      is_expired: isExpired,
      connected_since: conn.created_at,
    })
  } catch (error) {
    logger.error('Error checking Strava status:', error)
    return NextResponse.json({ error: 'Failed to check Strava connection status' }, { status: 500 })
  }
}
