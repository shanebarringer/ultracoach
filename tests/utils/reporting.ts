import type { TestInfo } from '@playwright/test'

/**
 * Add a category annotation to the current test. Categories are printed by reporters
 * and help triage whether a failure is in auth, selectors, data, waits, or messaging.
 */
export function label(
  info: TestInfo,
  category:
    | 'auth'
    | 'selectors'
    | 'waits'
    | 'data'
    | 'messaging'
    | 'workouts'
    | 'training-plans'
    | 'calendar'
    | 'relationships'
) {
  info.annotations.push({ type: 'category', description: category })
}
