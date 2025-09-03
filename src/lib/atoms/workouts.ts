// Workout management atoms
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import type { Workout } from '@/lib/supabase'

// Core workout atoms
export const workoutsAtom = atom<Workout[]>([])
export const workoutsLoadingAtom = atom(false)
export const workoutsErrorAtom = atom<string | null>(null)
export const workoutsRefreshTriggerAtom = atom(0)

// Async workout atom with suspense support
export const asyncWorkoutsAtom = atom(async () => {
  // This would be populated with actual async data fetching
  return [] as Workout[]
})

// Selected workout atoms
export const selectedWorkoutAtom = atom<Workout | null>(null)
export const selectedWorkoutIdAtom = atom<string | null>(null)

// Workout filtering atoms
export const workoutSearchTermAtom = atomWithStorage('workoutSearchTerm', '')
export const workoutTypeFilterAtom = atomWithStorage('workoutTypeFilter', 'all')
export const workoutStatusFilterAtom = atomWithStorage('workoutStatusFilter', 'all')
export const workoutSortByAtom = atomWithStorage<'date-desc' | 'date-asc' | 'type' | 'status' | 'distance'>(
  'workoutSortBy',
  'date-desc'
)
export const workoutViewModeAtom = atomWithStorage<'grid' | 'list'>('workoutViewMode', 'grid')
export const workoutQuickFilterAtom = atomWithStorage<'all' | 'today' | 'this-week' | 'completed' | 'planned'>(
  'workoutQuickFilter',
  'all'
)
export const workoutShowAdvancedFiltersAtom = atomWithStorage('workoutShowAdvancedFilters', false)

// Workout form atoms
export const workoutFormDataAtom = atom<Partial<Workout>>({})
export const isEditingWorkoutAtom = atom(false)
export const editingWorkoutIdAtom = atom<string | null>(null)

// Debouncing atoms
export const messagesFetchTimestampAtom = atom<number>(0)
export const workoutLinkSelectorSearchAtom = atom<string>('')

// Typing status debouncing atoms
export const typingTimeoutRefsAtom = atom<Record<string, NodeJS.Timeout | null>>({})
export const sendTypingTimeoutRefsAtom = atom<Record<string, NodeJS.Timeout | null>>({})

// Workout lookup map for quick access
export const workoutLookupMapAtom = atom(get => {
  const workouts = get(workoutsAtom)
  return new Map(workouts.map(w => [w.id, w]))
})

// Workout diff modal atoms
export const selectedMatchAtom = atom<Record<string, unknown> | null>(null)
export const showWorkoutDiffModalAtom = atom(false)

// Advanced workout actions atoms
export const workoutActionsAtom = atom({
  type: '',
  payload: null as Record<string, unknown> | null,
})

export const optimisticOperationAtom = atom({
  type: '',
  action: '',
  payload: null as Record<string, unknown> | null,
})

export const errorRecoveryAtom = atom({
  type: '',
  message: '',
  context: null as Record<string, unknown> | null,
})

export const persistedStateAtom = atom({
  lastSync: new Date().toISOString(),
  uiPreferences: {},
})

export const workoutAnalyticsAtom = atom({
  completionRate: 0,
  streak: {
    current: 0,
    longest: 0,
  },
  thisWeek: {
    planned: 0,
    completed: 0,
  },
  thisMonth: {
    planned: 0,
    completed: 0,
  },
})