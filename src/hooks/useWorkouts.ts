'use client'

import { useAtom, useAtomValue, useSetAtom } from 'jotai'

import { useCallback, useEffect } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import {
  asyncWorkoutsAtom,
  completedWorkoutsAtom,
  refreshWorkoutsAtom,
  upcomingWorkoutsAtom,
  workoutsAtom,
} from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import type { Workout } from '@/lib/supabase'

const logger = createLogger('useWorkouts')

/**
 * Hook to hydrate the synchronous workoutsAtom from the async Suspense-based atom
 * This ensures data consistency between the two atoms and prevents data mismatches
 */
export function useHydrateWorkouts() {
  const setWorkouts = useSetAtom(workoutsAtom)

  // This will trigger Suspense if not already loaded
  const asyncWorkouts = useAtomValue(asyncWorkoutsAtom)

  useEffect(() => {
    logger.debug('Hydrating workouts atom from async data', {
      count: asyncWorkouts?.length ?? 0,
    })
    setWorkouts(asyncWorkouts ?? [])
  }, [asyncWorkouts, setWorkouts])

  return asyncWorkouts
}

export function useWorkouts() {
  const { data: session } = useSession()
  const [workouts, setWorkouts] = useAtom(workoutsAtom)
  const refresh = useSetAtom(refreshWorkoutsAtom)
  const upcomingWorkouts = useAtomValue(upcomingWorkoutsAtom)
  const completedWorkouts = useAtomValue(completedWorkoutsAtom)

  // Note: Hydration is now handled at top-level components (DashboardRouter, page clients)
  // to avoid forcing Suspense on all consumers of this hook

  // Trigger initial fetch when session is available
  useEffect(() => {
    if (session?.user?.id) {
      logger.debug('Session available, triggering workout refresh', {
        userId: session.user.id,
      })
      refresh()
    }
  }, [session?.user?.id, refresh])

  const fetchWorkouts = useCallback(async () => {
    logger.debug('Triggering workout refresh')

    // Trigger the refresh which will invalidate and re-fetch the async atom
    refresh()

    // Return a Promise that resolves after a brief delay to allow the refresh to propagate
    // This provides proper async behavior for loading states without complex subscription logic
    return new Promise<Workout[]>((resolve) => {
      setTimeout(() => {
        logger.debug('Workout refresh promise resolved')
        resolve(workouts)
      }, 150) // Brief delay to allow atom refresh to propagate
    })
  }, [refresh, workouts])

  const updateWorkout = useCallback(
    async (workoutId: string, updates: Partial<Workout>) => {
      try {
        const response = await fetch(`/api/workouts/${workoutId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(updates),
        })

        if (!response.ok) {
          throw new Error('Failed to update workout')
        }

        const json: unknown = await response.json()
        const updated: Workout =
          typeof json === 'object' && json !== null && 'workout' in json
            ? (json as { workout: Workout }).workout
            : (json as Workout)

        // Update local state and trigger refresh
        setWorkouts(prev =>
          prev.map(workout => (workout.id === workoutId ? { ...workout, ...updated } : workout))
        )
        refresh()

        return updated
      } catch (error) {
        logger.error('Error updating workout:', error)
        throw error
      }
    },
    [setWorkouts, refresh]
  )

  const deleteWorkout = useCallback(
    async (workoutId: string) => {
      try {
        const response = await fetch(`/api/workouts/${workoutId}`, {
          method: 'DELETE',
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to delete workout')
        }

        // Update local state and trigger refresh
        setWorkouts(prev => prev.filter(workout => workout.id !== workoutId))
        refresh()
      } catch (error) {
        logger.error('Error deleting workout:', error)
        throw error
      }
    },
    [setWorkouts, refresh]
  )

  return {
    workouts,
    upcomingWorkouts,
    completedWorkouts,
    loading: false, // Remove loading state since we're using Suspense
    fetchWorkouts,
    updateWorkout,
    deleteWorkout,
    refresh,
    error: null,
  }
}
