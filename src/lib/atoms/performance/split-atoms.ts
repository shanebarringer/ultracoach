// SplitAtom patterns for efficient list operations
import { atom } from 'jotai'
import { splitAtom } from 'jotai/utils'

import type { ConversationWithUser, Notification, Workout } from '@/lib/supabase'

import { withDebugLabel } from '../utils'

// Base atoms that will be split
const workoutsBaseAtom = atom<Workout[]>([])
const conversationsBaseAtom = atom<ConversationWithUser[]>([])
const notificationsBaseAtom = atom<Notification[]>([])

// Split atoms for efficient list operations
export const workoutsSplitAtom = splitAtom(workoutsBaseAtom)
export const conversationsSplitAtom = splitAtom(conversationsBaseAtom)
export const notificationsSplitAtom = splitAtom(notificationsBaseAtom)

// Helper atoms for managing split atoms
export const addWorkoutAtom = atom(null, (_get, set, workout: Workout) => {
  set(workoutsBaseAtom, prev => [...prev, workout])
})

export const removeWorkoutAtom = atom(null, (_get, set, workoutId: string) => {
  set(workoutsBaseAtom, prev => prev.filter(w => w.id !== workoutId))
})

export const updateWorkoutAtom = atom(
  null,
  (_get, set, { id, updates }: { id: string; updates: Partial<Workout> }) => {
    set(workoutsBaseAtom, prev => prev.map(w => (w.id === id ? { ...w, ...updates } : w)))
  }
)

// Jotai Devtools debug labels
// Base atoms (module-local)
withDebugLabel(workoutsBaseAtom, 'split/workoutsBase')
withDebugLabel(conversationsBaseAtom, 'split/conversationsBase')
withDebugLabel(notificationsBaseAtom, 'split/notificationsBase')

// Exported split and helper atoms
withDebugLabel(workoutsSplitAtom, 'split/workoutsSplit')
withDebugLabel(conversationsSplitAtom, 'split/conversationsSplit')
withDebugLabel(notificationsSplitAtom, 'split/notificationsSplit')
withDebugLabel(addWorkoutAtom, 'split/addWorkoutAction')
withDebugLabel(removeWorkoutAtom, 'split/removeWorkoutAction')
withDebugLabel(updateWorkoutAtom, 'split/updateWorkoutAction')
