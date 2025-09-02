// SplitAtom patterns for efficient list operations
import { atom } from 'jotai'
import { splitAtom } from 'jotai/utils'

import type { Workout, ConversationWithUser, Notification } from '@/lib/supabase'

// Base atoms that will be split
const workoutsBaseAtom = atom<Workout[]>([])
const conversationsBaseAtom = atom<ConversationWithUser[]>([])
const notificationsBaseAtom = atom<Notification[]>([])

// Split atoms for efficient list operations
export const workoutsSplitAtom = splitAtom(workoutsBaseAtom)
export const conversationsSplitAtom = splitAtom(conversationsBaseAtom)
export const notificationsSplitAtom = splitAtom(notificationsBaseAtom)

// Helper atoms for managing split atoms
export const addWorkoutAtom = atom(
  null,
  (_get, set, workout: Workout) => {
    set(workoutsBaseAtom, prev => [...prev, workout])
  }
)

export const removeWorkoutAtom = atom(
  null,
  (_get, set, workoutId: string) => {
    set(workoutsBaseAtom, prev => prev.filter(w => w.id !== workoutId))
  }
)

export const updateWorkoutAtom = atom(
  null,
  (_get, set, { id, updates }: { id: string; updates: Partial<Workout> }) => {
    set(workoutsBaseAtom, prev =>
      prev.map(w => (w.id === id ? { ...w, ...updates } : w))
    )
  }
)