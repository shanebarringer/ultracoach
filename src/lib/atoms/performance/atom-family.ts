/**
 * AtomFamily patterns for efficient dynamic atoms with proper cleanup
 *
 * This module provides atomFamily patterns that create atoms on-demand based on
 * parameters. Each family includes cleanup mechanisms to prevent memory leaks.
 *
 * @module performance/atom-family
 */
import { atom } from 'jotai'
import { atomFamily } from 'jotai/utils'

import { withDebugLabel } from '@/lib/atoms/utils'
import type { TrainingPlan, Workout } from '@/lib/supabase'

import { trainingPlansAtom } from '../training-plans'
import { workoutsAtom } from '../workouts'
import { createAtomFamilyWithCleanup } from './cleanup'

/**
 * Workout atom family - creates individual atoms per workout ID
 *
 * @example
 * ```typescript
 * const workoutAtom = workoutAtomFamily('workout-123')
 * // Use in component...
 * // Clean up when done: workoutAtomFamily.remove('workout-123')
 * ```
 */
export const workoutAtomFamily = atomFamily((workoutId: string) => {
  const a = atom(
    get => {
      // First try to get from the main workouts atom
      const workouts = get(workoutsAtom)
      const workout = workouts.find(w => w.id === workoutId)
      return workout || null
    },
    (_get, set, newWorkout: Workout | null) => {
      // Allow direct setting if needed
      set(workoutAtomFamily(workoutId), newWorkout)
    }
  )
  return withDebugLabel(a, `workoutAtomFamily(${workoutId})`)
})

/**
 * Training plan atom family - creates individual atoms per plan ID
 *
 * @example
 * ```typescript
 * const planAtom = trainingPlanAtomFamily('plan-456')
 * // Use in component...
 * // Clean up when done: trainingPlanAtomFamily.remove('plan-456')
 * ```
 */
export const trainingPlanAtomFamily = atomFamily((planId: string) => {
  const a = atom(
    get => {
      // First try to get from the main training plans atom
      const plans = get(trainingPlansAtom)
      const plan = plans.find(p => p.id === planId)
      return plan || null
    },
    (_get, set, newPlan: TrainingPlan | null) => {
      // Allow direct setting if needed
      set(trainingPlanAtomFamily(planId), newPlan)
    }
  )
  return withDebugLabel(a, `trainingPlanAtomFamily(${planId})`)
})

/**
 * Conversation message count family - tracks unread messages per conversation
 *
 * @example
 * ```typescript
 * const countAtom = conversationMessageCountFamily('conv-789')
 * // Clean up: conversationMessageCountFamily.remove('conv-789')
 * ```
 */
export const conversationMessageCountFamily = atomFamily((conversationId: string) => {
  return withDebugLabel(atom(0), `conversationMessageCount(${conversationId})`)
})

/**
 * Form field atom family for granular form updates
 * Allows individual field updates without re-rendering entire form
 *
 * @example
 * ```typescript
 * const fieldAtom = formFieldAtomFamily({ formId: 'signup', fieldName: 'email' })
 * // Clean up: formFieldAtomFamily.remove({ formId: 'signup', fieldName: 'email' })
 * ```
 */
export const formFieldAtomFamily = atomFamily(
  ({ formId, fieldName }: { formId: string; fieldName: string }) =>
    withDebugLabel(atom(''), `formField(${formId}.${fieldName})`)
)

/**
 * Loading state family for async operations
 * Tracks loading state for individual operations
 *
 * @example
 * ```typescript
 * const loadingAtom = loadingStateFamily('fetch-user-data')
 * // Clean up: loadingStateFamily.remove('fetch-user-data')
 * ```
 */
export const loadingStateFamily = atomFamily((operationId: string) =>
  withDebugLabel(atom(false), `loadingState(${operationId})`)
)

/**
 * Error state family for async operations
 * Tracks error messages for individual operations
 *
 * @example
 * ```typescript
 * const errorAtom = errorStateFamily('fetch-user-data')
 * // Clean up: errorStateFamily.remove('fetch-user-data')
 * ```
 */
export const errorStateFamily = atomFamily((operationId: string) =>
  withDebugLabel(atom<string | null>(null), `errorState(${operationId})`)
)

// Note: Removed messagesByConversationLoadableFamily
// Messages are now filtered from the global messagesAtom using derived atoms
// This follows Jotai best practices: derive state, don't duplicate it

/**
 * Enhanced atom families with built-in cleanup mechanisms
 * These provide automatic memory management to prevent leaks
 */

// Enhanced workout atom family with cleanup
export const workoutAtomFamilyEnhanced = createAtomFamilyWithCleanup(
  (workoutId: string) => {
    const a = atom<Workout | null>(null)
    a.debugLabel = `workoutEnhanced(${workoutId})`
    return a
  },
  workoutId => `workout-${workoutId}`
)

// Enhanced training plan atom family with cleanup
export const trainingPlanAtomFamilyEnhanced = createAtomFamilyWithCleanup(
  (planId: string) => {
    const a = atom<TrainingPlan | null>(null)
    a.debugLabel = `planEnhanced(${planId})`
    return a
  },
  planId => `plan-${planId}`
)

// Enhanced conversation count family with cleanup
export const conversationMessageCountFamilyEnhanced = createAtomFamilyWithCleanup(
  (conversationId: string) => {
    const a = atom(0)
    a.debugLabel = `conv-count-enhanced(${conversationId})`
    return a
  },
  conversationId => `conv-count-${conversationId}`
)

/**
 * Cleanup utilities exported for use in components
 *
 * @example
 * ```typescript
 * // In a React component
 * import { cleanupAtomFamilies } from '@/lib/atoms/performance/atom-family'
 *
 * useEffect(() => {
 *   return () => {
 *     // Clean up specific atom when component unmounts
 *     workoutAtomFamilyEnhanced.removeAtom(workoutId)
 *   }
 * }, [workoutId])
 * ```
 */
export function cleanupAtomFamilies() {
  // Clear all enhanced families
  workoutAtomFamilyEnhanced.clearAll()
  trainingPlanAtomFamilyEnhanced.clearAll()
  conversationMessageCountFamilyEnhanced.clearAll()
}
