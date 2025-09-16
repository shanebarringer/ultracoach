// Workout management atoms
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import type { Workout } from '@/lib/supabase'
import {
  compareDatesAsc,
  compareDatesDesc,
  isWorkoutUpcoming,
  isWorkoutWithinDays,
} from '@/lib/utils/date'
import type { WorkoutMatch } from '@/utils/workout-matching'

// Core workout atoms with initial value from async fetch
export const workoutsAtom = atom<Workout[]>([])
export const workoutsLoadingAtom = atom(false)
export const workoutsErrorAtom = atom<string | null>(null)
export const workoutsRefreshTriggerAtom = atom(0)

// Async workout atom with suspense support
export const asyncWorkoutsAtom = atom(async get => {
  // Subscribe to refresh trigger to refetch when needed
  get(workoutsRefreshTriggerAtom)

  const { createLogger } = await import('@/lib/logger')
  const logger = createLogger('AsyncWorkoutsAtom')

  try {
    logger.debug('Fetching workouts...')

    // Determine the base URL based on environment
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'

    const response = await fetch(`${baseUrl}/api/workouts`, {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      const errorMessage = `Failed to fetch workouts: ${response.status} ${response.statusText}`
      logger.error(errorMessage)
      throw new Error(errorMessage)
    }

    const data = await response.json()
    const workouts = data.workouts || []

    logger.info('Workouts fetched successfully', {
      count: workouts.length,
      sample: workouts.slice(0, 3).map((w: Workout) => ({
        id: w.id,
        date: w.date,
        status: w.status,
        planned_type: w.planned_type,
      })),
    })

    return workouts as Workout[]
  } catch (error) {
    logger.error('Error fetching workouts:', error)
    throw error // Re-throw to let Suspense boundary handle it
  }
})

// Combined atom that fetches and stores workouts
export const workoutsWithSuspenseAtom = atom(get => {
  // When this is accessed, it will trigger the async fetch
  const asyncWorkouts = get(asyncWorkoutsAtom)
  // Return the value (this will suspend until resolved)
  return asyncWorkouts
})

// Refresh action atom
export const refreshWorkoutsAtom = atom(null, (get, set) => {
  set(workoutsRefreshTriggerAtom, get(workoutsRefreshTriggerAtom) + 1)
})

// Hydration atom to sync async workouts with sync atom
export const hydrateWorkoutsAtom = atom(null, (get, set, workouts: Workout[]) => {
  set(workoutsAtom, workouts)
})

// Selected workout atoms
export const selectedWorkoutAtom = atom<Workout | null>(null)
export const selectedWorkoutIdAtom = atom<string | null>(null)

// Derived atoms for filtered views
export const upcomingWorkoutsAtom = atom(get => {
  const workouts = get(workoutsAtom)

  return workouts
    .filter((w: Workout) => {
      // Use date-fns to check if workout is upcoming (today or future)
      return isWorkoutUpcoming(w.date) && w.status === 'planned'
    })
    .sort((a, b) => compareDatesAsc(a.date, b.date))
})

export const completedWorkoutsAtom = atom(get => {
  const workouts = get(workoutsAtom)
  return workouts
    .filter((w: Workout) => w.status === 'completed')
    .sort((a, b) => compareDatesDesc(a.date, b.date))
})

export const thisWeekWorkoutsAtom = atom(get => {
  const workouts = get(workoutsAtom)

  return workouts.filter((w: Workout) => {
    // Use date-fns to check if workout is within the next 7 days
    return isWorkoutWithinDays(w.date, 7)
  })
})

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
      const baseUrl =
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'
      const response = await fetch(`${baseUrl}/api/workouts/${workoutId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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

      // Trigger refresh to ensure all components update
      set(workoutsRefreshTriggerAtom, get(workoutsRefreshTriggerAtom) + 1)

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
      const baseUrl =
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'
      const response = await fetch(`${baseUrl}/api/workouts/${workoutId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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

      // Trigger refresh to ensure all components update
      set(workoutsRefreshTriggerAtom, get(workoutsRefreshTriggerAtom) + 1)

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
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'
    const response = await fetch(`${baseUrl}/api/workouts/${workoutId}/complete`, {
      method: 'DELETE',
      credentials: 'include',
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

    // Trigger refresh to ensure all components update
    set(workoutsRefreshTriggerAtom, get(workoutsRefreshTriggerAtom) + 1)

    logger.info('Workout skipped successfully', { workoutId })
    return updatedWorkout
  } catch (error) {
    logger.error('Error skipping workout', error)
    throw error
  }
})
