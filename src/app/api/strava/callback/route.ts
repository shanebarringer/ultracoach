import { eq } from 'drizzle-orm'

import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { strava_connections, user } from '@/lib/schema'
import { STRAVA_ENABLED, exchangeCodeForTokens } from '@/lib/strava'

const logger = createLogger('strava-callback-api')

export async function GET(req: NextRequest) {
  try {
    // Check if Strava is enabled
    if (!STRAVA_ENABLED) {
      logger.warn('Strava integration is not configured')
      return redirect('/settings?error=strava_not_configured')
    }

    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      logger.warn('Strava OAuth error:', error)
      return redirect(`/settings?error=strava_${error}`)
    }

    if (!code || !state) {
      logger.error('Missing code or state parameter')
      return redirect('/settings?error=strava_invalid_callback')
    }

    // Decode and verify state parameter
    let stateData
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
    } catch (error) {
      logger.error('Invalid state parameter:', error)
      return redirect('/settings?error=strava_invalid_state')
    }

    const { userId, timestamp } = stateData

    // Verify state is not too old (5 minutes max)
    if (Date.now() - timestamp > 5 * 60 * 1000) {
      logger.error('State parameter expired')
      return redirect('/settings?error=strava_state_expired')
    }

    // Verify user exists
    const existingUser = await db.select().from(user).where(eq(user.id, userId)).limit(1)

    if (existingUser.length === 0) {
      logger.error('User not found for Strava callback:', userId)
      return redirect('/settings?error=strava_user_not_found')
    }

    // Exchange code for tokens
    const tokenData = await exchangeCodeForTokens(code)

    if (!tokenData.access_token || !tokenData.refresh_token) {
      logger.error('Invalid token response from Strava')
      return redirect('/settings?error=strava_token_failed')
    }

    // Check if this Strava athlete is already connected to another user
    const existingConnection = await db
      .select()
      .from(strava_connections)
      .where(eq(strava_connections.strava_athlete_id, tokenData.athlete.id))
      .limit(1)

    if (existingConnection.length > 0 && existingConnection[0].user_id !== userId) {
      logger.warn('Strava athlete already connected to different user:', {
        stravaAthleteId: tokenData.athlete.id,
        existingUserId: existingConnection[0].user_id,
        requestingUserId: userId,
      })
      return redirect('/settings?error=strava_already_connected')
    }

    // Create or update Strava connection
    const connectionData = {
      user_id: userId,
      strava_athlete_id: tokenData.athlete.id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(tokenData.expires_at * 1000),
      scope: tokenData.scope ? tokenData.scope.split(',') : ['read'],
      athlete_data: tokenData.athlete,
      updated_at: new Date(),
    }

    if (existingConnection.length > 0) {
      // Update existing connection
      await db
        .update(strava_connections)
        .set(connectionData)
        .where(eq(strava_connections.id, existingConnection[0].id))

      logger.info('Updated existing Strava connection', {
        userId,
        stravaAthleteId: tokenData.athlete.id,
        athleteName: `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`,
      })
    } else {
      // Create new connection
      await db.insert(strava_connections).values({
        ...connectionData,
        created_at: new Date(),
      })

      logger.info('Created new Strava connection', {
        userId,
        stravaAthleteId: tokenData.athlete.id,
        athleteName: `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`,
      })
    }

    // Redirect to settings with success
    return redirect('/settings?success=strava_connected')
  } catch (error) {
    logger.error('Error processing Strava callback:', error)
    return redirect('/settings?error=strava_callback_failed')
  }
}
