// Workout management atoms
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import type { Workout } from '@/lib/supabase'
import type { WorkoutMatch } from '@/utils/workout-matching'

// Core workout atoms
export const workoutsAtom = atom<Workout[]>([])
export const workoutsLoadingAtom = atom(false)
export const workoutsErrorAtom = atom<string | null>(null)
export const workoutsRefreshTriggerAtom = atom(0)

// Async workout atom with suspense support
export const asyncWorkoutsAtom = atom(async () => {
  // This would be populated with actual async data fetching
  return [] as Workout[]
})

// Selected workout atoms
export const selectedWorkoutAtom = atom<Workout | null>(null)
export const selectedWorkoutIdAtom = atom<string | null>(null)

// Workout filtering atoms
export const workoutSearchTermAtom = atomWithStorage('workoutSearchTerm', '')
export const workoutTypeFilterAtom = atomWithStorage('workoutTypeFilter', 'all')
export const workoutStatusFilterAtom = atomWithStorage('workoutStatusFilter', 'all')
export const workoutSortByAtom = atomWithStorage<
  'date-desc' | 'date-asc' | 'type' | 'status' | 'distance'
>('workoutSortBy', 'date-desc')
export const workoutViewModeAtom = atomWithStorage<'grid' | 'list'>('workoutViewMode', 'grid')
export const workoutQuickFilterAtom = atomWithStorage<
  'all' | 'today' | 'this-week' | 'completed' | 'planned'
>('workoutQuickFilter', 'all')
export const workoutShowAdvancedFiltersAtom = atomWithStorage('workoutShowAdvancedFilters', false)

// Workout form atoms
export const workoutFormDataAtom = atom<Partial<Workout>>({})
export const isEditingWorkoutAtom = atom(false)
export const editingWorkoutIdAtom = atom<string | null>(null)

// Debouncing atoms
export const messagesFetchTimestampAtom = atom<number>(0)
export const workoutLinkSelectorSearchAtom = atom<string>('')

// Typing status debouncing atoms
export const typingTimeoutRefsAtom = atom<Record<string, ReturnType<typeof setTimeout> | null>>({})
export const sendTypingTimeoutRefsAtom = atom<Record<string, ReturnType<typeof setTimeout> | null>>(
  {}
)

// Workout lookup map for quick access
export const workoutLookupMapAtom = atom(get => {
  const workouts = get(workoutsAtom)
  return new Map(workouts.map(w => [w.id, w]))
})

// Workout diff modal atoms
export const selectedMatchAtom = atom<WorkoutMatch | null>(null)
export const showWorkoutDiffModalAtom = atom(false)

// Advanced workout actions atoms
// Workout action interfaces
interface WorkoutActionPayload {
  workoutId?: string
  data?: {
    actual_distance?: number
    actual_duration?: number
    actual_elevation?: number
    notes?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

interface OptimisticOperationPayload {
  id?: string
  tempId?: string
  originalData?: unknown
  newData?: unknown
  [key: string]: unknown
}

interface ErrorRecoveryContext {
  operation?: string
  workoutId?: string
  error?: Error
  timestamp?: number
  [key: string]: unknown
}

export const workoutActionsAtom = atom({
  type: '',
  payload: null as WorkoutActionPayload | null,
})

export const optimisticOperationAtom = atom({
  type: '',
  action: '',
  payload: null as OptimisticOperationPayload | null,
})

export const errorRecoveryAtom = atom({
  type: '',
  message: '',
  context: null as ErrorRecoveryContext | null,
})

export const persistedStateAtom = atom({
  lastSync: new Date().toISOString(),
  uiPreferences: {},
})

export const workoutAnalyticsAtom = atom({
  completionRate: 0,
  streak: {
    current: 0,
    longest: 0,
  },
  thisWeek: {
    planned: 0,
    completed: 0,
  },
  thisMonth: {
    planned: 0,
    completed: 0,
  },
})

// Workout completion data interface
interface WorkoutCompletionData {
  actual_distance?: number
  actual_duration?: number
  actual_elevation?: number
  actual_heart_rate_avg?: number
  notes?: string
  [key: string]: unknown
}

/**
 * Write-only atom for marking a workout as completed.
 * Optimistically updates the local state and syncs with the backend.
 *
 * @param workoutId - The ID of the workout to complete
 * @param data - Optional additional data to include with the completion
 * @returns The updated workout object
 * @throws Error if the workout completion fails
 */
export const completeWorkoutAtom = atom(
  null,
  async (get, set, { workoutId, data }: { workoutId: string; data?: WorkoutCompletionData }) => {
    const { createLogger } = await import('@/lib/logger')
    const logger = createLogger('CompleteWorkoutAtom')

    try {
      const response = await fetch(`/api/workouts/${workoutId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
      })

      if (!response.ok) {
        throw new Error('Failed to complete workout')
      }

      const updatedWorkout = await response.json()

      // Update the workouts atom with the new status
      const workouts = get(workoutsAtom)
      const updatedWorkouts = workouts.map((w: Workout) =>
        w.id === workoutId ? { ...w, ...updatedWorkout } : w
      )
      set(workoutsAtom, updatedWorkouts)

      // Trigger refresh for any dependent atoms
      set(workoutsRefreshTriggerAtom, Date.now())

      logger.info('Workout completed successfully', { workoutId })
      return updatedWorkout
    } catch (error) {
      logger.error('Error completing workout', error)
      throw error
    }
  }
)

// Workout details interface for logging
interface WorkoutDetails {
  actual_distance?: number | null
  actual_duration?: number | null
  actual_elevation?: number | null
  actual_heart_rate_avg?: number | null
  actual_heart_rate_max?: number | null
  actual_pace?: string | null
  notes?: string | null
  weather?: string | null
  terrain?: string | null
  perceived_effort?: number | null
  [key: string]: unknown
}

/**
 * Write-only atom for logging workout details (distance, time, notes, etc).
 * Updates the workout with actual performance data after completion.
 *
 * @param workoutId - The ID of the workout to log details for
 * @param data - The workout details to log
 * @returns The updated workout object
 * @throws Error if logging details fails
 */
export const logWorkoutDetailsAtom = atom(
  null,
  async (get, set, { workoutId, data }: { workoutId: string; data: WorkoutDetails }) => {
    const { createLogger } = await import('@/lib/logger')
    const logger = createLogger('LogWorkoutDetailsAtom')

    try {
      const response = await fetch(`/api/workouts/${workoutId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to log workout details')
      }

      const updatedWorkout = await response.json()

      // Update the workouts atom with the new details
      const workouts = get(workoutsAtom)
      const updatedWorkouts = workouts.map((w: Workout) =>
        w.id === workoutId ? { ...w, ...updatedWorkout } : w
      )
      set(workoutsAtom, updatedWorkouts)

      // Trigger refresh for any dependent atoms
      set(workoutsRefreshTriggerAtom, Date.now())

      logger.info('Workout details logged successfully', { workoutId })
      return updatedWorkout
    } catch (error) {
      logger.error('Error logging workout details', error)
      throw error
    }
  }
)

/**
 * Write-only atom for marking a workout as skipped.
 * Updates the workout status to skipped and maintains training history.
 *
 * @param workoutId - The ID of the workout to skip
 * @returns The updated workout object
 * @throws Error if skipping the workout fails
 */
export const skipWorkoutAtom = atom(null, async (get, set, workoutId: string) => {
  const { createLogger } = await import('@/lib/logger')
  const logger = createLogger('SkipWorkoutAtom')

  try {
    const response = await fetch(`/api/workouts/${workoutId}/complete`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Failed to skip workout')
    }

    const updatedWorkout = await response.json()

    // Update the workouts atom with the new status
    const workouts = get(workoutsAtom)
    const updatedWorkouts = workouts.map((w: Workout) =>
      w.id === workoutId ? { ...w, ...updatedWorkout } : w
    )
    set(workoutsAtom, updatedWorkouts)

    // Trigger refresh for any dependent atoms
    set(workoutsRefreshTriggerAtom, Date.now())

    logger.info('Workout skipped successfully', { workoutId })
    return updatedWorkout
  } catch (error) {
    logger.error('Error skipping workout', error)
    throw error
  }
})
