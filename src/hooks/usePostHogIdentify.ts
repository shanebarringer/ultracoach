'use client'

import { useAtomValue } from 'jotai'
import posthog from 'posthog-js'

import { useEffect } from 'react'

import { sessionAtom, userAtom } from '@/lib/atoms'

/**
 * Hook to identify the current user with PostHog
 * Automatically identifies users when they sign in and resets on sign out
 *
 * Usage: Call this hook in a component that's always mounted (like Layout or Dashboard)
 */
export function usePostHogIdentify(): void {
  const session = useAtomValue(sessionAtom)
  const user = useAtomValue(userAtom)

  useEffect(() => {
    if (!session || !user) {
      // User is not authenticated - reset PostHog identity
      if (posthog.has_opted_in_capturing()) {
        posthog.reset()
      }
      return
    }

    // User is authenticated - identify them in PostHog
    if (posthog.has_opted_in_capturing()) {
      posthog.identify(user.id, {
        email: user.email,
        name: user.name || undefined,
        userType: user.userType || 'runner',
        createdAt: user.createdAt,
        // Add any other user properties you want to track
      })

      // Set user properties for analytics
      posthog.people.set({
        email: user.email,
        name: user.name || undefined,
        userType: user.userType || 'runner',
      })
    }
  }, [session, user])
}

/**
 * Hook to track custom events with PostHog
 * Returns a function to capture events
 *
 * @example
 * const trackEvent = usePostHogEvent()
 * trackEvent('workout_completed', { workoutType: 'long_run', distance: 20 })
 */
export function usePostHogEvent(): (
  eventName: string,
  properties?: Record<string, unknown>
) => void {
  return (eventName: string, properties?: Record<string, unknown>) => {
    if (posthog.has_opted_in_capturing()) {
      posthog.capture(eventName, properties)
    }
  }
}

/**
 * Hook to get feature flag values from PostHog
 * Useful for A/B testing and gradual feature rollouts
 *
 * @param flagKey - The feature flag key
 * @returns The flag value (boolean, string, or undefined if not set)
 *
 * @example
 * const useNewDashboard = usePostHogFeatureFlag('new-dashboard-ui')
 * if (useNewDashboard) {
 *   return <NewDashboard />
 * }
 */
export function usePostHogFeatureFlag(flagKey: string): string | boolean | undefined {
  const session = useAtomValue(sessionAtom)

  useEffect(() => {
    // Reload feature flags when session changes
    if (session && posthog.has_opted_in_capturing()) {
      posthog.reloadFeatureFlags()
    }
  }, [session])

  if (!posthog.has_opted_in_capturing()) {
    return undefined
  }

  return posthog.getFeatureFlag(flagKey)
}
