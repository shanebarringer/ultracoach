import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

// Types
export interface Notification {
  id: string
  user_id: string
  type: 'workout' | 'message' | 'comment'
  title: string
  content: string
  read: boolean
  created_at: string
}

export interface Workout {
  id: string
  training_plan_id: string
  date: string
  type: string
  distance?: number
  duration?: number
  description?: string
  status: 'planned' | 'completed' | 'skipped'
  notes?: string
  created_at: string
  updated_at: string
}

export interface TrainingPlan {
  id: string
  title: string
  description?: string
  coach_id: string
  runner_id: string
  archived: boolean
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  full_name: string
  role: 'coach' | 'runner'
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
}

export interface Conversation {
  id: string
  coach_id: string
  runner_id: string
  created_at: string
  updated_at: string
}

// Core application atoms
export const notificationsAtom = atom<Notification[]>([])
export const unreadNotificationsCountAtom = atom<number>(0)

export const workoutsAtom = atom<Workout[]>([])
export const trainingPlansAtom = atom<TrainingPlan[]>([])
export const runnersAtom = atom<User[]>([])

export const messagesAtom = atom<Message[]>([])
export const conversationsAtom = atom<Conversation[]>([])

// UI state atoms
export const loadingStatesAtom = atomWithStorage('loadingStates', {
  workouts: false,
  trainingPlans: false,
  notifications: false,
  messages: false,
  runners: false,
})

export const uiStateAtom = atom({
  showCreateTrainingPlan: false,
  showLogWorkout: false,
  showNewMessage: false,
  selectedWorkout: null as Workout | null,
  selectedRunner: null as User | null,
  workoutFilter: 'all' as 'all' | 'planned' | 'completed' | 'skipped',
  showArchived: false,
  currentWeek: new Date(),
})

// Derived atoms
export const unreadNotificationsAtom = atom((get) => {
  const notifications = get(notificationsAtom)
  return notifications.filter(n => !n.read)
})

export const filteredWorkoutsAtom = atom((get) => {
  const workouts = get(workoutsAtom)
  const filter = get(uiStateAtom).workoutFilter
  
  if (filter === 'all') return workouts
  return workouts.filter(w => w.status === filter)
})

export const activeTrainingPlansAtom = atom((get) => {
  const plans = get(trainingPlansAtom)
  const showArchived = get(uiStateAtom).showArchived
  
  return showArchived ? plans : plans.filter(p => !p.archived)
})

// Typing status atoms
export const typingStatusAtom = atom({
  isTyping: false,
  isRecipientTyping: false,
  conversationId: null as string | null,
})