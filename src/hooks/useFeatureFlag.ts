/**
 * Feature Flag Hook
 *
 * Client-side hook for checking PostHog feature flags in React components.
 */
import { useFeatureFlagEnabled, usePostHog } from 'posthog-js/react'

/**
 * Check if a feature flag is enabled (client-side)
 *
 * @param flagKey - The feature flag key
 * @param defaultValue - Default value while loading or if check fails
 * @returns boolean - Whether the flag is enabled
 *
 * @example
 * ```tsx
 * const isSettingsEnabled = useFeatureFlag('settings-functionality', false)
 *
 * if (!isSettingsEnabled) {
 *   return <div>Settings feature is not available yet</div>
 * }
 * ```
 */
export function useFeatureFlag(flagKey: string, defaultValue = false): boolean {
  const flagEnabled = useFeatureFlagEnabled(flagKey)

  // Return default value if flag is undefined (loading or error)
  if (flagEnabled === undefined) {
    return defaultValue
  }

  return flagEnabled
}

/**
 * Get feature flag payload (for flags with custom payloads)
 *
 * @param flagKey - The feature flag key
 * @returns unknown - The flag payload or undefined
 */
export function useFeatureFlagPayload(flagKey: string): unknown {
  const posthog = usePostHog()
  return posthog?.getFeatureFlagPayload(flagKey)
}

/**
 * Hook to capture custom events in PostHog
 *
 * @returns Function to capture events
 *
 * @example
 * ```tsx
 * const captureEvent = usePostHogCapture()
 * captureEvent('settings_saved', { section: 'notifications' })
 * ```
 */
export function usePostHogCapture() {
  const posthog = usePostHog()

  return (eventName: string, properties?: Record<string, unknown>) => {
    if (posthog) {
      posthog.capture(eventName, properties)
    }
  }
}
