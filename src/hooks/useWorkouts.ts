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
    if (!session?.user?.id) {
      logger.debug('No session user ID, skipping workout fetch')
      return
    }

    setLoadingStates(prev => ({ ...prev, workouts: true }))
    logger.debug('Fetching workouts for user', { userId: session.user.id, role: session.user.role })

    try {
      const response = await fetch('/api/workouts', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        logger.error(`Failed to fetch workouts: ${response.status} ${response.statusText}`)
        throw new Error(`Failed to fetch workouts: ${response.statusText}`)
      }

      const data = await response.json()
      logger.debug('Successfully fetched workouts', {
        count: data.workouts?.length || 0,
        workouts: data.workouts?.slice(0, 3)?.map((w: Workout) => ({
          id: w.id,
          date: w.date,
          planned_type: w.planned_type,
          training_plan_id: w.training_plan_id,
        })),
      })

      setWorkouts(data.workouts || [])
    } catch (error) {
      logger.error('Error fetching workouts:', error)
      setWorkouts([])
    } finally {
      setLoadingStates(prev => ({ ...prev, workouts: false }))
    }
  }, [session?.user?.id, session?.user?.role, setWorkouts, setLoadingStates])

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

  return {
    workouts,
    loading: loadingStates.workouts,
    fetchWorkouts,
    updateWorkout,
    deleteWorkout,
    error: null,
  }
}
