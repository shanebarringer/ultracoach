/**
 * PostHog Feature Flags Configuration
 *
 * This file defines the common feature flags that are eagerly loaded
 * when PostHog initializes. Add or remove flags here to control which
 * flags are pre-fetched during application startup.
 *
 * @see src/providers/posthog.tsx - where these flags are loaded
 */

/**
 * List of feature flags to eagerly load during PostHog initialization.
 * These flags will be available immediately without requiring individual fetch calls.
 *
 * Common use cases:
 * - UI feature toggles (e.g., 'new-dashboard', 'beta-features')
 * - A/B test variants (e.g., 'onboarding-flow-variant')
 * - Premium feature gates (e.g., 'premium-features', 'pro-analytics')
 * - Experimental features (e.g., 'beta-access', 'alpha-features')
 *
 * To add a new flag:
 * 1. Create the flag in PostHog dashboard
 * 2. Add the flag key to this array
 * 3. Use `usePostHogFeatureFlag('flag-key')` in your components
 */
export const COMMON_FEATURE_FLAGS: readonly string[] = [
  'new-dashboard',
  'premium-features',
  'beta-access',
  'enhanced-analytics',
] as const

/**
 * Type-safe helper to check if a flag is in the common flags list
 */
export function isCommonFlag(flagKey: string): boolean {
  return (COMMON_FEATURE_FLAGS as readonly string[]).includes(flagKey)
}
