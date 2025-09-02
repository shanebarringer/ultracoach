'use client'

import { useAtom } from 'jotai'

import { useCallback } from 'react'

import {
  errorRecoveryAtom,
  optimisticOperationAtom,
  persistedStateAtom,
  workoutActionsAtom,
  workoutAnalyticsAtom,
} from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import type { Workout } from '@/lib/supabase'

const logger = createLogger('useAdvancedWorkoutActions')

/**
 * Advanced workout actions hook using Phase 3 patterns
 * Provides centralized operations, optimistic updates, and analytics
 */
export function useAdvancedWorkoutActions() {
  const [, dispatchWorkoutAction] = useAtom(workoutActionsAtom)
  const [, performOptimisticOperation] = useAtom(optimisticOperationAtom)
  const [, handleError] = useAtom(errorRecoveryAtom)
  const [analytics] = useAtom(workoutAnalyticsAtom)
  const [persistedState, setPersistedState] = useAtom(persistedStateAtom)

  // Create workout with optimistic updates
  const createWorkout = useCallback(
    async (workoutData: Partial<Workout>) => {
      try {
        logger.info('🚀 Creating workout with optimistic update')

        // Perform optimistic update
        performOptimisticOperation({
          type: 'workout',
          action: 'CREATE_WORKOUT',
          payload: workoutData,
        })

        // Here you would normally make the API call
        // const response = await fetch('/api/workouts', { method: 'POST', body: JSON.stringify(workoutData) })
        // if (!response.ok) throw new Error('Failed to create workout')

        logger.info('✅ Workout created successfully')
        return true
      } catch (error) {
        logger.error('❌ Failed to create workout:', error)
        handleError({
          type: 'OPTIMISTIC_UPDATE_FAILED',
          message: 'Failed to create workout',
          context: { workoutData },
        })
        return false
      }
    },
    [performOptimisticOperation, handleError]
  )

  // Update workout with immediate UI feedback
  const updateWorkout = useCallback(
    async (id: string, updates: Partial<Workout>) => {
      try {
        logger.info('📝 Updating workout:', { id, updates })

        // Direct action dispatch for immediate updates
        dispatchWorkoutAction({
          type: 'UPDATE_WORKOUT',
          payload: { id, updates },
        })

        // API call would go here
        logger.info('✅ Workout updated successfully')
        return true
      } catch (error) {
        logger.error('❌ Failed to update workout:', error)
        handleError({
          type: 'UPDATE_FAILED',
          message: 'Failed to update workout',
          context: { id, updates },
        })
        return false
      }
    },
    [dispatchWorkoutAction, handleError]
  )

  // Complete workout with rich completion data
  const completeWorkout = useCallback(
    async (
      id: string,
      completionData: {
        distance?: number
        duration?: number
        notes?: string
        intensity?: number
      }
    ) => {
      try {
        logger.info('🏁 Completing workout:', { id, completionData })

        performOptimisticOperation({
          type: 'workout',
          action: 'COMPLETE_WORKOUT',
          payload: { id, completionData },
        })

        // API call would go here
        // Update last completed workout timestamp in persisted state
        setPersistedState(prev => ({
          ...prev,
          lastSync: new Date().toISOString(),
        }))

        logger.info('✅ Workout completed successfully')
        return true
      } catch (error) {
        logger.error('❌ Failed to complete workout:', error)
        handleError({
          type: 'COMPLETION_FAILED',
          message: 'Failed to complete workout',
          context: { id, completionData },
        })
        return false
      }
    },
    [performOptimisticOperation, handleError, setPersistedState]
  )

  // Bulk operations for multiple workouts
  const bulkUpdateStatus = useCallback(
    async (workoutIds: string[], status: 'planned' | 'completed' | 'skipped') => {
      try {
        logger.info('📋 Bulk updating workout status:', { count: workoutIds.length, status })

        dispatchWorkoutAction({
          type: 'BULK_UPDATE_STATUS',
          payload: { workoutIds, status },
        })

        // API call would go here
        logger.info('✅ Bulk update completed successfully')
        return true
      } catch (error) {
        logger.error('❌ Failed to bulk update workouts:', error)
        handleError({
          type: 'BULK_UPDATE_FAILED',
          message: 'Failed to bulk update workouts',
          context: { workoutIds, status },
        })
        return false
      }
    },
    [dispatchWorkoutAction, handleError]
  )

  // Delete workout with confirmation
  const deleteWorkout = useCallback(
    async (id: string) => {
      try {
        logger.info('🗑️ Deleting workout:', { id })

        performOptimisticOperation({
          type: 'workout',
          action: 'DELETE_WORKOUT',
          payload: { id },
        })

        // API call would go here
        logger.info('✅ Workout deleted successfully')
        return true
      } catch (error) {
        logger.error('❌ Failed to delete workout:', error)
        handleError({
          type: 'DELETE_FAILED',
          message: 'Failed to delete workout',
          context: { id },
        })
        return false
      }
    },
    [performOptimisticOperation, handleError]
  )

  // Get analytics with memoization
  const getAnalytics = useCallback(() => {
    logger.debug('📊 Getting workout analytics')
    return analytics
  }, [analytics])

  // Update UI preferences
  const updatePreferences = useCallback(
    (preferences: Partial<typeof persistedState.uiPreferences>) => {
      logger.info('⚙️ Updating UI preferences:', preferences)
      setPersistedState(prev => ({
        ...prev,
        uiPreferences: { ...prev.uiPreferences, ...preferences },
        lastSync: new Date().toISOString(),
      }))
    },
    [setPersistedState, persistedState]
  )

  return {
    // Core operations
    createWorkout,
    updateWorkout,
    completeWorkout,
    deleteWorkout,
    bulkUpdateStatus,

    // Analytics and insights
    analytics,
    getAnalytics,

    // Preferences and settings
    preferences: persistedState,
    updatePreferences,

    // Utility functions
    canPerformBulkOperations: (workoutIds: string[]) => workoutIds.length > 0,
    getCompletionRate: () => analytics.completionRate,
    getCurrentStreak: () => analytics.streak.current,
    getWeeklyStats: () => analytics.thisWeek,
    getMonthlyStats: () => analytics.thisMonth,
  }
}
