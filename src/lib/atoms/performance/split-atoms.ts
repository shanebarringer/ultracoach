// SplitAtom patterns for efficient list operations
import { atom } from 'jotai'
import { splitAtom } from 'jotai/utils'

import { withDebugLabel } from '@/lib/atoms/utils'
import type { ConversationWithUser, Notification, Workout } from '@/lib/supabase'

// Base atoms that will be split
const workoutsBaseAtom = withDebugLabel(atom<Workout[]>([]), 'split/workoutsBase')
const conversationsBaseAtom = withDebugLabel(
  atom<ConversationWithUser[]>([]),
  'split/conversationsBase'
)
const notificationsBaseAtom = withDebugLabel(atom<Notification[]>([]), 'split/notificationsBase')

// Split atoms for efficient list operations
export const workoutsSplitAtom = withDebugLabel(splitAtom(workoutsBaseAtom), 'split/workoutsSplit')
export const conversationsSplitAtom = withDebugLabel(
  splitAtom(conversationsBaseAtom),
  'split/conversationsSplit'
)
export const notificationsSplitAtom = withDebugLabel(
  splitAtom(notificationsBaseAtom),
  'split/notificationsSplit'
)

// Helper atoms for managing split atoms
export const addWorkoutAtom = withDebugLabel(
  atom(null, (_get, set, workout: Workout) => {
    set(workoutsBaseAtom, prev => [...prev, workout])
  }),
  'split/addWorkoutAction'
)

export const removeWorkoutAtom = withDebugLabel(
  atom(null, (_get, set, workoutId: string) => {
    set(workoutsBaseAtom, prev => prev.filter(w => w.id !== workoutId))
  }),
  'split/removeWorkoutAction'
)

export const updateWorkoutAtom = withDebugLabel(
  atom(null, (_get, set, { id, updates }: { id: string; updates: Partial<Workout> }) => {
    set(workoutsBaseAtom, prev => prev.map(w => (w.id === id ? { ...w, ...updates } : w)))
  }),
  'split/updateWorkoutAction'
)

// Jotai Devtools debug labels are applied via withDebugLabel at instantiation
