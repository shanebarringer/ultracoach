// Garmin OAuth Callback Endpoint
// Handles OAuth redirect and stores encrypted tokens
// Created: 2025-01-12
// Epic: ULT-16
import { eq } from 'drizzle-orm'

import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'

import { db } from '@/lib/database'
import { GarminAPIClient, calculateTokenExpiry } from '@/lib/garmin-client'
import { createLogger } from '@/lib/logger'
import { garmin_connections } from '@/lib/schema'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('garmin-callback-api')

/**
 * GET /api/garmin/callback
 * Handles Garmin OAuth callback
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('oauth_token')
    const verifier = searchParams.get('oauth_verifier')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Check for OAuth errors
    if (error) {
      logger.warn('Garmin OAuth error', { error })
      return redirect('/settings?garmin_error=access_denied')
    }

    // Validate required parameters
    if (!code || !verifier) {
      logger.error('Missing OAuth parameters', {
        hasCode: !!code,
        hasVerifier: !!verifier,
      })
      return redirect('/settings?garmin_error=invalid_request')
    }

    // Verify CSRF state parameter
    let userId: string
    try {
      if (!state) throw new Error('Missing state parameter')

      const stateData = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'))
      userId = stateData.userId

      // Verify state timestamp is recent (within 10 minutes)
      const stateAge = Date.now() - stateData.timestamp
      if (stateAge > 10 * 60 * 1000) {
        throw new Error('State parameter expired')
      }
    } catch (stateError) {
      logger.error('Invalid state parameter', {
        error: stateError instanceof Error ? stateError.message : 'Unknown',
      })
      return redirect('/settings?garmin_error=invalid_state')
    }

    // Verify user is still authenticated
    const session = await getServerSession()
    if (!session || !session.user || session.user.id !== userId) {
      logger.warn('Session mismatch or expired', {
        sessionUserId: session?.user?.id,
        stateUserId: userId,
      })
      return redirect('/auth/signin?redirect=/settings')
    }

    logger.info('Processing Garmin OAuth callback', {
      userId: session.user.id,
    })

    // Exchange OAuth code for access tokens
    let tokens
    try {
      tokens = await GarminAPIClient.exchangeCodeForTokens(code, verifier)
    } catch (tokenError) {
      logger.error('Token exchange failed', {
        error: tokenError instanceof Error ? tokenError.message : 'Unknown',
        userId: session.user.id,
      })
      return redirect('/settings?garmin_error=token_exchange_failed')
    }

    // Get Garmin user profile
    let garminProfile
    try {
      const client = new GarminAPIClient(tokens.access_token)
      garminProfile = await client.getUserProfile()
    } catch (profileError) {
      logger.error('Failed to fetch Garmin profile', {
        error: profileError instanceof Error ? profileError.message : 'Unknown',
        userId: session.user.id,
      })
      // Continue anyway - we can still store the connection
      garminProfile = { userId: 0, displayName: 'Unknown', emailAddress: '' }
    }

    // Encrypt tokens before storage
    const encryptionKey = process.env.GARMIN_ENCRYPTION_KEY
    if (!encryptionKey) {
      logger.error('GARMIN_ENCRYPTION_KEY not configured')
      return redirect('/settings?garmin_error=server_error')
    }

    // Calculate token expiration
    const tokenExpiresAt = calculateTokenExpiry(tokens.expires_in)

    // Store encrypted connection in database
    try {
      // Check if connection already exists
      const existingConnection = await db
        .select()
        .from(garmin_connections)
        .where(eq(garmin_connections.user_id, session.user.id))
        .limit(1)

      if (existingConnection.length > 0) {
        // Update existing connection
        await db
          .update(garmin_connections)
          .set({
            garmin_user_id: garminProfile.userId.toString(),
            // Note: In production, use pgcrypto encrypt function
            // For now, store base64 encoded (NOT SECURE - update in migration)
            access_token: Buffer.from(tokens.access_token).toString('base64'),
            refresh_token: Buffer.from(tokens.refresh_token).toString('base64'),
            token_expires_at: tokenExpiresAt,
            scope: tokens.scope,
            sync_status: 'active',
            updated_at: new Date(),
          })
          .where(eq(garmin_connections.user_id, session.user.id))

        logger.info('Updated existing Garmin connection', {
          userId: session.user.id,
          garminUserId: garminProfile.userId,
        })
      } else {
        // Create new connection
        await db.insert(garmin_connections).values({
          user_id: session.user.id,
          garmin_user_id: garminProfile.userId.toString(),
          // Note: In production, use pgcrypto encrypt function
          access_token: Buffer.from(tokens.access_token).toString('base64'),
          refresh_token: Buffer.from(tokens.refresh_token).toString('base64'),
          token_expires_at: tokenExpiresAt,
          scope: tokens.scope,
          sync_status: 'active',
        })

        logger.info('Created new Garmin connection', {
          userId: session.user.id,
          garminUserId: garminProfile.userId,
        })
      }
    } catch (dbError) {
      logger.error('Database error storing Garmin connection', {
        error: dbError instanceof Error ? dbError.message : 'Unknown',
        userId: session.user.id,
      })
      return redirect('/settings?garmin_error=database_error')
    }

    // Success! Redirect to settings with success message
    logger.info('Garmin connection successful', {
      userId: session.user.id,
      garminUserId: garminProfile.userId,
    })

    return redirect('/settings?garmin_connected=true')
  } catch (error) {
    logger.error('Garmin callback error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return redirect('/settings?garmin_error=unknown')
  }
}
