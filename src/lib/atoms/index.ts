// ============================================================================
// Barrel file for Jotai atoms - maintains backward compatibility while using
// modular organization for better maintainability and performance.
// ============================================================================
// External dependencies
import { atom } from 'jotai'

// Type imports
import type { User as BetterAuthUser, Session } from '../better-auth-client'
import type { PlanTemplate, Race, User, Workout } from '../supabase'

// ============================================================================
// Re-exports from modular atom files
// ============================================================================

// Core domain atoms
export * from './auth' // Authentication and session atoms
export * from './chat' // Messaging and conversation atoms
export * from './forms' // Form state management atoms
export * from './notifications' // Notification system atoms
export * from './races' // Race management atoms
export * from './relationships' // Coach-runner relationship atoms
export * from './strava' // Strava integration atoms
export * from './training-plans' // Training plan atoms
export * from './ui' // UI state management atoms
export * from './workouts' // Workout management atoms

// Performance optimization patterns
export * from './performance/atom-family' // Dynamic atom creation patterns
export * from './performance/loadable' // Async loading patterns
export * from './performance/split-atoms' // Granular state splitting

// Derived atoms (computed values)
export * from './derived' // All computed/derived atoms

// ============================================================================
// Legacy atoms still in this file
// These will be migrated to domain modules in future iterations
// ============================================================================

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

// Re-export complex atoms from domain modules for backward compatibility
export { completeWorkoutAtom, logWorkoutDetailsAtom, skipWorkoutAtom } from './workouts'
export { sendMessageActionAtom } from './chat'

// Re-export utility functions and types from jotai/utils
export { atomWithRefresh, atomWithStorage, loadable, splitAtom, unwrap } from 'jotai/utils'
