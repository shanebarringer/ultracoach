'use client'

import { useAtom, useSetAtom } from 'jotai'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect } from 'react'
import { trainingPlansAtom, loadingStatesAtom } from '@/lib/atoms'
import type { TrainingPlan } from '@/lib/atoms'

export function useTrainingPlans() {
  const { data: session } = useSession()
  const [trainingPlans, setTrainingPlans] = useAtom(trainingPlansAtom)
  const setLoadingStates = useSetAtom(loadingStatesAtom)

  const fetchTrainingPlans = useCallback(async () => {
    if (!session?.user?.id) return

    setLoadingStates(prev => ({ ...prev, trainingPlans: true }))

    try {
      const response = await fetch('/api/training-plans')
      
      if (!response.ok) {
        console.error('Failed to fetch training plans:', response.statusText)
        return
      }

      const data = await response.json()
      setTrainingPlans(data.trainingPlans || [])
    } catch (error) {
      console.error('Error fetching training plans:', error)
    } finally {
      setLoadingStates(prev => ({ ...prev, trainingPlans: false }))
    }
  }, [session?.user?.id, setTrainingPlans, setLoadingStates])

  const createTrainingPlan = useCallback(async (planData: Partial<TrainingPlan>) => {
    try {
      const response = await fetch('/api/training-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planData),
      })

      if (!response.ok) {
        throw new Error('Failed to create training plan')
      }

      const data = await response.json()
      
      // Update local state
      setTrainingPlans(prev => [data.trainingPlan, ...prev])

      return data.trainingPlan
    } catch (error) {
      console.error('Error creating training plan:', error)
      throw error
    }
  }, [setTrainingPlans])

  const updateTrainingPlan = useCallback(async (planId: string, updates: Partial<TrainingPlan>) => {
    try {
      const response = await fetch(`/api/training-plans/${planId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update training plan')
      }

      const data = await response.json()
      
      // Update local state
      setTrainingPlans(prev => 
        prev.map(plan => 
          plan.id === planId ? { ...plan, ...data.trainingPlan } : plan
        )
      )

      return data.trainingPlan
    } catch (error) {
      console.error('Error updating training plan:', error)
      throw error
    }
  }, [setTrainingPlans])

  const deleteTrainingPlan = useCallback(async (planId: string) => {
    try {
      const response = await fetch(`/api/training-plans/${planId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete training plan')
      }

      // Update local state
      setTrainingPlans(prev => prev.filter(plan => plan.id !== planId))
    } catch (error) {
      console.error('Error deleting training plan:', error)
      throw error
    }
  }, [setTrainingPlans])

  const archiveTrainingPlan = useCallback(async (planId: string) => {
    try {
      const response = await fetch(`/api/training-plans/${planId}/archive`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to archive training plan')
      }

      const data = await response.json()
      
      // Update local state
      setTrainingPlans(prev => 
        prev.map(plan => 
          plan.id === planId ? { ...plan, archived: true } : plan
        )
      )

      return data.trainingPlan
    } catch (error) {
      console.error('Error archiving training plan:', error)
      throw error
    }
  }, [setTrainingPlans])

  useEffect(() => {
    if (session?.user?.id) {
      fetchTrainingPlans()
    }
  }, [session?.user?.id, fetchTrainingPlans])

  return {
    trainingPlans,
    fetchTrainingPlans,
    createTrainingPlan,
    updateTrainingPlan,
    deleteTrainingPlan,
    archiveTrainingPlan,
  }
}