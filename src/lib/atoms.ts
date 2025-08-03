import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import type { User as BetterAuthUser, Session } from './better-auth-client'
import { createLogger } from './logger'
import type {
  ConversationWithUser,
  MessageWithUser,
  Notification,
  PlanTemplate,
  Race,
  TrainingPlan,
  User,
  Workout,
} from './supabase'

// Authentication atoms
export const sessionAtom = atom<Record<string, unknown> | null>(null)
export const userAtom = atom<Record<string, unknown> | null>(null)
export const authLoadingAtom = atom<boolean>(true)

// Better Auth state atom
export const authStateAtom = atom({
  user: null as BetterAuthUser | null,
  session: null as Session | null,
  loading: true,
  error: null as string | null,
})

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
  relationships: false,
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
  loading: false,
  error: '',
})

export const workoutLogFormAtom = atom({
  actualType: '',
  actualDistance: '',
  actualDuration: '',
  workoutNotes: '',
  injuryNotes: '',
  status: '',
  category: '' as
    | 'easy'
    | 'tempo'
    | 'interval'
    | 'long_run'
    | 'race_simulation'
    | 'recovery'
    | 'strength'
    | 'cross_training'
    | 'rest'
    | '',
  intensity: '',
  terrain: '' as 'road' | 'trail' | 'track' | 'treadmill' | '',
  elevationGain: '',
  loading: false,
  error: '',
})

export const signInFormAtom = atom({
  email: '',
  password: '',
  errors: { email: '', password: '' },
  loading: false,
})

export const signUpFormAtom = atom({
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'runner' as 'coach' | 'runner',
  errors: {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
  },
  loading: false,
})

export const chatUiStateAtom = atom({
  hasInitiallyLoadedMessages: false,
  hasInitiallyLoadedConversations: false,
  currentRecipientId: null as string | null,
  sending: false,
  filterWorkoutId: null as string | null,
  showNewMessage: false,
})

export const messageInputAtom = atom({
  message: '',
  linkedWorkout: null as Workout | null,
  linkType: 'reference',
  showWorkoutSelector: false,
})

export const newMessageModalAtom = atom({
  availableUsers: [] as User[],
  loading: true,
  searchTerm: '',
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
  useSuspense: false, // Toggle for demonstrating Suspense vs traditional loading
})

// Async atoms for data fetching with Suspense support
const logger = createLogger('AsyncAtoms')

// Refresh trigger atom for forcing data refetch
export const workoutsRefreshTriggerAtom = atom(0)

export const asyncWorkoutsAtom = atom(async get => {
  const session = get(sessionAtom)
  const refreshTrigger = get(workoutsRefreshTriggerAtom) // Dependency for invalidation
  // refreshTrigger is used as a dependency to force atom re-evaluation
  void refreshTrigger // Silence ESLint warning
  if (!session) throw new Error('No session available')

  try {
    const response = await fetch('/api/workouts', {
      headers: {
        'Content-Type': 'application/json',
        // Better Auth uses cookie-based authentication automatically
        // Authorization headers would be added here if tokens were available
      },
    })

    if (!response.ok) {
      logger.error(`Failed to fetch workouts: ${response.status} ${response.statusText}`)
      throw new Error(`Failed to fetch workouts: ${response.statusText}`)
    }

    const data = await response.json()
    logger.debug('Successfully fetched workouts', { count: data.workouts.length })
    return data.workouts
  } catch (error) {
    logger.error('Error fetching workouts:', error)
    throw error
  }
})

export const asyncTrainingPlansAtom = atom(async get => {
  const session = get(sessionAtom)
  if (!session) throw new Error('No session available')

  try {
    const response = await fetch('/api/training-plans', {
      headers: {
        'Content-Type': 'application/json',
        // Better Auth uses cookie-based authentication automatically
        // Authorization headers would be added here if tokens were available
      },
    })

    if (!response.ok) {
      logger.error(`Failed to fetch training plans: ${response.status} ${response.statusText}`)
      throw new Error(`Failed to fetch training plans: ${response.statusText}`)
    }

    const data = await response.json()
    logger.debug('Successfully fetched training plans', { count: data.trainingPlans.length })
    return data.trainingPlans
  } catch (error) {
    logger.error('Error fetching training plans:', error)
    throw error
  }
})

export const asyncNotificationsAtom = atom(async get => {
  const session = get(sessionAtom)
  if (!session) throw new Error('No session available')

  try {
    const response = await fetch('/api/notifications', {
      headers: {
        'Content-Type': 'application/json',
        // Better Auth uses cookie-based authentication automatically
        // Authorization headers would be added here if tokens were available
      },
    })

    if (!response.ok) {
      logger.error(`Failed to fetch notifications: ${response.status} ${response.statusText}`)
      throw new Error(`Failed to fetch notifications: ${response.statusText}`)
    }

    const data = await response.json()
    logger.debug('Successfully fetched notifications', { count: data.length })
    return data
  } catch (error) {
    logger.error('Error fetching notifications:', error)
    throw error
  }
})

export const asyncConversationsAtom = atom(async get => {
  const session = get(sessionAtom)
  if (!session) throw new Error('No session available')

  try {
    const response = await fetch('/api/conversations', {
      headers: {
        'Content-Type': 'application/json',
        // Better Auth uses cookie-based authentication automatically
        // Authorization headers would be added here if tokens were available
      },
    })

    if (!response.ok) {
      logger.error(`Failed to fetch conversations: ${response.status} ${response.statusText}`)
      throw new Error(`Failed to fetch conversations: ${response.statusText}`)
    }

    const data = await response.json()
    const fetchedConversations = data.conversations || []

    // Map API response to ConversationWithUser structure - access session from user object
    const user = session as { user: { id: string; email: string; role: string; name: string } }
    const mappedConversations = fetchedConversations.map(
      (conv: {
        user: User
        lastMessage?: { conversation_id: string; created_at: string }
        unreadCount?: number
      }) => ({
        id: conv.lastMessage?.conversation_id || '',
        sender: {
          id: user.user.id,
          email: user.user.email,
          role: user.user.role,
          full_name: user.user.name || '',
          created_at: '',
          updated_at: '',
        },
        recipient: conv.user,
        sender_id: user.user.id,
        recipient_id: conv.user.id,
        last_message_at: conv.lastMessage?.created_at || '',
        created_at: conv.lastMessage?.created_at || '',
        unreadCount: conv.unreadCount || 0,
      })
    )

    logger.debug('Successfully fetched conversations', { count: mappedConversations.length })
    return mappedConversations
  } catch (error) {
    logger.error('Error fetching conversations:', error)
    throw error
  }
})

// Derived atoms
export const unreadNotificationsAtom = atom(get => {
  const notifications = get(notificationsAtom)
  return notifications.filter(n => !n.read)
})

export const filteredWorkoutsAtom = atom(get => {
  const workouts = get(workoutsAtom)
  const filter = get(uiStateAtom).workoutFilter

  if (filter === 'all') return workouts
  return workouts.filter(w => w.status === filter)
})

export const activeTrainingPlansAtom = atom(get => {
  const plans = get(trainingPlansAtom)
  const showArchived = get(uiStateAtom).showArchived

  return showArchived ? plans : plans.filter(p => !p.archived)
})

export const filteredTrainingPlansAtom = atom(get => {
  const plans = get(trainingPlansAtom)
  const uiState = get(uiStateAtom)

  // Filter by archived status
  const filtered = uiState.showArchived ? plans : plans.filter(p => !p.archived)

  // Add additional filters here as needed
  // Could filter by plan type, status, etc.

  return filtered
})

// Typing status atoms
export const typingStatusAtom = atom<
  Record<
    string,
    {
      isTyping: boolean
      isRecipientTyping: boolean
      lastTypingUpdate: number
    }
  >
>({})

// Derived chat atoms
export const currentConversationMessagesAtom = atom(get => {
  const messages = get(messagesAtom)
  const currentConversationId = get(currentConversationIdAtom)

  if (!currentConversationId) return []

  return messages.filter(message => {
    const senderId = message.sender_id
    const recipientId = message.recipient_id
    return senderId === currentConversationId || recipientId === currentConversationId
  })
})

export const totalUnreadMessagesAtom = atom(get => {
  const conversations = get(conversationsAtom)
  return conversations.reduce((total, conv) => total + conv.unreadCount, 0)
})
