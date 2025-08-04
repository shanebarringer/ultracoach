'use client'

import { useAtom } from 'jotai'

import { useCallback, useEffect } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import { loadingStatesAtom, workoutsAtom } from '@/lib/atoms'
import { createLogger } from '@/lib/logger'
import type { Workout } from '@/lib/supabase'

const logger = createLogger('useWorkouts')

export function useWorkouts() {
  const { data: session } = useSession()
  const [workouts, setWorkouts] = useAtom(workoutsAtom)
  const [loadingStates, setLoadingStates] = useAtom(loadingStatesAtom)

  const fetchWorkouts = useCallback(async () => {
    if (!session?.user?.id) return

    setLoadingStates(prev => ({ ...prev, workouts: true }))

    try {
      const response = await fetch('/api/workouts')

      if (!response.ok) {
        logger.error('Failed to fetch workouts:', response.statusText)
        return
      }

      const data = await response.json()
      setWorkouts(data.workouts || [])
    } catch (error) {
      logger.error('Error fetching workouts:', error)
    } finally {
      setLoadingStates(prev => ({ ...prev, workouts: false }))
    }
  }, [session?.user?.id, setWorkouts, setLoadingStates])

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
  }, [session?.user?.id]) // Remove fetchWorkouts from dependencies since it's memoized with stable deps

  return {
    workouts,
    loading: loadingStates.workouts,
    fetchWorkouts,
    updateWorkout,
    deleteWorkout,
  }
}
