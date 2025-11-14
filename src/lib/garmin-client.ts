// Garmin API Client - Core HTTP wrapper for Garmin Connect API
// Created: 2025-01-12
// Epic: ULT-16

import { createLogger } from './logger'
import type {
  GarminOAuthTokens,
  GarminUserProfile,
  GarminWorkout,
  GarminActivity,
  GarminActivitySummary,
  GarminIntegrationError,
} from '@/types/garmin'

const logger = createLogger('garmin-api-client')

// Garmin API configuration
const GARMIN_API_CONFIG = {
  baseUrl: process.env.GARMIN_API_BASE_URL || 'https://apis.garmin.com',
  oauthUrl: process.env.GARMIN_OAUTH_URL || 'https://connect.garmin.com/oauthConfirm',
  tokenUrl: process.env.GARMIN_TOKEN_URL || 'https://connect.garmin.com/oauth/access_token',
  apiVersion: 'v1',
} as const

/**
 * Garmin API Client
 * Handles all HTTP communication with Garmin Connect API
 */
export class GarminAPIClient {
  private accessToken: string
  private baseUrl: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
    this.baseUrl = GARMIN_API_CONFIG.baseUrl
  }

  /**
   * Make authenticated request to Garmin API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const headers = {
      'Authorization': this.accessToken, // Garmin uses direct token, not Bearer
      'Content-Type': 'application/json',
      ...options.headers,
    }

    logger.debug('Garmin API request', {
      method: options.method || 'GET',
      endpoint,
      hasBody: !!options.body,
    })

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      // Handle non-OK responses
      if (!response.ok) {
        const errorBody = await response.text()
        logger.error('Garmin API error', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody,
          endpoint,
        })

        throw new GarminIntegrationError(
          `Garmin API error: ${response.statusText}`,
          'GARMIN_API_ERROR',
          response.status,
          { endpoint, body: errorBody }
        )
      }

      // Parse JSON response
      const data = await response.json()
      logger.debug('Garmin API response', {
        endpoint,
        success: true,
      })

      return data as T
    } catch (error) {
      if (error instanceof GarminIntegrationError) {
        throw error
      }

      logger.error('Garmin API request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint,
      })

      throw new GarminIntegrationError(
        'Failed to communicate with Garmin API',
        'NETWORK_ERROR',
        undefined,
        { originalError: error, endpoint }
      )
    }
  }

  // ============================================
  // OAuth & Authentication Methods
  // ============================================

  /**
   * Exchange OAuth code for access tokens
   */
  static async exchangeCodeForTokens(
    code: string,
    verifier: string
  ): Promise<GarminOAuthTokens> {
    logger.info('Exchanging OAuth code for tokens')

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      client_id: process.env.GARMIN_CLIENT_ID!,
      client_secret: process.env.GARMIN_CLIENT_SECRET!,
    })

    try {
      const response = await fetch(GARMIN_API_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        logger.error('OAuth token exchange failed', {
          status: response.status,
          body: errorBody,
        })

        throw new GarminIntegrationError(
          'Failed to exchange OAuth code for tokens',
          'OAUTH_TOKEN_EXCHANGE_FAILED',
          response.status,
          { body: errorBody }
        )
      }

      const tokens = await response.json()
      logger.info('OAuth tokens obtained successfully')

      return tokens as GarminOAuthTokens
    } catch (error) {
      logger.error('OAuth token exchange error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Refresh expired access token
   */
  static async refreshAccessToken(refreshToken: string): Promise<GarminOAuthTokens> {
    logger.info('Refreshing access token')

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.GARMIN_CLIENT_ID!,
      client_secret: process.env.GARMIN_CLIENT_SECRET!,
    })

    try {
      const response = await fetch(GARMIN_API_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        logger.error('Token refresh failed', {
          status: response.status,
          body: errorBody,
        })

        throw new GarminIntegrationError(
          'Failed to refresh access token',
          'TOKEN_REFRESH_FAILED',
          response.status,
          { body: errorBody }
        )
      }

      const tokens = await response.json()
      logger.info('Access token refreshed successfully')

      return tokens as GarminOAuthTokens
    } catch (error) {
      logger.error('Token refresh error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Get authenticated user's profile
   */
  async getUserProfile(): Promise<GarminUserProfile> {
    logger.info('Fetching user profile')
    return this.request<GarminUserProfile>('/userprofile-service/userprofile')
  }

  // ============================================
  // Workout Methods (Training API)
  // ============================================

  /**
   * Create a workout in Garmin calendar
   */
  async createWorkout(workout: GarminWorkout): Promise<{ workoutId: number }> {
    logger.info('Creating workout in Garmin calendar', {
      workoutName: workout.workoutName,
    })

    return this.request<{ workoutId: number }>(
      '/workout-service/workout',
      {
        method: 'POST',
        body: JSON.stringify(workout),
      }
    )
  }

  /**
   * Update an existing workout
   */
  async updateWorkout(workoutId: number, workout: GarminWorkout): Promise<void> {
    logger.info('Updating Garmin workout', { workoutId })

    await this.request<void>(
      `/workout-service/workout/${workoutId}`,
      {
        method: 'PUT',
        body: JSON.stringify(workout),
      }
    )
  }

  /**
   * Delete a workout from Garmin calendar
   */
  async deleteWorkout(workoutId: number): Promise<void> {
    logger.info('Deleting Garmin workout', { workoutId })

    await this.request<void>(
      `/workout-service/workout/${workoutId}`,
      {
        method: 'DELETE',
      }
    )
  }

  // ============================================
  // Activity Methods
  // ============================================

  /**
   * Get user's activities with pagination
   */
  async getActivities(
    start: number = 0,
    limit: number = 20
  ): Promise<GarminActivitySummary[]> {
    logger.info('Fetching activities', { start, limit })

    return this.request<GarminActivitySummary[]>(
      `/activitylist-service/activities/search/activities?start=${start}&limit=${limit}`
    )
  }

  /**
   * Get detailed activity by ID
   */
  async getActivity(activityId: number): Promise<GarminActivity> {
    logger.info('Fetching activity details', { activityId })

    return this.request<GarminActivity>(
      `/activity-service/activity/${activityId}`
    )
  }

  /**
   * Get activity GPS data (GPX format)
   */
  async getActivityGPX(activityId: number): Promise<string> {
    logger.info('Fetching activity GPX', { activityId })

    const response = await fetch(
      `${this.baseUrl}/download-service/export/gpx/activity/${activityId}`,
      {
        headers: {
          'Authorization': this.accessToken,
        },
      }
    )

    if (!response.ok) {
      throw new GarminIntegrationError(
        'Failed to download GPX data',
        'GPX_DOWNLOAD_FAILED',
        response.status
      )
    }

    return response.text()
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate OAuth authorization URL
 */
export function getGarminAuthUrl(redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    oauth_callback: redirectUri,
    oauth_consumer_key: process.env.GARMIN_CLIENT_ID!,
  })

  if (state) {
    params.set('state', state)
  }

  const url = `${GARMIN_API_CONFIG.oauthUrl}?${params.toString()}`

  logger.debug('Generated Garmin OAuth URL', {
    redirectUri,
    hasState: !!state,
  })

  return url
}

/**
 * Check if access token is expired
 */
export function isTokenExpired(expiresAt: Date): boolean {
  const now = new Date()
  const bufferMinutes = 5 // Refresh 5 minutes before actual expiration
  const expiryWithBuffer = new Date(expiresAt.getTime() - bufferMinutes * 60 * 1000)

  return now >= expiryWithBuffer
}

/**
 * Calculate token expiration date
 */
export function calculateTokenExpiry(expiresIn: number): Date {
  const now = new Date()
  return new Date(now.getTime() + expiresIn * 1000)
}
