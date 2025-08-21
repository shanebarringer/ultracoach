import { eq } from 'drizzle-orm'

import { NextResponse } from 'next/server'

import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { strava_activity_syncs, strava_connections } from '@/lib/schema'
import { STRAVA_ENABLED } from '@/lib/strava'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('strava-disconnect-api')

export async function POST() {
  try {
    // Check if Strava is enabled
    if (!STRAVA_ENABLED) {
      return NextResponse.json({ error: 'Strava integration is not configured' }, { status: 503 })
    }

    // Check authentication
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find existing connection
    const connection = await db
      .select({ id: strava_connections.id, access_token: strava_connections.access_token })
      .from(strava_connections)
      .where(eq(strava_connections.user_id, session.user.id))
      .limit(1)

    if (connection.length === 0) {
      return NextResponse.json({ error: 'No Strava connection found' }, { status: 404 })
    }

    const conn = connection[0]

    // Revoke access token with Strava (optional - user can also revoke via Strava)
    try {
      const revokeResponse = await fetch('https://www.strava.com/oauth/deauthorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: conn.access_token,
        }),
      })

      if (revokeResponse.ok) {
        logger.info('Successfully revoked Strava access token')
      } else {
        logger.warn('Failed to revoke Strava access token, but continuing with local cleanup')
      }
    } catch (error) {
      logger.warn('Error revoking Strava access token:', error)
      // Continue with local cleanup even if revocation fails
    }

    // Delete activity syncs first (due to foreign key constraint)
    await db.delete(strava_activity_syncs).where(eq(strava_activity_syncs.connection_id, conn.id))

    // Delete the connection
    await db.delete(strava_connections).where(eq(strava_connections.id, conn.id))

    logger.info('Successfully disconnected Strava account', {
      userId: session.user.id,
      connectionId: conn.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Strava account disconnected successfully',
    })
  } catch (error) {
    logger.error('Error disconnecting Strava account:', error)
    return NextResponse.json({ error: 'Failed to disconnect Strava account' }, { status: 500 })
  }
}
