'use client'

import { useAtom } from 'jotai'
import { asyncWorkoutsAtom, workoutsAtom } from '@/lib/atoms'
import { useCallback } from 'react'
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

  const updateWorkout = useCallback(async (workoutId: string, updates: Partial<Workout>) => {
    try {
      const response = await fetch(`/api/workouts/${workoutId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update workout')
      }

      const data = await response.json()
      
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
  }, [setWorkouts])

  const deleteWorkout = useCallback(async (workoutId: string) => {
    try {
      const response = await fetch(`/api/workouts/${workoutId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete workout')
      }

      // Update both async and sync atoms
      setWorkouts(prev => prev.filter(workout => workout.id !== workoutId))
      
      logger.debug('Successfully deleted workout', { workoutId })
    } catch (error) {
      logger.error('Error deleting workout:', error)
      throw error
    }
  }, [setWorkouts])

  const refreshWorkouts = useCallback(() => {
    // Force re-fetch by updating the dependency
    // In a real implementation, you might want to invalidate the async atom
    window.location.reload() // Simple approach for demo
  }, [])

  return {
    workouts: asyncWorkouts,
    updateWorkout,
    deleteWorkout,
    refreshWorkouts,
  }
}