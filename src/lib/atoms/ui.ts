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
export const showCreateTrainingPlanModalAtom = atom(false)
export const showWorkoutLogModalAtom = atom(false)
export const showNewMessageModalAtom = atom(false)
export const showEditProfileModalAtom = atom(false)
export const showRelationshipModalAtom = atom(false)

// Drawer and sidebar state
export const isDrawerOpenAtom = atom(false)
export const isSidebarCollapsedAtom = atomWithStorage('sidebarCollapsed', false)

// Theme and appearance
export const themeAtom = atomWithStorage<'light' | 'dark' | 'system'>('theme', 'system')
export const compactModeAtom = atomWithStorage('compactMode', false)

// Loading states
export const globalLoadingAtom = atom(false)
export const globalLoadingMessageAtom = atom<string | null>(null)

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
export const toastMessagesAtom = atom<
  Array<{
    id: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    duration?: number
  }>
>([])

// Calendar UI state
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
export const themeModeAtom = atomWithStorage<'light' | 'dark'>('ultracoach-theme', 'dark')

// Runners page tab
export const runnersPageTabAtom = atom<'connected' | 'discover'>('connected')

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

// Jotai Devtools debug labels
showCreateWorkoutModalAtom.debugLabel = 'ui/showCreateWorkoutModal'
showCreateTrainingPlanModalAtom.debugLabel = 'ui/showCreateTrainingPlanModal'
showWorkoutLogModalAtom.debugLabel = 'ui/showWorkoutLogModal'
showNewMessageModalAtom.debugLabel = 'ui/showNewMessageModal'
showEditProfileModalAtom.debugLabel = 'ui/showEditProfileModal'
showRelationshipModalAtom.debugLabel = 'ui/showRelationshipModal'
isDrawerOpenAtom.debugLabel = 'ui/isDrawerOpen'
isSidebarCollapsedAtom.debugLabel = 'ui/isSidebarCollapsed'
themeAtom.debugLabel = 'ui/theme'
compactModeAtom.debugLabel = 'ui/compactMode'
globalLoadingAtom.debugLabel = 'ui/globalLoading'
globalLoadingMessageAtom.debugLabel = 'ui/globalLoadingMessage'
loadingStatesAtom.debugLabel = 'ui/loadingStates'
toastMessagesAtom.debugLabel = 'ui/toastMessages'
calendarUiStateAtom.debugLabel = 'ui/calendarState'
themeModeAtom.debugLabel = 'ui/themeMode'
runnersPageTabAtom.debugLabel = 'ui/runnersPageTab'
uiStateAtom.debugLabel = 'ui/state'
