// SplitAtom patterns for efficient list operations
import { atom } from 'jotai'
import { splitAtom } from 'jotai/utils'

import type { ConversationWithUser, Notification, Workout } from '@/lib/supabase'

// Base atoms that will be split
const workoutsBaseAtom = atom<Workout[]>([])
workoutsBaseAtom.debugLabel = 'workoutsBaseAtom'
const conversationsBaseAtom = atom<ConversationWithUser[]>([])
conversationsBaseAtom.debugLabel = 'conversationsBaseAtom'
const notificationsBaseAtom = atom<Notification[]>([])
notificationsBaseAtom.debugLabel = 'notificationsBaseAtom'

// Split atoms for efficient list operations
export const workoutsSplitAtom = splitAtom(workoutsBaseAtom)
workoutsSplitAtom.debugLabel = 'workoutsSplitAtom'
export const conversationsSplitAtom = splitAtom(conversationsBaseAtom)
conversationsSplitAtom.debugLabel = 'conversationsSplitAtom'
export const notificationsSplitAtom = splitAtom(notificationsBaseAtom)
notificationsSplitAtom.debugLabel = 'notificationsSplitAtom'

// Helper atoms for managing split atoms
export const addWorkoutAtom = atom(null, (_get, set, workout: Workout) => {
  set(workoutsBaseAtom, prev => [...prev, workout])
})
addWorkoutAtom.debugLabel = 'addWorkoutAtom'

export const removeWorkoutAtom = atom(null, (_get, set, workoutId: string) => {
  set(workoutsBaseAtom, prev => prev.filter(w => w.id !== workoutId))
})
removeWorkoutAtom.debugLabel = 'removeWorkoutAtom'

export const updateWorkoutAtom = atom(
  null,
  (_get, set, { id, updates }: { id: string; updates: Partial<Workout> }) => {
    set(workoutsBaseAtom, prev => prev.map(w => (w.id === id ? { ...w, ...updates } : w)))
  }
)
updateWorkoutAtom.debugLabel = 'updateWorkoutAtom'
