// Garmin OAuth Connect Endpoint
// Initiates OAuth flow to connect Garmin account
// Created: 2025-01-12
// Epic: ULT-16
import { NextResponse } from 'next/server'

import { getGarminAuthUrl } from '@/lib/garmin-client'
import { createLogger } from '@/lib/logger'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('garmin-connect-api')

/**
 * GET /api/garmin/connect
 * Initiates Garmin OAuth flow
 */
export async function GET(_request: Request) {
  try {
    // Verify user is authenticated
    const session = await getServerSession()
    if (!session || !session.user) {
      logger.warn('Unauthenticated Garmin connect attempt')
      return new Response('Unauthorized', { status: 401 })
    }

    logger.info('Initiating Garmin OAuth flow', {
      userId: session.user.id,
      userEmail: session.user.email,
    })

    // Get redirect URI from environment
    const redirectUri = process.env.GARMIN_REDIRECT_URI
    if (!redirectUri) {
      logger.error('GARMIN_REDIRECT_URI not configured')
      return NextResponse.json({ error: 'Garmin OAuth not properly configured' }, { status: 500 })
    }

    // Generate state parameter for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        userId: session.user.id,
        timestamp: Date.now(),
      })
    ).toString('base64url')

    // Generate Garmin OAuth URL
    const authUrl = getGarminAuthUrl(redirectUri, state)

    logger.debug('Redirecting to Garmin OAuth', {
      userId: session.user.id,
      redirectUri,
      hasState: true,
    })

    // Redirect to Garmin authorization page
    return NextResponse.redirect(authUrl)
  } catch (error) {
    logger.error('Garmin connect error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json({ error: 'Failed to initiate Garmin connection' }, { status: 500 })
  }
}
