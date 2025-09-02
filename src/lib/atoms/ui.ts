// UI state management atoms
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

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

// Toast notifications
export const toastMessagesAtom = atom<Array<{
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}>>([])

// Calendar UI state
export const calendarUiStateAtom = atom({
  view: 'month' as 'week' | 'month' | 'day',
  selectedDate: null as string | null,
  highlightedDates: [] as Date[],
  filterType: 'all' as 'all' | 'planned' | 'completed',
  showDetails: true,
  selectedWorkoutId: null as string | null,
  showWorkoutModal: false,
  selectedCalendarWorkout: null as any,
  showAddWorkoutModal: false,
  workoutsLoading: false,
  selectedRunnerId: null as string | null,
})

// Theme mode
export const themeModeAtom = atomWithStorage<'light' | 'dark'>('ultracoach-theme', 'dark')

// Runners page tab
export const runnersPageTabAtom = atom<'connected' | 'discover'>('connected')

// Loading states
export const loadingStatesAtom = atom({
  workouts: false,
  trainingPlans: false,
  messages: false,
  notifications: false,
  relationships: false,
  strava: false,
  races: false,
})