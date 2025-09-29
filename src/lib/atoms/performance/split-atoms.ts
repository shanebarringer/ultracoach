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

// Provide a stable key extractor so sub-atom identity is preserved on reorders
const itemKey = <T extends { id: string }>(item: T) => item.id

// Split atoms for efficient list operations
export const workoutsSplitAtom = withDebugLabel(
  splitAtom(workoutsBaseAtom, itemKey),
  'workoutsSplitAtom'
)
export const conversationsSplitAtom = withDebugLabel(
  splitAtom(conversationsBaseAtom, itemKey),
  'conversationsSplitAtom'
)
export const notificationsSplitAtom = withDebugLabel(
  splitAtom(notificationsBaseAtom, itemKey),
  'notificationsSplitAtom'
)

// Helper atoms for managing split atoms
export const addWorkoutAtom = withDebugLabel(
  atom(null, (_get, set, workout: Workout) => {
    set(workoutsBaseAtom, prev => {
      const i = prev.findIndex(w => w.id === workout.id)
      return i === -1 ? [...prev, workout] : prev.map(w => (w.id === workout.id ? workout : w))
    })
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
    set(workoutsBaseAtom, prev => {
      let changed = false
      const keys = Object.keys(updates) as (keyof Workout)[]
      const next = prev.map(w => {
        if (w.id !== id) return w
        const merged = { ...w, ...updates }
        if (!changed) {
          changed = keys.some(k => merged[k] !== w[k])
        }
        return changed ? (merged as Workout) : w
      })
      return changed ? next : prev
    })
  }),
  'updateWorkoutAtom'
)

// Jotai Devtools debug labels are applied via withDebugLabel at instantiation
