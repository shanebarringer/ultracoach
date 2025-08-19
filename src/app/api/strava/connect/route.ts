import { NextRequest, NextResponse } from 'next/server'

import { createLogger } from '@/lib/logger'
import { STRAVA_ENABLED, getStravaAuthUrl } from '@/lib/strava'
import { getServerSession } from '@/utils/auth-server'

const logger = createLogger('strava-connect-api')

export async function GET(_req: NextRequest) {
  try {
    // Check if Strava is enabled
    if (!STRAVA_ENABLED) {
      logger.warn('Strava integration is not configured')
      return NextResponse.json({ error: 'Strava integration is not available' }, { status: 503 })
    }

    // Check authentication
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate state parameter with user ID for security
    const state = Buffer.from(
      JSON.stringify({
        userId: session.user.id,
        timestamp: Date.now(),
      })
    ).toString('base64url')

    // Get Strava authorization URL
    const authUrl = getStravaAuthUrl(state)

    logger.info('Generated Strava auth URL', {
      userId: session.user.id,
      userEmail: session.user.email,
    })

    return NextResponse.json({ authUrl, state })
  } catch (error) {
    logger.error('Error generating Strava auth URL:', error)
    return NextResponse.json({ error: 'Failed to generate authentication URL' }, { status: 500 })
  }
}
