/**
 * Feature Flags Atoms - Jotai State Management for PostHog Feature Flags
 *
 * Provides global state management for PostHog feature flags using Jotai.
 * Follows UltraCoach atomic state management patterns for consistency.
 *
 * Benefits:
 * - Global access to flags without prop drilling
 * - Granular re-renders (components only update when their flags change)
 * - Consistent with existing Jotai patterns (sessionAtom, userAtom, etc.)
 * - Easier testing (can mock atoms directly)
 * - Derived atoms for flag combinations
 */
import { atom } from 'jotai'
import { atomFamily } from 'jotai/utils'

import { createLogger } from '@/lib/logger'

const logger = createLogger('FeatureFlagsAtoms')

// ========================================
// Core Feature Flag Atoms
// ========================================

/**
 * Stores all loaded feature flags as a Map
 * Key: flag name, Value: flag value (boolean | string)
 */
export const featureFlagsAtom = atom<Map<string, boolean | string>>(new Map())

/**
 * Tracks whether feature flags are currently loading
 * true: PostHog is fetching flags or waiting for initialization
 * false: Flags have been loaded and are ready
 */
export const featureFlagsLoadingAtom = atom(true)

/**
 * Stores any error that occurred during flag loading
 * null: No error, flags loaded successfully
 * Error: Contains error details for debugging
 */
export const featureFlagsErrorAtom = atom<Error | null>(null)

/**
 * Tracks when flags were last successfully loaded
 * Used for cache invalidation and debugging
 */
export const featureFlagsLastLoadedAtom = atom<Date | null>(null)

// ========================================
// Atom Family for Individual Flags
// ========================================

/**
 * Atom family for accessing individual feature flags
 * Provides granular subscriptions - components only re-render when their specific flag changes
 *
 * This is a pure read-only atom - no side effects. Flags must be populated by:
 * 1. PostHogProvider's onFeatureFlags callback (eager population)
 * 2. fetchFeatureFlagAtom (on-demand fetching)
 *
 * Usage:
 * ```typescript
 * const newDashboard = useAtomValue(featureFlagFamily('new-dashboard'))
 * ```
 */
export const featureFlagFamily = atomFamily((flagKey: string) =>
  atom(get => {
    const flags = get(featureFlagsAtom)
    return flags.get(flagKey)
  })
)

// ========================================
// Write-Only Atoms for Flag Updates
// ========================================

/**
 * Write-only atom to fetch a specific feature flag from PostHog
 * This performs side-effectful PostHog API calls and updates the cache
 *
 * Usage:
 * ```typescript
 * const fetchFlag = useSetAtom(fetchFeatureFlagAtom)
 * fetchFlag('new-dashboard') // Fetches and caches the flag
 * ```
 */
export const fetchFeatureFlagAtom = atom(null, (get, set, flagKey: string) => {
  if (typeof window === 'undefined') {
    logger.warn('Cannot fetch feature flags on server-side', { flagKey })
    return
  }

  try {
    const posthog = (window as typeof window & { posthog?: typeof import('posthog-js').default })
      .posthog

    if (!posthog || !posthog.has_opted_in_capturing()) {
      logger.debug('PostHog not available or opted out, skipping flag fetch', { flagKey })
      return
    }

    // Fetch the flag value from PostHog
    const value = posthog.getFeatureFlag(flagKey)

    if (value !== undefined) {
      // Update the flags Map with the fetched value
      const currentFlags = get(featureFlagsAtom)
      const newFlags = new Map(currentFlags)
      newFlags.set(flagKey, value as boolean | string)
      set(featureFlagsAtom, newFlags)

      logger.debug('Feature flag fetched successfully', { flagKey, value })
    } else {
      logger.debug('Feature flag not found in PostHog', { flagKey })
    }
  } catch (error) {
    logger.error(`Failed to fetch feature flag "${flagKey}"`, {
      error: error instanceof Error ? error.message : String(error),
      flagKey,
    })
    set(
      featureFlagsErrorAtom,
      error instanceof Error ? error : new Error(`Failed to fetch flag: ${flagKey}`)
    )
  }
})

/**
 * Action atom to update all feature flags at once
 * Used by PostHog provider to set flags after loading
 */
export const setFeatureFlagsAtom = atom(null, (get, set, flags: Map<string, boolean | string>) => {
  set(featureFlagsAtom, flags)
  set(featureFlagsLastLoadedAtom, new Date())
  set(featureFlagsLoadingAtom, false)
  set(featureFlagsErrorAtom, null)
})

/**
 * Action atom to set a single feature flag value
 * Used for real-time flag updates or testing
 */
export const updateFeatureFlagAtom = atom(
  null,
  (get, set, update: { flagKey: string; value: boolean | string }) => {
    const currentFlags = get(featureFlagsAtom)
    const newFlags = new Map(currentFlags)
    newFlags.set(update.flagKey, update.value)
    set(featureFlagsAtom, newFlags)
  }
)

/**
 * Action atom to set loading state
 * Used when starting flag fetch
 */
export const setFeatureFlagsLoadingAtom = atom(null, (get, set, loading: boolean) => {
  set(featureFlagsLoadingAtom, loading)
})

/**
 * Action atom to set error state
 * Used when flag loading fails
 */
export const setFeatureFlagsErrorAtom = atom(null, (get, set, error: Error | null) => {
  set(featureFlagsErrorAtom, error)
  set(featureFlagsLoadingAtom, false)
})

/**
 * Action atom to clear all flags and reset state
 * Used on sign out or when resetting analytics
 */
export const clearFeatureFlagsAtom = atom(null, (get, set) => {
  set(featureFlagsAtom, new Map())
  set(featureFlagsLoadingAtom, true)
  set(featureFlagsErrorAtom, null)
  set(featureFlagsLastLoadedAtom, null)
})

// ========================================
// Derived Atoms for Common Flag Combinations
// ========================================

/**
 * Example: Derived atom for premium features
 * Combines multiple flags to determine feature access
 */
export const isPremiumFeaturesEnabledAtom = atom(get => {
  const flags = get(featureFlagsAtom)
  return flags.get('premium-features') === true || flags.get('beta-access') === true
})

/**
 * Example: Derived atom for new UI features
 * Checks if user has access to new dashboard
 */
export const hasNewDashboardAtom = atom(get => {
  const flags = get(featureFlagsAtom)
  return flags.get('new-dashboard') === true
})

// ========================================
// Helper Types
// ========================================

/**
 * Type for feature flag state returned by hooks
 */
export interface FeatureFlagState {
  value: boolean | string | undefined
  loading: boolean
  error: Error | null
  lastLoaded: Date | null
}

/**
 * Type for bulk flag updates
 */
export type FeatureFlagsUpdate = Map<string, boolean | string>
