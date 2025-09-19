'use client'

import { useAtom, useAtomValue, useSetAtom } from 'jotai'

import { useCallback, useEffect } from 'react'

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
  const [workouts, setWorkouts] = useAtom(workoutsAtom)
  const refresh = useSetAtom(refreshWorkoutsAtom)
  const upcomingWorkouts = useAtomValue(upcomingWorkoutsAtom)
  const completedWorkouts = useAtomValue(completedWorkoutsAtom)

  // Note: Hydration is now handled at top-level components (DashboardRouter, page clients)
  // to avoid forcing Suspense on all consumers of this hook

  // Don't trigger refresh here - it causes loops with Suspense
  // The asyncWorkoutsAtom will fetch on mount automatically

  const fetchWorkouts = useCallback(async (): Promise<Workout[]> => {
    logger.debug('Fetching workouts (imperative)')

    try {
      // Check authentication first (client-side only)
      if (typeof window !== 'undefined') {
        const { authClient } = await import('@/lib/better-auth-client')
        const session = await authClient.getSession()
        if (!session?.user) {
          logger.debug('No authenticated session found')
          return []
        }
      }

      // Get fresh data directly from the API (similar to asyncWorkoutsAtom)
      const response = await fetch('/api/workouts', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
      })

      if (!response.ok) {
        const errorMessage = `Failed to fetch workouts: ${response.status} ${response.statusText}`
        logger.error(errorMessage)
        throw new Error(errorMessage)
      }

      const data: unknown = await response.json()
      const freshWorkouts = (data as { workouts?: Workout[] })?.workouts ?? []

      // Wait for state updates to complete before resolving
      await new Promise(resolve => {
        // Update both the sync atom and trigger async atom refresh
        setWorkouts(freshWorkouts)
        refresh() // Keep async atom cache in sync for other consumers

        // Use setTimeout to ensure state updates have completed
        setTimeout(resolve, 0)
      })

      logger.debug('Workout fetch completed', { count: freshWorkouts.length })
      return freshWorkouts
    } catch (error) {
      logger.error('Error fetching workouts:', error)
      throw error
    }
  }, [refresh, setWorkouts])

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
