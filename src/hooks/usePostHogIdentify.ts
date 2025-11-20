'use client'

import { useAtomValue, useSetAtom } from 'jotai'
import posthog from 'posthog-js'

import { useCallback, useEffect } from 'react'

import { type AnalyticsEventMap } from '@/lib/analytics/event-types'
import { sessionAtom, userAtom } from '@/lib/atoms'
import {
  type FeatureFlagState,
  clearFeatureFlagsAtom,
  featureFlagFamily,
  featureFlagsErrorAtom,
  featureFlagsLastLoadedAtom,
  featureFlagsLoadingAtom,
  setFeatureFlagsErrorAtom,
  setFeatureFlagsLoadingAtom,
} from '@/lib/atoms/feature-flags'

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
 * Returns a function that can be called to trigger a reload
 *
 * @example
 * const reloadFlags = useReloadFeatureFlags()
 * <button onClick={reloadFlags}>Refresh Flags</button>
 */
export function useReloadFeatureFlags() {
  const setLoading = useSetAtom(setFeatureFlagsLoadingAtom)
  const setError = useSetAtom(setFeatureFlagsErrorAtom)

  return useCallback(() => {
    if (!posthog.has_opted_in_capturing()) {
      return
    }

    setLoading(true)

    try {
      // Reload flags from PostHog
      // The provider's global onFeatureFlags handler will update the atoms when flags finish loading
      posthog.reloadFeatureFlags()

      // Clear loading state after triggering reload
      // Individual flags will be fetched on-demand when components request them
      setLoading(false)
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to reload feature flags'))
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
