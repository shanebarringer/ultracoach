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

// Helper function to unwrap API response shapes
function unwrapWorkout(json: unknown): Workout {
  return typeof json === 'object' && json !== null && 'workout' in json
    ? (json as { workout: Workout }).workout
    : (json as Workout)
}

// Core workout atoms with initial value from async fetch
export const workoutsAtom = atom<Workout[]>([])
export const workoutsRefreshTriggerAtom = atom(0)

// User-specific cache to prevent data leakage between accounts
const workoutsCache: Map<string, { data: Workout[]; timestamp: number }> = new Map()
const CACHE_DURATION = 500 // Reduced cache to 500ms for faster updates

// Async workout atom with suspense support
export const asyncWorkoutsAtom = atom(async get => {
  // Subscribe to refresh trigger to refetch when needed
  get(workoutsRefreshTriggerAtom)

  // Only run on client side
  if (typeof window === 'undefined') {
    return []
  }

  const { createLogger } = await import('@/lib/logger')
  const { authClient } = await import('@/lib/better-auth-client')
  const logger = createLogger('AsyncWorkoutsAtom')

  try {
    logger.debug('Fetching workouts...')

    // Check if user is authenticated first
    const session = await authClient.getSession()
    if (!session?.data?.user) {
      logger.debug('No authenticated session found, returning empty workouts')
      return []
    }

    const userId = session.data.user.id

    // Check user-specific cache to prevent unnecessary re-fetches
    const userCache = workoutsCache.get(userId)
    if (userCache && Date.now() - userCache.timestamp < CACHE_DURATION) {
      return userCache.data
    }

    // Use relative URL to ensure same-origin request with cookies
    // Create an AbortController with timeout for the fetch
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    // Use relative URL fetch with credentials included
    const response = await fetch('/api/workouts', {
      headers: {
        Accept: 'application/json',
      },
      credentials: 'same-origin', // Use same-origin to ensure cookies are included
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId))

    if (!response.ok) {
      const errorMessage = `Failed to fetch workouts: ${response.status} ${response.statusText}`
      logger.error(errorMessage)
      // Return empty array instead of throwing to prevent infinite Suspense
      return []
    }

    const data = await response.json()
    const workouts = data.workouts || []

    logger.info('Workouts fetched successfully', { count: workouts.length })

    // Cache the result for this user to prevent re-fetching
    workoutsCache.set(userId, {
      data: workouts as Workout[],
      timestamp: Date.now(),
    })

    return workouts as Workout[]
  } catch (error) {
    // Handle abort errors specifically
    if (error instanceof Error && error.name === 'AbortError') {
      logger.warn('Workouts fetch timed out after 10 seconds')
      return [] // Return empty array on timeout
    }

    logger.error('Error fetching workouts:', error)
    // Return empty array instead of throwing to prevent infinite Suspense
    // This allows the dashboard to still render with no workouts
    return []
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
export const refreshWorkoutsAtom = atom(null, async (get, set) => {
  // Clear current user's cache only for targeted invalidation
  try {
    const { authClient } = await import('@/lib/better-auth-client')
    const session = await authClient.getSession()
    if (session?.data?.user?.id) {
      workoutsCache.delete(session.data.user.id)
    } else {
      // Fallback to clearing all caches if no session
      workoutsCache.clear()
    }
  } catch {
    // If session check fails, clear all caches as fallback
    workoutsCache.clear()
  }

  set(workoutsRefreshTriggerAtom, get(workoutsRefreshTriggerAtom) + 1)

  // Also trigger a re-fetch of async workouts by invalidating the cache
  import('@/lib/logger').then(({ createLogger }) => {
    const logger = createLogger('RefreshWorkoutsAtom')
    logger.debug('Cache cleared and refresh triggered')
  })
})

// Hydration atom to sync async workouts with sync atom
export const hydrateWorkoutsAtom = atom(null, (get, set, workouts: Workout[]) => {
  import('@/lib/logger').then(({ createLogger }) => {
    const logger = createLogger('HydrateWorkoutsAtom')

    logger.debug('Hydrating workouts atom', {
      count: workouts?.length || 0,
      hasData: Array.isArray(workouts),
    })
  })

  set(workoutsAtom, workouts || [])
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
    .sort((a, b) => {
      const primary = compareDatesDesc(a.date, b.date)
      if (primary !== 0) return primary
      // Stable tie-breaker by created_at (newest first)
      return compareDatesDesc(a.created_at, b.created_at)
    })
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
    const { authClient } = await import('@/lib/better-auth-client')
    const logger = createLogger('CompleteWorkoutAtom')

    try {
      // Check authentication first
      const session = await authClient.getSession()
      if (!session?.data?.user) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/workouts/${workoutId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(data || {}),
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('Failed to complete workout', {
          status: response.status,
          statusText: response.statusText,
          errorText,
        })
        throw new Error(`Failed to complete workout: ${response.status} ${errorText}`)
      }

      let updatedWorkout: Workout
      if (response.status === 204) {
        // Handle 204 No Content - find existing workout and mark as completed
        const existingWorkout = get(workoutsAtom).find(w => w.id === workoutId)
        if (!existingWorkout) {
          logger.error('Workout not found in local state after completion', { workoutId })
          throw new Error(`Workout ${workoutId} not found in local state. Please refresh the page.`)
        }
        updatedWorkout = { ...existingWorkout, status: 'completed', ...data }
      } else {
        const json: unknown = await response.json()
        updatedWorkout = unwrapWorkout(json)
      }

      logger.debug('Workout completion response received', {
        workoutId,
        updatedStatus: updatedWorkout.status,
        hasActualDistance: !!updatedWorkout.actual_distance,
      })

      // Update the workouts atom with the new status
      const workouts = get(workoutsAtom)
      const updatedWorkouts = workouts.map((w: Workout) =>
        w.id === workoutId ? { ...w, ...updatedWorkout } : w
      )
      set(workoutsAtom, updatedWorkouts)

      // Invalidate current user's cache only
      try {
        const session = await authClient.getSession()
        if (session?.data?.user?.id) {
          workoutsCache.delete(session.data.user.id)
        } else {
          workoutsCache.clear()
        }
      } catch {
        workoutsCache.clear()
      }
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
    const { authClient } = await import('@/lib/better-auth-client')
    const logger = createLogger('LogWorkoutDetailsAtom')

    try {
      // Check authentication first
      const session = await authClient.getSession()
      if (!session?.data?.user) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/workouts/${workoutId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('Failed to log workout details', {
          status: response.status,
          statusText: response.statusText,
          errorText,
        })
        throw new Error(`Failed to log workout details: ${response.status} ${errorText}`)
      }

      let updatedWorkout: Workout
      if (response.status === 204) {
        // Handle 204 No Content - find existing workout and apply updates
        const existingWorkout = get(workoutsAtom).find(w => w.id === workoutId)
        if (!existingWorkout) {
          logger.error('Workout not found in local state during logging', { workoutId })
          throw new Error(`Workout ${workoutId} not found in local state. Please refresh the page.`)
        }
        updatedWorkout = { ...existingWorkout, ...data } as Workout
      } else {
        const json: unknown = await response.json()
        updatedWorkout = unwrapWorkout(json)
      }

      logger.debug('Workout details logged successfully', {
        workoutId,
        updatedFields: Object.keys(data),
      })

      // Update the workouts atom with the new details
      const workouts = get(workoutsAtom)
      const updatedWorkouts = workouts.map((w: Workout) =>
        w.id === workoutId ? { ...w, ...updatedWorkout } : w
      )
      set(workoutsAtom, updatedWorkouts)

      // Invalidate current user's cache only
      try {
        const session = await authClient.getSession()
        if (session?.data?.user?.id) {
          workoutsCache.delete(session.data.user.id)
        } else {
          workoutsCache.clear()
        }
      } catch {
        workoutsCache.clear()
      }
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
  const { authClient } = await import('@/lib/better-auth-client')
  const logger = createLogger('SkipWorkoutAtom')

  try {
    // Check authentication first
    const session = await authClient.getSession()
    if (!session?.data?.user) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`/api/workouts/${workoutId}/complete`, {
      method: 'DELETE',
      credentials: 'same-origin',
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Failed to skip workout', {
        status: response.status,
        statusText: response.statusText,
        errorText,
      })
      throw new Error(`Failed to skip workout: ${response.status} ${errorText}`)
    }

    let updatedWorkout: Workout
    if (response.status === 204) {
      // Handle 204 No Content - find existing workout and mark as skipped
      const existingWorkout = get(workoutsAtom).find(w => w.id === workoutId)
      if (!existingWorkout) {
        logger.error('Workout not found in local state during skip', { workoutId })
        throw new Error(`Workout ${workoutId} not found in local state. Please refresh the page.`)
      }
      updatedWorkout = { ...existingWorkout, status: 'skipped' }
    } else {
      const json: unknown = await response.json()
      updatedWorkout = unwrapWorkout(json)
    }

    logger.debug('Workout skipped successfully', {
      workoutId,
      newStatus: updatedWorkout.status,
    })

    // Update the workouts atom with the new status
    const workouts = get(workoutsAtom)
    const updatedWorkouts = workouts.map((w: Workout) =>
      w.id === workoutId ? { ...w, ...updatedWorkout } : w
    )
    set(workoutsAtom, updatedWorkouts)

    // Clear cache and trigger refresh to ensure all components update
    workoutsCache.clear()
    set(workoutsRefreshTriggerAtom, get(workoutsRefreshTriggerAtom) + 1)

    logger.info('Workout skipped successfully', { workoutId })
    return updatedWorkout
  } catch (error) {
    logger.error('Error skipping workout', error)
    throw error
  }
})
