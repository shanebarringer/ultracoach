'use client'

import { useAtom } from 'jotai'

import { useCallback } from 'react'

import { api } from '@/lib/api-client'
import { asyncWorkoutsAtom, workoutsAtom, workoutsRefreshTriggerAtom } from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import type { Workout } from '@/lib/supabase'

const logger = createLogger('useAsyncWorkouts')

/**
 * Modern React hook for workouts that leverages Suspense boundaries
 * Uses async atoms for data fetching with automatic suspense handling
 */
export function useAsyncWorkouts() {
  // This will trigger Suspense when data is loading
  const asyncWorkouts = useAtom(asyncWorkoutsAtom)[0]
  const [, setWorkouts] = useAtom(workoutsAtom)
  const [, setRefreshTrigger] = useAtom(workoutsRefreshTriggerAtom)

  const updateWorkout = useCallback(
    async (workoutId: string, updates: Partial<Workout>) => {
      try {
        const response = await api.patch<{ workout: Workout }>(
          `/api/workouts/${workoutId}`,
          updates,
          { suppressGlobalToast: true }
        )

        const data = response.data

        // Update both async and sync atoms
        setWorkouts(prev =>
          prev.map(workout =>
            workout.id === workoutId ? { ...workout, ...data.workout } : workout
          )
        )

        logger.debug('Successfully updated workout', { workoutId, updates })
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
        await api.delete(`/api/workouts/${workoutId}`, { suppressGlobalToast: true })

        // Update both async and sync atoms
        setWorkouts(prev => prev.filter(workout => workout.id !== workoutId))

        logger.debug('Successfully deleted workout', { workoutId })
      } catch (error) {
        logger.error('Error deleting workout:', error)
        throw error
      }
    },
    [setWorkouts]
  )

  const refreshWorkouts = useCallback(() => {
    // Trigger atom invalidation by incrementing the refresh trigger
    // This forces the async atom to re-evaluate and refetch data
    setRefreshTrigger(prev => prev + 1)
    logger.debug('Triggered workouts refresh via atom invalidation')
  }, [setRefreshTrigger])

  return {
    workouts: asyncWorkouts,
    updateWorkout,
    deleteWorkout,
    refreshWorkouts,
  }
}
