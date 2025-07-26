'use client'

import axios from 'axios'
import { useSetAtom } from 'jotai'

import { useCallback } from 'react'

import { trainingPlansAtom } from '@/lib/atoms'
import { createLogger } from '@/lib/logger'
import type { TrainingPlan } from '@/lib/supabase'

const logger = createLogger('useTrainingPlansActions')

export function useTrainingPlansActions() {
  const setTrainingPlans = useSetAtom(trainingPlansAtom)

  const createTrainingPlan = useCallback(
    async (planData: Partial<TrainingPlan>) => {
      try {
        const response = await axios.post('/api/training-plans', planData)

        // Update local state
        setTrainingPlans(prev => [response.data.trainingPlan, ...prev])

        return response.data.trainingPlan
      } catch (error) {
        logger.error('Error creating training plan:', error)
        throw error
      }
    },
    [setTrainingPlans]
  )

  const updateTrainingPlan = useCallback(
    async (planId: string, updates: Partial<TrainingPlan>) => {
      try {
        const response = await axios.put(`/api/training-plans/${planId}`, updates)

        // Update local state
        setTrainingPlans(prev =>
          prev.map(plan => (plan.id === planId ? { ...plan, ...response.data.trainingPlan } : plan))
        )

        return response.data.trainingPlan
      } catch (error) {
        logger.error('Error updating training plan:', error)
        throw error
      }
    },
    [setTrainingPlans]
  )

  const deleteTrainingPlan = useCallback(
    async (planId: string) => {
      try {
        await axios.delete(`/api/training-plans/${planId}`)

        // Update local state
        setTrainingPlans(prev => prev.filter(plan => plan.id !== planId))
      } catch (error) {
        logger.error('Error deleting training plan:', error)
        throw error
      }
    },
    [setTrainingPlans]
  )

  const archiveTrainingPlan = useCallback(
    async (planId: string) => {
      try {
        const response = await axios.post(`/api/training-plans/${planId}/archive`)

        // Update local state
        setTrainingPlans(prev =>
          prev.map(plan => (plan.id === planId ? { ...plan, archived: true } : plan))
        )

        return response.data.trainingPlan
      } catch (error) {
        logger.error('Error archiving training plan:', error)
        throw error
      }
    },
    [setTrainingPlans]
  )

  return {
    createTrainingPlan,
    updateTrainingPlan,
    deleteTrainingPlan,
    archiveTrainingPlan,
  }
}
