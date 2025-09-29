// SplitAtom patterns for efficient list operations
import { atom } from 'jotai'
import { splitAtom } from 'jotai/utils'

import { withDebugLabel } from '@/lib/atoms/utils'
import type { ConversationWithUser, Notification, Workout } from '@/lib/supabase'

// Base atoms that will be split
const workoutsBaseAtom = withDebugLabel(atom<Workout[]>([]), 'workoutsBaseAtom')
const conversationsBaseAtom = withDebugLabel(
  atom<ConversationWithUser[]>([]),
  'conversationsBaseAtom'
)
const notificationsBaseAtom = withDebugLabel(atom<Notification[]>([]), 'notificationsBaseAtom')

// Split atoms for efficient list operations
export const workoutsSplitAtom = withDebugLabel(splitAtom(workoutsBaseAtom), 'workoutsSplitAtom')
export const conversationsSplitAtom = withDebugLabel(
  splitAtom(conversationsBaseAtom),
  'conversationsSplitAtom'
)
export const notificationsSplitAtom = withDebugLabel(
  splitAtom(notificationsBaseAtom),
  'notificationsSplitAtom'
)

// Helper atoms for managing split atoms
export const addWorkoutAtom = withDebugLabel(
  atom(null, (_get, set, workout: Workout) => {
    set(workoutsBaseAtom, prev => [...prev, workout])
  }),
  'addWorkoutAtom'
)

export const removeWorkoutAtom = withDebugLabel(
  atom(null, (_get, set, workoutId: string) => {
    set(workoutsBaseAtom, prev => prev.filter(w => w.id !== workoutId))
  }),
  'removeWorkoutAtom'
)

export const updateWorkoutAtom = withDebugLabel(
  atom(null, (_get, set, { id, updates }: { id: string; updates: Partial<Workout> }) => {
    set(workoutsBaseAtom, prev => prev.map(w => (w.id === id ? { ...w, ...updates } : w)))
  }),
  'updateWorkoutAtom'
)

// Jotai Devtools debug labels are applied via withDebugLabel at instantiation
