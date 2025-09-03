// Barrel exports for backward compatibility
// This file re-exports all atoms from their modular locations
// Allowing gradual migration while maintaining existing imports

// Core domain atoms
export * from './auth'
export * from './workouts'
export * from './training-plans'
export * from './chat'
export * from './ui'
export * from './notifications'
export * from './forms'
export * from './relationships'
export * from './strava'
export * from './races'

// Performance optimization patterns
export * from './performance/atom-family'
export * from './performance/split-atoms'
export * from './performance/loadable'

// Derived atoms
export * from './derived'

// Import needed types and utilities
import { atom } from 'jotai'

import type { User as BetterAuthUser, Session } from '../better-auth-client'
import { createLogger } from '../logger'
import type {
  OptimisticMessage,
  PlanTemplate,
  Race,
  User,
  Workout,
} from '../supabase'

// Legacy atoms that need special handling
// These are complex atoms that don't fit cleanly into a single category

// Better Auth state atom (composite auth state)
export const authStateAtom = atom({
  user: null as BetterAuthUser | null,
  session: null as Session | null,
  loading: true,
  error: null as string | null,
})

// Extended UI state atom (composite UI state)
export const uiStateAtom = atom({
  showCreateTrainingPlan: false,
  showLogWorkout: false,
  showNewMessage: false,
  selectedWorkout: null as Workout | null,
  selectedRunner: null as User | null,
  workoutFilter: 'all' as 'all' | 'planned' | 'completed' | 'skipped',
  showArchived: false,
  currentWeek: new Date(),
  useSuspense: false,
  defaultToComplete: false,
  connectionStatus: 'connected' as 'connected' | 'reconnecting' | 'disconnected',
  isDrawerOpen: false,
  isDrawerPinned: false,
  isAddWorkoutModalOpen: false,
  isWorkoutLogModalOpen: false,
  isNewMessageModalOpen: false,
  selectedAthleteForWorkout: null as (User | BetterAuthUser) | null,
  selectedConversationUserId: null as string | null,
  workoutContext: null as string | null,
  expandedNotes: {} as Record<string, boolean>,
})

// Legacy atoms that are still in use
export const authLoadingAtom = atom<boolean>(true)
export const runnersAtom = atom<User[]>([])
export const planTemplatesAtom = atom<PlanTemplate[]>([])
export const racesAtom = atom<Race[]>([])

// Workout completion atoms (complex write-only atoms)
export const completeWorkoutAtom = atom(
  null,
  async (get, set, { workoutId, data }: { workoutId: string; data?: Record<string, unknown> }) => {
    const logger = createLogger('CompleteWorkoutAtom')

    try {
      const response = await fetch(`/api/workouts/${workoutId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
      })

      if (!response.ok) {
        throw new Error('Failed to complete workout')
      }

      const updatedWorkout = await response.json()

      // Update the workouts atom with the new status
      const workouts = get(workoutsAtom)
      const updatedWorkouts = workouts.map((w: Workout) =>
        w.id === workoutId ? { ...w, ...updatedWorkout } : w
      )
      set(workoutsAtom, updatedWorkouts)

      // Trigger refresh for any dependent atoms
      set(workoutsRefreshTriggerAtom, Date.now())

      logger.info('Workout completed successfully', { workoutId })
      return updatedWorkout
    } catch (error) {
      logger.error('Error completing workout', error)
      throw error
    }
  }
)

export const logWorkoutDetailsAtom = atom(
  null,
  async (get, set, { workoutId, data }: { workoutId: string; data: Record<string, unknown> }) => {
    const logger = createLogger('LogWorkoutDetailsAtom')

    try {
      const response = await fetch(`/api/workouts/${workoutId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to log workout details')
      }

      const updatedWorkout = await response.json()

      // Update the workouts atom with the new details
      const workouts = get(workoutsAtom)
      const updatedWorkouts = workouts.map((w: Workout) =>
        w.id === workoutId ? { ...w, ...updatedWorkout } : w
      )
      set(workoutsAtom, updatedWorkouts)

      // Trigger refresh for any dependent atoms
      set(workoutsRefreshTriggerAtom, Date.now())

      logger.info('Workout details logged successfully', { workoutId })
      return updatedWorkout
    } catch (error) {
      logger.error('Error logging workout details', error)
      throw error
    }
  }
)

// Import required atoms from modular files
import { workoutsAtom, workoutsRefreshTriggerAtom } from './workouts'

// Skip workout atom
export const skipWorkoutAtom = atom(null, async (get, set, workoutId: string) => {
  const logger = createLogger('SkipWorkoutAtom')

  try {
    const response = await fetch(`/api/workouts/${workoutId}/complete`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Failed to skip workout')
    }

    const updatedWorkout = await response.json()

    // Update the workouts atom with the new status
    const workouts = get(workoutsAtom)
    const updatedWorkouts = workouts.map((w: Workout) =>
      w.id === workoutId ? { ...w, ...updatedWorkout } : w
    )
    set(workoutsAtom, updatedWorkouts)

    // Trigger refresh for any dependent atoms
    set(workoutsRefreshTriggerAtom, Date.now())

    logger.info('Workout skipped successfully', { workoutId })
    return updatedWorkout
  } catch (error) {
    logger.error('Error skipping workout', error)
    throw error
  }
})

// Send message action atom
export const sendMessageActionAtom = atom(
  null,
  async (
    get,
    set,
    payload: {
      recipientId: string
      content: string
      workoutId?: string
    }
  ) => {
    const session = get(sessionAtom)
    // Type guard and validation for Better Auth session
    if (
      !session ||
      typeof session !== 'object' ||
      !session.user ||
      typeof session.user !== 'object'
    ) {
      throw new Error('No session available')
    }

    const user = session.user as { id: string; email: string; name?: string; role?: string }
    if (!user.id) throw new Error('No user ID available')

    const tempId = `temp-${Date.now()}`
    const optimisticMessage = {
      id: tempId,
      tempId,
      conversation_id: '',
      sender_id: user.id,
      recipient_id: payload.recipientId,
      content: payload.content,
      workout_id: payload.workoutId || null,
      created_at: new Date().toISOString(),
      sender: {
        id: user.id,
        email: user.email,
        role: (user.role || 'runner') as 'runner' | 'coach',
        full_name: user.name || '',
        created_at: '',
        updated_at: '',
      },
      read: false,
      optimistic: true,
    }

    // Add optimistic message immediately
    set(messagesAtom, prev => [...prev, optimisticMessage])

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: payload.content,
          recipientId: payload.recipientId,
          workoutId: payload.workoutId,
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()
      const realMessage = data.message || data

      // Replace optimistic message with real message
      set(messagesAtom, prev =>
        prev.map(msg => (msg.tempId === tempId ? { ...realMessage, optimistic: false } : msg))
      )

      return realMessage
    } catch (error) {
      // Remove optimistic message on failure
      set(messagesAtom, prev =>
        prev.filter(msg => msg.tempId !== tempId)
      )
      throw error
    }
  }
)

// Import needed atoms from chat module
import { messagesAtom } from './chat'
import { sessionAtom } from './auth'

// Re-export utility functions and types from jotai/utils
export { atomWithRefresh, atomWithStorage, loadable, splitAtom, unwrap } from 'jotai/utils'