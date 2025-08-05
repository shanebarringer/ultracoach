'use client'

import { useAtom } from 'jotai'

import { useCallback, useEffect } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import {
  loadingStatesAtom,
  refreshWorkoutsActionAtom,
  workoutLoadableAtom,
  workoutsAtom,
} from '@/lib/atoms'
import { createLogger } from '@/lib/logger'
import type { Workout } from '@/lib/supabase'

const logger = createLogger('useWorkouts')

export function useWorkouts() {
  const { data: session } = useSession()
  const [workouts, setWorkouts] = useAtom(workoutsAtom)
  const [loadingStates] = useAtom(loadingStatesAtom)

  // Use loadable pattern for better async UX
  const [workoutsLoadable] = useAtom(workoutLoadableAtom)
  const [, refreshWorkouts] = useAtom(refreshWorkoutsActionAtom)

  const fetchWorkouts = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      await refreshWorkouts()
    } catch (error) {
      logger.error('Error refreshing workouts:', error)
    }
  }, [session?.user?.id, refreshWorkouts])

  const updateWorkout = useCallback(
    async (workoutId: string, updates: Partial<Workout>) => {
      try {
        const response = await fetch(`/api/workouts/${workoutId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        })

        if (!response.ok) {
          throw new Error('Failed to update workout')
        }

        const data = await response.json()

        // Update local state
        setWorkouts(prev =>
          prev.map(workout =>
            workout.id === workoutId ? { ...workout, ...data.workout } : workout
          )
        )

        return data.workout
      } catch (error) {
        logger.error('Error updating workout:', error)
        throw error
      }
    },
    [setWorkouts]
  )

  const deleteWorkout = useCallback(
    async (workoutId: string) => {
      try {
        const response = await fetch(`/api/workouts/${workoutId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('Failed to delete workout')
        }

        // Update local state
        setWorkouts(prev => prev.filter(workout => workout.id !== workoutId))
      } catch (error) {
        logger.error('Error deleting workout:', error)
        throw error
      }
    },
    [setWorkouts]
  )

  useEffect(() => {
    if (session?.user?.id) {
      fetchWorkouts()
    }
  }, [session?.user?.id, fetchWorkouts])

  // Get workouts and loading state from loadable atom
  const getWorkouts = () => {
    if (workoutsLoadable.state === 'hasData') {
      return workoutsLoadable.data || []
    }
    return workouts // Fallback to basic atom
  }

  const getLoadingState = () => {
    if (workoutsLoadable.state === 'loading') {
      return true
    }
    return loadingStates.workouts
  }

  return {
    workouts: getWorkouts(),
    loading: getLoadingState(),
    fetchWorkouts,
    updateWorkout,
    deleteWorkout,
    error: workoutsLoadable.state === 'hasError' ? workoutsLoadable.error : null,
  }
}
