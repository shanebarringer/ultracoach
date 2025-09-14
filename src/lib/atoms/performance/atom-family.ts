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
export const workoutAtomFamily = atomFamily((workoutId: string) =>
  atom(
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
)

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
export const trainingPlanAtomFamily = atomFamily((planId: string) =>
  atom(
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
)

/**
 * Conversation message count family - tracks unread messages per conversation
 *
 * @example
 * ```typescript
 * const countAtom = conversationMessageCountFamily('conv-789')
 * // Clean up: conversationMessageCountFamily.remove('conv-789')
 * ```
 */
export const conversationMessageCountFamily = atomFamily((_conversationId: string) => atom(0))

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
  ({ formId: _formId, fieldName: _fieldName }: { formId: string; fieldName: string }) => atom('')
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
export const loadingStateFamily = atomFamily((_operationId: string) => atom(false))

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
export const errorStateFamily = atomFamily((_operationId: string) => atom<string | null>(null))

/**
 * Messages by conversation family for async loading
 * Fetches and caches messages for individual conversations
 *
 * @example
 * ```typescript
 * const messagesAtom = messagesByConversationLoadableFamily('conv-123')
 * const messages = await get(messagesAtom) // Triggers fetch if not cached
 * // Clean up: messagesByConversationLoadableFamily.remove('conv-123')
 * ```
 */
export const messagesByConversationLoadableFamily = atomFamily((conversationId: string) =>
  atom(async () => {
    // Fetch messages for specific conversation
    const response = await fetch(`/api/messages/conversation/${conversationId}`)
    if (!response.ok) return []
    return response.json()
  })
)

/**
 * Enhanced atom families with built-in cleanup mechanisms
 * These provide automatic memory management to prevent leaks
 */

// Enhanced workout atom family with cleanup
export const workoutAtomFamilyEnhanced = createAtomFamilyWithCleanup(
  (_workoutId: string) => atom<Workout | null>(null),
  workoutId => `workout-${workoutId}`
)

// Enhanced training plan atom family with cleanup
export const trainingPlanAtomFamilyEnhanced = createAtomFamilyWithCleanup(
  (_planId: string) => atom<TrainingPlan | null>(null),
  planId => `plan-${planId}`
)

// Enhanced conversation count family with cleanup
export const conversationMessageCountFamilyEnhanced = createAtomFamilyWithCleanup(
  (_conversationId: string) => atom(0),
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
