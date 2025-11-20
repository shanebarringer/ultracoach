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
export function useTypedPostHogEvent(): <K extends keyof AnalyticsEventMap>(
  eventName: K,
  properties: AnalyticsEventMap[K]
) => void {
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
    // The callback receives errorsLoading parameter indicating request failures
    posthog.onFeatureFlags(
      (
        _flags: string[],
        _variants: Record<string, string | boolean>,
        context?: { errorsLoading?: boolean }
      ) => {
        const errorsLoading = context?.errorsLoading
        if (isReloadingFlags) {
          // Handle errors from PostHog flag loading
          if (errorsLoading) {
            setError(new Error('Failed to load feature flags from PostHog'))
            setLoading(false)
            isReloadingFlags = false
            return
          }

          // Flags finished reloading successfully - update atoms with common flags
          const allFlags = new Map<string, boolean | string>()

          // Fetch each common flag (PostHog doesn't provide flag enumeration)
          COMMON_FEATURE_FLAGS.forEach(flagKey => {
            const value = posthog.getFeatureFlag(flagKey)
            if (value !== undefined) {
              allFlags.set(flagKey, value as boolean | string)
            }
          })

          setFlags(allFlags)
          setLoading(false)
          isReloadingFlags = false
        }
      }
    )
  }, [setFlags, setLoading, setError])

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
    setError(null)

    try {
      // Trigger the reload - the module-level listener will handle completion
      // The onFeatureFlags callback will update loading state and flags when done
      posthog.reloadFeatureFlags()

      // Wait for the listener to process the reload (max 5 seconds timeout)
      // The listener will reset isReloadingFlags and setLoading(false) when done
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (isReloadingFlags) {
            isReloadingFlags = false
            setLoading(false)
            reject(new Error('Feature flag reload timed out after 5 seconds'))
          }
        }, 5000)

        // Poll for completion (listener resets isReloadingFlags)
        const checkCompletion = setInterval(() => {
          if (!isReloadingFlags) {
            clearInterval(checkCompletion)
            clearTimeout(timeout)
            resolve()
          }
        }, 100)
      })
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
