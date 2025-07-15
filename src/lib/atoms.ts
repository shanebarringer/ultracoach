import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type { Notification, Workout, TrainingPlan, User, Race, PlanTemplate, MessageWithUser, ConversationWithUser } from './supabase'

// Core application atoms
export const notificationsAtom = atom<Notification[]>([])
export const unreadNotificationsCountAtom = atom<number>(0)

export const workoutsAtom = atom<Workout[]>([])
export const trainingPlansAtom = atom<TrainingPlan[]>([])
export const runnersAtom = atom<User[]>([])
export const racesAtom = atom<Race[]>([])
export const planTemplatesAtom = atom<PlanTemplate[]>([])

// Chat atoms
export const messagesAtom = atom<MessageWithUser[]>([])
export const conversationsAtom = atom<ConversationWithUser[]>([])
export const currentConversationIdAtom = atom<string | null>(null)

// UI state atoms - Don't persist loading states to avoid stuck spinners
export const loadingStatesAtom = atom({
  workouts: false,
  trainingPlans: false,
  notifications: false,
  messages: false,
  conversations: false,
  runners: false,
})

// Form Atoms
export const createTrainingPlanFormAtom = atom({
  title: '',
  description: '',
  runnerEmail: '',
  race_id: null as string | null,
  goal_type: null as 'completion' | 'time' | 'placement' | null,
  plan_type: null as 'race_specific' | 'base_building' | 'bridge' | 'recovery' | null,
  targetRaceDate: '',
  targetRaceDistance: '',
  template_id: null as string | null,
})

export const workoutLogFormAtom = atom({
  actualType: '',
  actualDistance: '',
  actualDuration: '',
  workoutNotes: '',
  injuryNotes: '',
  status: '',
  category: '' as 'easy' | 'tempo' | 'interval' | 'long_run' | 'race_simulation' | 'recovery' | 'strength' | 'cross_training' | 'rest' | '',
  intensity: '',
  terrain: '' as 'road' | 'trail' | 'track' | 'treadmill' | '',
  elevationGain: '',
})

export const chatUiStateAtom = atom({
  hasInitiallyLoadedMessages: false,
  hasInitiallyLoadedConversations: false,
  currentRecipientId: null as string | null,
})

export const themeModeAtom = atomWithStorage<'light' | 'dark'>('ultracoach-theme', 'dark')

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

export const filteredTrainingPlansAtom = atom((get) => {
  const plans = get(trainingPlansAtom)
  const uiState = get(uiStateAtom)
  
  // Filter by archived status
  const filtered = uiState.showArchived ? plans : plans.filter(p => !p.archived)
  
  // Add additional filters here as needed
  // Could filter by plan type, status, etc.
  
  return filtered
})

// Typing status atoms
export const typingStatusAtom = atom<Record<string, {
  isTyping: boolean
  isRecipientTyping: boolean
  lastTypingUpdate: number
}>>({})

// Derived chat atoms
export const currentConversationMessagesAtom = atom((get) => {
  const messages = get(messagesAtom)
  const currentConversationId = get(currentConversationIdAtom)
  
  if (!currentConversationId) return []
  
  return messages.filter(message => {
    const senderId = message.sender_id
    const recipientId = message.recipient_id
    return senderId === currentConversationId || recipientId === currentConversationId
  })
})

export const totalUnreadMessagesAtom = atom((get) => {
  const conversations = get(conversationsAtom)
  return conversations.reduce((total, conv) => total + conv.unreadCount, 0)
})