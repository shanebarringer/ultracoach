import { atom } from 'jotai'

// Types
export interface Notification {
  id: string
  user_id: string
  type: 'workout' | 'message' | 'comment'
  title: string
  message: string // was 'content', now matches supabase
  read: boolean
  created_at: string
}

export interface Workout {
  id: string
  training_plan_id: string
  date: string
  planned_distance: number
  planned_duration: number
  planned_type: string
  actual_distance?: number
  actual_duration?: number
  actual_type?: string
  injury_notes?: string
  workout_notes?: string
  coach_feedback?: string
  status: 'planned' | 'completed' | 'skipped'
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
  recipient_id: string
  content: string
  read: boolean
  created_at: string
}

export interface MessageWithUser extends Message {
  sender: User
}

export interface Conversation {
  id: string
  coach_id: string
  runner_id: string
  created_at: string
  updated_at: string
}

export interface ConversationWithUser {
  user: User
  lastMessage?: Message
  unreadCount: number
}

// Core application atoms
export const notificationsAtom = atom<Notification[]>([])
export const unreadNotificationsCountAtom = atom<number>(0)

export const workoutsAtom = atom<Workout[]>([])
export const trainingPlansAtom = atom<TrainingPlan[]>([])
export const runnersAtom = atom<User[]>([])

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

export const chatUiStateAtom = atom({
  hasInitiallyLoadedMessages: false,
  hasInitiallyLoadedConversations: false,
  currentRecipientId: null as string | null,
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