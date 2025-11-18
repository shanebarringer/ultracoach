import { PostHog } from 'posthog-node'

let posthogServerInstance: PostHog | null = null

/**
 * Get PostHog server-side client instance
 * Used for server-side event tracking and feature flags
 */
export function getPostHogServer(): PostHog | null {
  // Return null if no API key configured
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return null
  }

  // Create singleton instance
  if (!posthogServerInstance) {
    posthogServerInstance = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      // Disable in development
      disabled: process.env.NODE_ENV === 'development',
    })
  }

  return posthogServerInstance
}

/**
 * Identify a user on the server-side
 * @param userId - The user's unique identifier
 * @param properties - Additional user properties
 */
export async function identifyUser(userId: string, properties?: Record<string, unknown>) {
  const posthog = getPostHogServer()
  if (!posthog) return

  posthog.identify({
    distinctId: userId,
    properties,
  })
}

/**
 * Track a server-side event
 * @param userId - The user's unique identifier
 * @param event - Event name
 * @param properties - Event properties
 */
export async function trackServerEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  const posthog = getPostHogServer()
  if (!posthog) return

  posthog.capture({
    distinctId: userId,
    event,
    properties,
  })
}

/**
 * Shutdown PostHog client gracefully
 * Call this when your app is shutting down
 */
export async function shutdownPostHog() {
  if (posthogServerInstance) {
    await posthogServerInstance.shutdown()
    posthogServerInstance = null
  }
}
