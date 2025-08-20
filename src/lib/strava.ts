import strava from 'strava-v3'

import { createLogger } from './logger'

const logger = createLogger('strava')

// Strava OAuth configuration
export const STRAVA_CONFIG = {
  CLIENT_ID: process.env.STRAVA_CLIENT_ID!,
  CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET!,
  REDIRECT_URI:
    process.env.STRAVA_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/strava/callback`,
  SCOPE: 'read,activity:read_all,profile:read_all',
  WEBHOOK_VERIFY_TOKEN: process.env.STRAVA_WEBHOOK_VERIFY_TOKEN,
} as const

// Validate required environment variables
function validateStravaConfig() {
  const missing = []
  if (!STRAVA_CONFIG.CLIENT_ID) missing.push('STRAVA_CLIENT_ID')
  if (!STRAVA_CONFIG.CLIENT_SECRET) missing.push('STRAVA_CLIENT_SECRET')

  if (missing.length > 0) {
    logger.warn(`Missing Strava environment variables: ${missing.join(', ')}`)
    logger.info('Strava integration will be disabled until credentials are provided')
    return false
  }

  return true
}

export const STRAVA_ENABLED = validateStravaConfig()

/**
 * Initialize Strava API client with access token
 */
export function createStravaClient(accessToken: string) {
  if (!STRAVA_ENABLED) {
    throw new Error('Strava integration is not configured')
  }

  strava.config({
    access_token: accessToken,
    client_id: STRAVA_CONFIG.CLIENT_ID,
    client_secret: STRAVA_CONFIG.CLIENT_SECRET,
    redirect_uri: STRAVA_CONFIG.REDIRECT_URI,
  })

  return strava
}

/**
 * Generate Strava OAuth authorization URL
 */
export function getStravaAuthUrl(state?: string) {
  if (!STRAVA_ENABLED) {
    throw new Error('Strava integration is not configured')
  }

  const params = new URLSearchParams({
    client_id: STRAVA_CONFIG.CLIENT_ID,
    response_type: 'code',
    redirect_uri: STRAVA_CONFIG.REDIRECT_URI,
    approval_prompt: 'force',
    scope: STRAVA_CONFIG.SCOPE,
  })

  if (state) {
    params.append('state', state)
  }

  return `https://www.strava.com/oauth/authorize?${params.toString()}`
}

/**
 * Exchange authorization code for access tokens
 */
export async function exchangeCodeForTokens(code: string) {
  if (!STRAVA_ENABLED) {
    throw new Error('Strava integration is not configured')
  }

  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: STRAVA_CONFIG.CLIENT_ID,
        client_secret: STRAVA_CONFIG.CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    })

    if (!response.ok) {
      throw new Error(`Strava token exchange failed: ${response.statusText}`)
    }

    const tokens = await response.json()
    logger.info('Successfully exchanged code for Strava tokens', {
      athlete_id: tokens.athlete?.id,
      scope: tokens.scope,
    })

    return tokens
  } catch (error) {
    logger.error('Error exchanging code for tokens:', {
      message: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Refresh expired access token
 */
export async function refreshAccessToken(refreshToken: string) {
  if (!STRAVA_ENABLED) {
    throw new Error('Strava integration is not configured')
  }

  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: STRAVA_CONFIG.CLIENT_ID,
        client_secret: STRAVA_CONFIG.CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      throw new Error(`Strava token refresh failed: ${response.statusText}`)
    }

    const tokens = await response.json()
    logger.info('Successfully refreshed Strava access token')

    return tokens
  } catch (error) {
    logger.error('Error refreshing access token:', {
      message: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Check if access token is expired and refresh if needed
 */
export async function ensureValidToken(connection: {
  access_token: string
  refresh_token: string
  expires_at: Date
}) {
  const now = new Date()
  const expiresAt = new Date(connection.expires_at)

  // Refresh if token expires within 5 minutes
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    logger.info('Access token is expiring soon, refreshing...')
    const newTokens = await refreshAccessToken(connection.refresh_token)

    return {
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token,
      expires_at: new Date(newTokens.expires_at * 1000),
    }
  }

  return connection
}

/**
 * Fetch athlete's recent activities from Strava
 */
export async function getRecentActivities(accessToken: string, page = 1, perPage = 30) {
  try {
    // Use direct API call instead of strava-v3 library (which has token issues)
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Strava API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const activities = await response.json()

    logger.info(
      `Fetched ${Array.isArray(activities) ? activities.length : 0} activities from Strava using direct API`
    )
    return activities
  } catch (error) {
    logger.error('Error fetching activities from Strava:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    throw error
  }
}

/**
 * Get detailed activity information
 */
export async function getActivityById(accessToken: string, activityId: number) {
  try {
    // Use direct API call instead of strava-v3 library (which has token issues)
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}?include_all_efforts=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Strava API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const activity = await response.json()

    logger.info(`Fetched detailed activity ${activityId} from Strava using direct API`)
    return activity
  } catch (error) {
    logger.error(`Error fetching activity ${activityId} from Strava:`, {
      message: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
