'use client'

import { useAtom, useSetAtom } from 'jotai'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect } from 'react'
import { workoutsAtom, loadingStatesAtom } from '@/lib/atoms'
import type { Workout } from '@/lib/atoms'

export function useWorkouts() {
  const { data: session } = useSession()
  const [workouts, setWorkouts] = useAtom(workoutsAtom)
  const setLoadingStates = useSetAtom(loadingStatesAtom)

  const fetchWorkouts = useCallback(async () => {
    if (!session?.user?.id) return

    setLoadingStates(prev => ({ ...prev, workouts: true }))

    try {
      const response = await fetch('/api/workouts')
      
      if (!response.ok) {
        console.error('Failed to fetch workouts:', response.statusText)
        return
      }

      const data = await response.json()
      setWorkouts(data.workouts || [])
    } catch (error) {
      console.error('Error fetching workouts:', error)
    } finally {
      setLoadingStates(prev => ({ ...prev, workouts: false }))
    }
  }, [session?.user?.id, setWorkouts, setLoadingStates])

  const updateWorkout = useCallback(async (workoutId: string, updates: Partial<Workout>) => {
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
      console.error('Error updating workout:', error)
      throw error
    }
  }, [setWorkouts])

  const deleteWorkout = useCallback(async (workoutId: string) => {
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
      console.error('Error deleting workout:', error)
      throw error
    }
  }, [setWorkouts])

  useEffect(() => {
    if (session?.user?.id) {
      fetchWorkouts()
    }
  }, [session?.user?.id, fetchWorkouts])

  return {
    workouts,
    fetchWorkouts,
    updateWorkout,
    deleteWorkout,
  }
}