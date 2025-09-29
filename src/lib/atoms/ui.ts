/**
 * UI state management atoms
 *
 * This module manages all UI-related state including modals, drawers,
 * loading states, theme preferences, and component-specific UI states.
 *
 * @module atoms/ui
 */
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import type { User as BetterAuthUser } from '@/lib/better-auth-client'
import type { User, Workout } from '@/lib/supabase'

// Modal state atoms
export const showCreateWorkoutModalAtom = atom(false)
showCreateWorkoutModalAtom.debugLabel = 'showCreateWorkoutModalAtom'
export const showCreateTrainingPlanModalAtom = atom(false)
showCreateTrainingPlanModalAtom.debugLabel = 'showCreateTrainingPlanModalAtom'
export const showWorkoutLogModalAtom = atom(false)
showWorkoutLogModalAtom.debugLabel = 'showWorkoutLogModalAtom'
export const showNewMessageModalAtom = atom(false)
showNewMessageModalAtom.debugLabel = 'showNewMessageModalAtom'
export const showEditProfileModalAtom = atom(false)
showEditProfileModalAtom.debugLabel = 'showEditProfileModalAtom'
export const showRelationshipModalAtom = atom(false)
showRelationshipModalAtom.debugLabel = 'showRelationshipModalAtom'

// Drawer and sidebar state
export const isDrawerOpenAtom = atom(false)
isDrawerOpenAtom.debugLabel = 'isDrawerOpenAtom'
export const isSidebarCollapsedAtom = atomWithStorage('sidebarCollapsed', false)
isSidebarCollapsedAtom.debugLabel = 'isSidebarCollapsedAtom'

// Theme and appearance
export const themeAtom = atomWithStorage<'light' | 'dark' | 'system'>('theme', 'system')
themeAtom.debugLabel = 'themeAtom'
export const compactModeAtom = atomWithStorage('compactMode', false)
compactModeAtom.debugLabel = 'compactModeAtom'

// Loading states
export const globalLoadingAtom = atom(false)
globalLoadingAtom.debugLabel = 'globalLoadingAtom'
export const globalLoadingMessageAtom = atom<string | null>(null)
globalLoadingMessageAtom.debugLabel = 'globalLoadingMessageAtom'

// Component-specific loading states
export const loadingStatesAtom = atom({
  workouts: false,
  trainingPlans: false,
  messages: false,
  notifications: false,
  relationships: false,
  strava: false,
  races: false,
  conversations: false,
})

// Toast notifications
loadingStatesAtom.debugLabel = 'loadingStatesAtom'
export const toastMessagesAtom = atom<
  Array<{
    id: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    duration?: number
  }>
>([])

// Calendar UI state
toastMessagesAtom.debugLabel = 'toastMessagesAtom'
export const calendarUiStateAtom = atom({
  view: 'month' as 'week' | 'month' | 'day',
  selectedDate: null as string | null,
  highlightedDates: [] as Date[],
  filterType: 'all' as 'all' | 'planned' | 'completed',
  showDetails: true,
  selectedWorkoutId: null as string | null,
  showWorkoutModal: false,
  selectedCalendarWorkout: null as Workout | null,
  showAddWorkoutModal: false,
  workoutsLoading: false,
  selectedRunnerId: null as string | null,
})

// Theme mode
calendarUiStateAtom.debugLabel = 'calendarUiStateAtom'
export const themeModeAtom = atomWithStorage<'light' | 'dark'>('ultracoach-theme', 'dark')
themeModeAtom.debugLabel = 'themeModeAtom'

// Runners page tab
export const runnersPageTabAtom = atom<'connected' | 'discover'>('connected')
runnersPageTabAtom.debugLabel = 'runnersPageTabAtom'

/**
 * Extended UI state atom - combines all UI-related state
 * Migrated from barrel file for better organization and to prevent circular dependencies
 *
 * This comprehensive atom manages various UI states across the application
 * including modals, filters, selections, and drawer states.
 */
export const uiStateAtom = atom({
  // Modal states
  showCreateTrainingPlan: false,
  showLogWorkout: false,
  showNewMessage: false,
  isAddWorkoutModalOpen: false,
  isWorkoutLogModalOpen: false,
  isNewMessageModalOpen: false,

  // Selection states
  selectedWorkout: null as Workout | null,
  selectedRunner: null as User | null,
  selectedAthleteForWorkout: null as (User | BetterAuthUser) | null,
  selectedConversationUserId: null as string | null,

  // Filter states
  workoutFilter: 'all' as 'all' | 'planned' | 'completed' | 'skipped',
  showArchived: false,

  // Calendar state
  currentWeek: new Date(),

  // Feature flags
  useSuspense: false,
  defaultToComplete: false,

  // Connection status
  connectionStatus: 'connected' as 'connected' | 'reconnecting' | 'disconnected',

  // Drawer states
  isDrawerOpen: false,
  isDrawerPinned: false,

  // Context states
  workoutContext: null as string | null,
  expandedNotes: {} as Record<string, boolean>,
})
uiStateAtom.debugLabel = 'uiStateAtom'
