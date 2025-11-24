/**
 * PostHog Server-Side Utilities
 *
 * Provides server-side feature flag checking for Next.js server components and API routes.
 */
import { PostHog } from 'posthog-node'

import * as logger from './logger'

// Initialize PostHog client (singleton pattern)
let posthogClient: PostHog | null = null

function getPostHogClient(): PostHog | null {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    logger.warn('PostHog API key not configured')
    return null
  }

  if (!posthogClient) {
    posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    })
  }

  return posthogClient
}

/**
 * Check if a feature flag is enabled for a user (server-side)
 *
 * @param flagKey - The feature flag key
 * @param userId - The user ID to check the flag for
 * @param defaultValue - Default value if flag check fails
 * @returns Promise<boolean> - Whether the flag is enabled
 */
export async function isFeatureEnabled(
  flagKey: string,
  userId: string,
  defaultValue = false
): Promise<boolean> {
  const client = getPostHogClient()

  if (!client) {
    logger.warn(`PostHog not configured, returning default value for flag: ${flagKey}`)
    return defaultValue
  }

  try {
    const isEnabled = await client.isFeatureEnabled(flagKey, userId)
    return isEnabled ?? defaultValue
  } catch (error) {
    logger.error(`Error checking feature flag ${flagKey}:`, error)
    return defaultValue
  }
}

/**
 * Get feature flag payload (for flags with custom payloads)
 *
 * @param flagKey - The feature flag key
 * @param userId - The user ID
 * @returns Promise<unknown> - The flag payload or null
 */
export async function getFeatureFlagPayload(flagKey: string, userId: string): Promise<unknown> {
  const client = getPostHogClient()

  if (!client) {
    return null
  }

  try {
    const payload = await client.getFeatureFlagPayload(flagKey, userId)
    return payload
  } catch (error) {
    logger.error(`Error getting feature flag payload for ${flagKey}:`, error)
    return null
  }
}

/**
 * Shutdown PostHog client gracefully
 * Call this when shutting down the server
 */
export async function shutdownPostHog(): Promise<void> {
  if (posthogClient) {
    await posthogClient.shutdown()
    posthogClient = null
  }
}
