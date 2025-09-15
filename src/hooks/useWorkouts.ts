'use client'

import { useAtom, useAtomValue, useSetAtom } from 'jotai'

import { useCallback, useEffect } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import {
  completedWorkoutsAtom,
  refreshWorkoutsAtom,
  upcomingWorkoutsAtom,
  workoutsAtom,
} from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import type { Workout } from '@/lib/supabase'

const logger = createLogger('useWorkouts')

export function useWorkouts() {
  const { data: session } = useSession()
  const [workouts, setWorkouts] = useAtom(workoutsAtom)
  const refresh = useSetAtom(refreshWorkoutsAtom)
  const upcomingWorkouts = useAtomValue(upcomingWorkoutsAtom)
  const completedWorkouts = useAtomValue(completedWorkoutsAtom)

  // Trigger initial fetch when session is available
  useEffect(() => {
    if (session?.user?.id) {
      logger.debug('Session available, triggering workout refresh', {
        userId: session.user.id,
      })
      refresh()
    }
  }, [session?.user?.id, refresh])

  const fetchWorkouts = useCallback(() => {
    logger.debug('Triggering workout refresh')
    refresh()
  }, [refresh])

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

        const data = await response.json()

        // Update local state and trigger refresh
        setWorkouts(prev =>
          prev.map(workout =>
            workout.id === workoutId ? { ...workout, ...data.workout } : workout
          )
        )
        refresh()

        return data.workout
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
