'use client'

import { useAtomValue, useSetAtom } from 'jotai'
import posthog from 'posthog-js'

import React, { useCallback, useEffect } from 'react'

import { COMMON_FEATURE_FLAGS } from '@/config/posthog-flags'
import { type AnalyticsEventMap } from '@/lib/analytics/event-types'
import { sessionAtom, userAtom } from '@/lib/atoms'
import {
  type FeatureFlagState,
  clearFeatureFlagsAtom,
  featureFlagFamily,
  featureFlagsErrorAtom,
  featureFlagsLastLoadedAtom,
  featureFlagsLoadingAtom,
  setFeatureFlagsAtom,
  setFeatureFlagsErrorAtom,
  setFeatureFlagsLoadingAtom,
} from '@/lib/atoms/feature-flags'

// Module-level flags to prevent concurrent reload operations and listener accumulation
let isReloadingFlags = false
let hasRegisteredReloadListener = false

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
 * Hook to track custom events with PostHog (basic, untyped version)
 * For type-safe events, use useTypedPostHogEvent instead
 *
 * @deprecated Use useTypedPostHogEvent for type safety
 * @example
 * const trackEvent = usePostHogEvent()
 * trackEvent('workout_completed', { workoutType: 'long_run', distance: 20 })
 */
export function usePostHogEvent(): (
  eventName: string,
  properties?: Record<string, unknown>
) => void {
  return useCallback((eventName: string, properties?: Record<string, unknown>) => {
    if (posthog.has_opted_in_capturing()) {
      posthog.capture(eventName, properties)
    }
  }, [])
}

/**
 * Hook to track type-safe events with PostHog
 * Provides compile-time validation and IntelliSense for event names and properties
 *
 * @example
 * const trackEvent = useTypedPostHogEvent()
 * trackEvent('workout_logged', {
 *   workoutId: '123',
 *   status: 'completed', // Autocomplete works!
 *   distance: 10
 * })
 */
export function useTypedPostHogEvent() {
  return useCallback(
    <K extends keyof AnalyticsEventMap>(eventName: K, properties: AnalyticsEventMap[K]): void => {
      if (posthog.has_opted_in_capturing()) {
        posthog.capture(eventName, properties as unknown as Record<string, unknown>)
      }
    },
    []
  )
}

// ========================================
// Jotai-Based Feature Flag Hooks
// ========================================

/**
 * Hook to get a feature flag value with loading and error state (Jotai-based)
 * Uses global Jotai atoms for state management
 *
 * @param flagKey - The feature flag key
 * @returns Object with { value, loading, error, lastLoaded }
 *
 * @example
 * const { value: newDashboard, loading } = useFeatureFlag('new-dashboard')
 * if (loading) return <Skeleton />
 * if (newDashboard) return <NewDashboard />
 * return <OldDashboard />
 */
export function useFeatureFlag(flagKey: string): FeatureFlagState {
  const value = useAtomValue(featureFlagFamily(flagKey))
  const loading = useAtomValue(featureFlagsLoadingAtom)
  const error = useAtomValue(featureFlagsErrorAtom)
  const lastLoaded = useAtomValue(featureFlagsLastLoadedAtom)

  return { value, loading, error, lastLoaded }
}

/**
 * Hook to get just the feature flag value (simplified version)
 * Use this when you don't need loading/error states
 *
 * @param flagKey - The feature flag key
 * @returns The flag value (boolean, string, or undefined)
 *
 * @example
 * const newDashboard = useFeatureFlagValue('new-dashboard')
 * if (newDashboard) return <NewDashboard />
 */
export function useFeatureFlagValue(flagKey: string): boolean | string | undefined {
  return useAtomValue(featureFlagFamily(flagKey))
}

/**
 * Hook to reload feature flags from PostHog
 * Returns a Promise-based function that can be awaited
 *
 * The listener is registered once at module level (similar to posthog.tsx pattern)
 * and updates Jotai atoms directly, preventing memory leaks from multiple listeners.
 *
 * @example
 * const reloadFlags = useReloadFeatureFlags()
 * await reloadFlags() // Waits for flags to finish loading
 * // or
 * <button onClick={reloadFlags}>Refresh Flags</button>
 */
export function useReloadFeatureFlags() {
  const setLoading = useSetAtom(setFeatureFlagsLoadingAtom)
  const setError = useSetAtom(setFeatureFlagsErrorAtom)
  const setFlags = useSetAtom(setFeatureFlagsAtom)

  // Register the listener once at module level to prevent accumulation
  // This follows the same pattern as posthog.tsx for consistency
  React.useEffect(() => {
    if (hasRegisteredReloadListener || typeof window === 'undefined') {
      return
    }

    hasRegisteredReloadListener = true

    // Module-level listener that updates atoms when flags change
    posthog.onFeatureFlags(() => {
      if (isReloadingFlags) {
        // Flags finished reloading - update atoms with common flags
        const allFlags = new Map<string, boolean | string>()

        // Fetch each common flag (PostHog doesn't provide flag enumeration)
        COMMON_FEATURE_FLAGS.forEach(flagKey => {
          const value = posthog.getFeatureFlag(flagKey)
          if (value !== undefined) {
            allFlags.set(flagKey, value as boolean | string)
          }
        })

        setFlags(allFlags)
        isReloadingFlags = false
      }
    })
  }, [setFlags])

  return useCallback(async (): Promise<void> => {
    if (!posthog.has_opted_in_capturing()) {
      return
    }

    // Prevent concurrent reloads
    if (isReloadingFlags) {
      return
    }

    isReloadingFlags = true
    setLoading(true)

    try {
      // Trigger the reload - the module-level listener will handle completion
      posthog.reloadFeatureFlags()

      // Wait a short time for flags to reload (PostHog usually responds quickly)
      await new Promise(resolve => setTimeout(resolve, 1000))

      setLoading(false)
      setError(null)
    } catch (error) {
      isReloadingFlags = false
      setLoading(false)
      const errorObj = error instanceof Error ? error : new Error('Failed to reload feature flags')
      setError(errorObj)
      throw errorObj
    }
  }, [setLoading, setError])
}

/**
 * Hook to clear all feature flags (e.g., on sign out)
 * Returns a function that clears flags and resets state
 *
 * @example
 * const clearFlags = useClearFeatureFlags()
 * <button onClick={clearFlags}>Sign Out</button>
 */
export function useClearFeatureFlags() {
  const clearFlags = useSetAtom(clearFeatureFlagsAtom)

  return useCallback(() => {
    clearFlags()
    if (posthog.has_opted_in_capturing()) {
      posthog.reset()
    }
  }, [clearFlags])
}

/**
 * Legacy hook for backward compatibility
 * @deprecated Use useFeatureFlag or useFeatureFlagValue instead
 */
export function usePostHogFeatureFlag(flagKey: string): string | boolean | undefined {
  const { value } = useFeatureFlag(flagKey)
  return value
}
