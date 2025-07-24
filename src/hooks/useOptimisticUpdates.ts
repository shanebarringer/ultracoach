'use client'

import { useCallback, useMemo } from 'react'
import { useAtom } from 'jotai'
import { workoutsAtom, trainingPlansAtom, messagesAtom } from '@/lib/atoms'
import { createLogger } from '@/lib/logger'
import type { Workout, TrainingPlan, MessageWithUser } from '@/lib/supabase'

const logger = createLogger('useOptimisticUpdates')

// Type for optimistic updates - currently unused but reserved for future enhancements
// type OptimisticUpdate<T> = {
//   id: string
//   data: Partial<T>
//   timestamp: number
//   isPending: boolean
// }

/**
 * Modern hook for optimistic updates that provides immediate UI feedback
 * Follows React 19 patterns for concurrent features and state management
 */
export function useOptimisticUpdates() {
  const [workouts, setWorkouts] = useAtom(workoutsAtom)
  const [trainingPlans, setTrainingPlans] = useAtom(trainingPlansAtom)
  const [messages, setMessages] = useAtom(messagesAtom)

  // Optimistic workout update
  const updateWorkoutOptimistic = useCallback(async (
    workoutId: string, 
    updates: Partial<Workout>,
    apiCall: () => Promise<Workout>
  ) => {
    // Immediately update UI with optimistic state
    const optimisticWorkout = { ...updates, id: workoutId, isPending: true }
    
    setWorkouts(prev => 
      prev.map(workout => 
        workout.id === workoutId 
          ? { ...workout, ...optimisticWorkout }
          : workout
      )
    )

    logger.debug('Applied optimistic workout update', { workoutId, updates })

    try {
      // Perform actual API call
      const updatedWorkout = await apiCall()
      
      // Replace optimistic state with server response
      setWorkouts(prev => 
        prev.map(workout => 
          workout.id === workoutId 
            ? { ...updatedWorkout, isPending: false }
            : workout
        )
      )

      logger.debug('Confirmed optimistic workout update', { workoutId, updatedWorkout })
      return updatedWorkout
    } catch (error) {
      // Revert optimistic state on failure
      setWorkouts(prev => 
        prev.map(workout => 
          workout.id === workoutId 
            ? { ...workout, ...updates, isPending: false, hasError: true }
            : workout
        )
      )

      logger.error('Reverted optimistic workout update due to error', { workoutId, error })
      throw error
    }
  }, [setWorkouts])

  // Optimistic training plan update
  const updateTrainingPlanOptimistic = useCallback(async (
    planId: string,
    updates: Partial<TrainingPlan>,
    apiCall: () => Promise<TrainingPlan>
  ) => {
    const optimisticPlan = { ...updates, id: planId, isPending: true }
    
    setTrainingPlans(prev => 
      prev.map(plan => 
        plan.id === planId 
          ? { ...plan, ...optimisticPlan }
          : plan
      )
    )

    logger.debug('Applied optimistic training plan update', { planId, updates })

    try {
      const updatedPlan = await apiCall()
      
      setTrainingPlans(prev => 
        prev.map(plan => 
          plan.id === planId 
            ? { ...updatedPlan, isPending: false }
            : plan
        )
      )

      logger.debug('Confirmed optimistic training plan update', { planId, updatedPlan })
      return updatedPlan
    } catch (error) {
      setTrainingPlans(prev => 
        prev.map(plan => 
          plan.id === planId 
            ? { ...plan, ...updates, isPending: false, hasError: true }
            : plan
        )
      )

      logger.error('Reverted optimistic training plan update due to error', { planId, error })
      throw error
    }
  }, [setTrainingPlans])

  // Optimistic message sending
  const sendMessageOptimistic = useCallback(async (
    message: Partial<MessageWithUser> & { context_type?: string },
    apiCall: () => Promise<MessageWithUser>
  ) => {
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      content: message.content || '',
      sender_id: message.sender_id || '',
      recipient_id: message.recipient_id || '',
      created_at: new Date().toISOString(),
      read: false,
      workout_id: message.workout_id || null,
      isPending: true,
      sender: message.sender || { id: '', full_name: '', email: '', role: 'runner' },
    } as MessageWithUser & { isPending?: boolean }

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage])

    logger.debug('Added optimistic message', { message: optimisticMessage })

    try {
      const sentMessage = await apiCall()
      
      // Replace optimistic message with real message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === optimisticMessage.id 
            ? { ...sentMessage, isPending: false }
            : msg
        )
      )

      logger.debug('Confirmed optimistic message', { sentMessage })
      return sentMessage
    } catch (error) {
      // Remove failed optimistic message
      setMessages(prev => 
        prev.filter(msg => msg.id !== optimisticMessage.id)
      )

      logger.error('Removed failed optimistic message', { error })
      throw error
    }
  }, [setMessages])

  // Get pending states for UI indicators
  const pendingStates = useMemo(() => ({
    hasPendingWorkouts: workouts.some((w: Workout & { isPending?: boolean }) => w.isPending),
    hasPendingPlans: trainingPlans.some((p: TrainingPlan & { isPending?: boolean }) => p.isPending),
    hasPendingMessages: messages.some((m: MessageWithUser & { isPending?: boolean }) => m.isPending),
    pendingWorkoutIds: workouts.filter((w: Workout & { isPending?: boolean }) => w.isPending).map(w => w.id),
    pendingPlanIds: trainingPlans.filter((p: TrainingPlan & { isPending?: boolean }) => p.isPending).map(p => p.id),
    pendingMessageIds: messages.filter((m: MessageWithUser & { isPending?: boolean }) => m.isPending).map(m => m.id),
  }), [workouts, trainingPlans, messages])

  return {
    updateWorkoutOptimistic,
    updateTrainingPlanOptimistic, 
    sendMessageOptimistic,
    pendingStates,
  }
}