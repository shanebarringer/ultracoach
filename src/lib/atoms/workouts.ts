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

import { asyncUserSettingsAtom } from './settings'
import { withDebugLabel } from './utils'

/**
 * WORKOUT ATOMS ARCHITECTURE
 *
 * This file implements a dual-atom pattern optimized for Suspense + optimistic updates:
 *
 * 1. asyncWorkoutsAtom (Read-Only, Suspense)
 *    - Async atom that fetches from API and triggers Suspense boundaries
 *    - Used ONLY for: Initial page load, hard refresh, manual refresh triggers
 *    - Never write to this atom directly - it's controlled by refresh trigger
 *
 * 2. workoutsAtom (Read/Write, Sync)
 *    - Synchronous cache of workout data hydrated from asyncWorkoutsAtom
 *    - Used ALWAYS for: All component reads, optimistic updates, mutations
 *    - This is the PRIMARY atom - components should ALWAYS read from here
 *    - Supports fast optimistic updates without triggering Suspense
 *
 * 3. workoutsRefreshTriggerAtom (Write-Only)
 *    - Counter that increments to trigger asyncWorkoutsAtom refetch
 *    - Use ONLY when: Hard refresh needed (navigation, external data changes)
 *    - DO NOT use after saves - use optimistic updates instead
 *
 * BEST PRACTICES:
 *
 * ✅ DO: Read from workoutsAtom in all components
 * ✅ DO: Write optimistically to workoutsAtom before API calls
 * ✅ DO: Update workoutsAtom with server response after API success
 * ✅ DO: Only refresh on navigation or hard refresh needs
 *
 * ❌ DON'T: Read from asyncWorkoutsAtom directly (causes unnecessary Suspense)
 * ❌ DON'T: Call refreshWorkouts() after every mutation (use optimistic updates)
 * ❌ DON'T: Maintain separate local state that duplicates workoutsAtom
 *
 * EXAMPLE - Optimistic Update Pattern:
 *
 * const saveWorkout = async (workout: Workout) => {
 *   // 1. Optimistic update (immediate UI feedback)
 *   setWorkouts(prev => [...prev, { ...workout, id: `temp-${Date.now()}` }])
 *
 *   // 2. API call in background
 *   const saved = await fetch('/api/workouts', { method: 'POST', body: JSON.stringify(workout) })
 *
 *   // 3. Replace temp ID with real ID
 *   setWorkouts(prev => prev.map(w =>
 *     w.id.startsWith('temp-') ? saved : w
 *   ))
 *
 *   // 4. NO refreshWorkouts() call needed - state already updated
 * }
 */

// Helper function to unwrap API response shapes
function unwrapWorkout(json: unknown): Workout {
  return typeof json === 'object' && json !== null && 'workout' in json
    ? (json as { workout: Workout }).workout
    : (json as Workout)
}

// Core workout atoms with initial value from async fetch
export const workoutsAtom = atom<Workout[]>([])
export const workoutsRefreshTriggerAtom = atom(0)

// Async workout atom with suspense support
export const asyncWorkoutsAtom = atom(async get => {
  // Subscribe to refresh trigger to refetch when needed
  get(workoutsRefreshTriggerAtom)

  // CRITICAL: Only run on client side - server can't access cookies
  // Return empty array during SSR, client will hydrate with actual data
  if (typeof window === 'undefined') {
    return []
  }

  const { createLogger } = await import('@/lib/logger')
  const { api } = await import('@/lib/api-client')
  const logger = createLogger('AsyncWorkoutsAtom')

  // CRITICAL FIX (Phase 1): Replaced raw fetch() with axios api.get() for production reliability
  // Benefits over raw fetch:
  // 1. Automatic credential injection via axios interceptors - ensures cookies sent in all scenarios
  // 2. Built-in retry logic and error handling
  // 3. Consistent header management
  // 4. Production-tested with preview deployments
  // Previous issues: raw fetch with 'same-origin' sometimes failed to include cookies in production

  try {
    logger.debug('Fetching workouts via axios...')

    // Use axios api.get() with automatic credential injection
    // The api-client interceptor automatically adds withCredentials: true for /api/* routes
    const response = await api.get<{ workouts: Workout[] }>('/api/workouts', {
      suppressGlobalToast: true, // Don't show error toasts - we handle errors gracefully
    })

    const workouts = response.data.workouts || []

    logger.info('Workouts fetched successfully', { count: workouts.length })

    return workouts as Workout[]
  } catch (error) {
    // Axios errors have structured response data
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number } }
      if (axiosError.response?.status === 401) {
        logger.debug('Unauthorized - user session expired or invalid')
        return []
      }
      logger.error('HTTP error fetching workouts', {
        status: axiosError.response?.status,
      })
      return []
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
  // Trigger a re-fetch by incrementing the refresh trigger (functional updater to avoid race)
  set(workoutsRefreshTriggerAtom, prev => (prev ?? 0) + 1)

  import('@/lib/logger').then(({ createLogger }) => {
    const logger = createLogger('RefreshWorkoutsAtom')
    logger.debug('Refresh triggered')
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

/**
 * Training preferences for workouts
 * Derives show_completed_workouts setting from user's training preferences
 */
export const workoutShowCompletedAtom = atom(get => {
  const settings = get(asyncUserSettingsAtom)
  return settings?.training_preferences?.show_completed_workouts ?? true
})

/**
 * Workout metric tracking preferences
 * Determines which metrics should be visible based on user settings
 */
export const workoutMetricPreferencesAtom = atom(get => {
  const settings = get(asyncUserSettingsAtom)
  const prefs = settings?.training_preferences
  return {
    trackHeartRate: prefs?.track_heart_rate ?? true,
    trackCadence: prefs?.track_cadence ?? true,
    trackPower: prefs?.track_power ?? false, // Power meters less common
  }
})

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

      // Trigger refresh to fetch updated data
      set(workoutsRefreshTriggerAtom, prev => (prev ?? 0) + 1)

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

      // Trigger refresh to fetch updated data
      set(workoutsRefreshTriggerAtom, prev => (prev ?? 0) + 1)

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

    // Trigger refresh to fetch updated data
    set(workoutsRefreshTriggerAtom, prev => (prev ?? 0) + 1)

    logger.info('Workout skipped successfully', { workoutId })
    return updatedWorkout
  } catch (error) {
    logger.error('Error skipping workout', error)
    throw error
  }
})

// Jotai Devtools debug labels (dev-only)
withDebugLabel(workoutsAtom, 'workouts/list')
withDebugLabel(workoutsRefreshTriggerAtom, 'workouts/refreshTrigger')
withDebugLabel(asyncWorkoutsAtom, 'workouts/async')
withDebugLabel(workoutsWithSuspenseAtom, 'workouts/withSuspense')
withDebugLabel(refreshWorkoutsAtom, 'workouts/refreshAction')
withDebugLabel(hydrateWorkoutsAtom, 'workouts/hydrateAction')
withDebugLabel(selectedWorkoutAtom, 'workouts/selected')
withDebugLabel(selectedWorkoutIdAtom, 'workouts/selectedId')
withDebugLabel(upcomingWorkoutsAtom, 'workouts/upcoming')
withDebugLabel(completedWorkoutsAtom, 'workouts/completed')
withDebugLabel(thisWeekWorkoutsAtom, 'workouts/thisWeek')
withDebugLabel(workoutSearchTermAtom, 'workouts/searchTerm')
withDebugLabel(workoutTypeFilterAtom, 'workouts/typeFilter')
withDebugLabel(workoutStatusFilterAtom, 'workouts/statusFilter')
withDebugLabel(workoutSortByAtom, 'workouts/sortBy')
withDebugLabel(workoutViewModeAtom, 'workouts/viewMode')
withDebugLabel(workoutQuickFilterAtom, 'workouts/quickFilter')
withDebugLabel(workoutShowAdvancedFiltersAtom, 'workouts/showAdvancedFilters')
withDebugLabel(workoutFormDataAtom, 'workouts/formData')
withDebugLabel(isEditingWorkoutAtom, 'workouts/isEditing')
withDebugLabel(editingWorkoutIdAtom, 'workouts/editingId')
withDebugLabel(messagesFetchTimestampAtom, 'workouts/messagesFetchTimestamp')
withDebugLabel(workoutLinkSelectorSearchAtom, 'workouts/linkSelectorSearch')
withDebugLabel(typingTimeoutRefsAtom, 'workouts/typingTimeoutRefs')
withDebugLabel(sendTypingTimeoutRefsAtom, 'workouts/sendTypingTimeoutRefs')
withDebugLabel(workoutLookupMapAtom, 'workouts/lookupMap')
withDebugLabel(selectedMatchAtom, 'workouts/selectedMatch')
withDebugLabel(showWorkoutDiffModalAtom, 'workouts/showDiffModal')
withDebugLabel(workoutActionsAtom, 'workouts/actions')
withDebugLabel(optimisticOperationAtom, 'workouts/optimisticOperation')
withDebugLabel(errorRecoveryAtom, 'workouts/errorRecovery')
withDebugLabel(persistedStateAtom, 'workouts/persistedState')
withDebugLabel(workoutAnalyticsAtom, 'workouts/analytics')
withDebugLabel(completeWorkoutAtom, 'workouts/completeAction')
withDebugLabel(logWorkoutDetailsAtom, 'workouts/logDetailsAction')
withDebugLabel(skipWorkoutAtom, 'workouts/skipAction')
