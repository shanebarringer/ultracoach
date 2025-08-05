import { atom } from 'jotai'
import { atomFamily, atomWithRefresh, atomWithStorage, loadable, unwrap, splitAtom } from 'jotai/utils'

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

// Refreshable training plans atom using atomWithRefresh
export const refreshableTrainingPlansAtom = atomWithRefresh(async () => {
  try {
    console.log('🔄 Fetching training plans...')
    const response = await fetch('/api/training-plans', {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      console.error(`❌ Failed to fetch training plans: ${response.status} ${response.statusText}`)
      throw new Error(`Failed to fetch training plans: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('✅ Training plans fetched:', data.trainingPlans?.length || 0)
    return data.trainingPlans || []
  } catch (error) {
    console.error('❌ Error fetching training plans:', error)
    return []
  }
})

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
  runnerId: '',
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
      },
      credentials: 'include', // Ensure cookies are sent with the request
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
      },
      credentials: 'include', // Ensure cookies are sent with the request
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
      },
      credentials: 'include', // Ensure cookies are sent with the request
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
      },
      credentials: 'include', // Ensure cookies are sent with the request
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

// Calendar-specific derived atoms for better performance
export const workoutStatsAtom = atom(get => {
  const workouts = get(filteredWorkoutsAtom) || []

  return {
    total: workouts.length,
    completed: workouts.filter(w => w.status === 'completed').length,
    planned: workouts.filter(w => w.status === 'planned').length,
    skipped: workouts.filter(w => w.status === 'skipped').length,
    plannedDistance: workouts.reduce((sum, w) => sum + (w.planned_distance || 0), 0),
    completedDistance: workouts
      .filter(w => w.status === 'completed')
      .reduce((sum, w) => sum + (w.actual_distance || w.planned_distance || 0), 0),
    avgIntensity:
      workouts.length > 0
        ? workouts.reduce((sum, w) => sum + (w.intensity || 0), 0) / workouts.length
        : 0,
  }
})

export const activeTrainingPlansAtom = atom(get => {
  const plans = get(trainingPlansAtom)
  const showArchived = get(uiStateAtom).showArchived

  return showArchived ? plans : plans.filter(p => !p.archived)
})

export const filteredTrainingPlansAtom = atom(async get => {
  const plans = await get(refreshableTrainingPlansAtom)
  const uiState = get(uiStateAtom)

  // Filter by archived status
  const filtered = uiState.showArchived
    ? plans
    : plans.filter((p: { archived?: boolean }) => !p.archived)

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

// =====================================
// ADVANCED JOTAI PATTERNS - PHASE 1
// =====================================

// 1. Loadable utilities for better async UX (no Suspense needed)
export const workoutLoadableAtom = loadable(asyncWorkoutsAtom)
export const trainingPlansLoadableAtom = loadable(refreshableTrainingPlansAtom)
export const notificationsLoadableAtom = loadable(asyncNotificationsAtom)
export const conversationsLoadableAtom = loadable(asyncConversationsAtom)

// 2. Unwrap utilities for sync fallbacks with defaults
export const workoutsWithFallbackAtom = unwrap(asyncWorkoutsAtom, () => [])
export const notificationsWithFallbackAtom = unwrap(asyncNotificationsAtom, () => [])

// 3. AtomFamily for dynamic message conversations
export const messagesByConversationFamily = atomFamily((conversationId: string) =>
  atomWithRefresh(async (get, { signal }) => {
    const session = get(sessionAtom)
    if (!session) return []

    try {
      const response = await fetch(`/api/messages?recipientId=${conversationId}`, {
        signal,
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`)
      }

      const data = await response.json()
      return data.messages || []
    } catch (error) {
      logger.error(`Error fetching messages for conversation ${conversationId}:`, error)
      return []
    }
  })
)

// 4. Loadable message conversations for better UX
export const messagesByConversationLoadableFamily = atomFamily((conversationId: string) =>
  loadable(messagesByConversationFamily(conversationId))
)

// 5. Action atoms for cleaner API patterns
export const sendMessageActionAtom = atom(
  null,
  async (
    get,
    set,
    payload: {
      recipientId: string
      content: string
      workoutId?: string
    }
  ) => {
    const session = get(sessionAtom) as {
      user: { id: string; name: string; email: string; role: string }
    } | null
    if (!session?.user?.id) throw new Error('No session available')

    const { recipientId, content, workoutId } = payload

    // Create optimistic message
    const optimisticMessage: MessageWithUser = {
      id: `temp-${Date.now()}`,
      conversation_id: '',
      content,
      sender_id: session.user.id,
      recipient_id: recipientId,
      workout_id: workoutId || null,
      read: false,
      created_at: new Date().toISOString(),
      sender: {
        id: session.user.id,
        full_name: session.user.name || 'You',
        email: session.user.email || '',
        role: session.user.role as 'runner' | 'coach',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }

    // Add optimistic message immediately
    set(messagesAtom, prev => [...prev, optimisticMessage])

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, recipientId, workoutId }),
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`)
      }

      const result = await response.json()

      // Replace optimistic with real message
      if (result.message) {
        set(messagesAtom, prev =>
          prev.map(msg =>
            msg.id === optimisticMessage.id
              ? { ...result.message, sender: optimisticMessage.sender }
              : msg
          )
        )
      }

      return true
    } catch (error) {
      // Remove optimistic message on error
      set(messagesAtom, prev => prev.filter(msg => msg.id !== optimisticMessage.id))
      throw error
    }
  }
)

// 6. Refresh action atoms for manual data refetch
export const refreshWorkoutsActionAtom = atom(null, async (get, set) => {
  set(workoutsRefreshTriggerAtom, prev => prev + 1)
})

export const refreshTrainingPlansActionAtom = atom(null, async (get, set) => {
  // Force refresh by incrementing a trigger atom
  set(workoutsRefreshTriggerAtom, prev => prev + 1)
})

// 7. Enhanced derived atoms with better performance
export const activeConversationsAtom = atom(get => {
  const conversations = get(conversationsAtom) || []
  return conversations.filter(conv => conv.unreadCount > 0 || conv.last_message_at)
})

export const conversationStatsAtom = atom(get => {
  const conversations = get(conversationsAtom) || []
  return {
    total: conversations.length,
    unread: conversations.filter(conv => conv.unreadCount > 0).length,
    totalUnreadMessages: conversations.reduce((sum, conv) => sum + conv.unreadCount, 0),
  }
})

// =====================================
// ADVANCED JOTAI PATTERNS - PHASE 2
// Performance Optimizations
// =====================================

// 1. SplitAtom for large lists - Each item gets its own atom
export const messagesAtomsAtom = splitAtom(messagesAtom)
export const workoutsAtomsAtom = splitAtom(workoutsAtom)
export const conversationsAtomsAtom = splitAtom(conversationsAtom)
export const notificationsAtomsAtom = splitAtom(notificationsAtom)

// 2. Split filtered atoms for performance
export const filteredWorkoutsAtomsAtom = splitAtom(filteredWorkoutsAtom)

// 3. Conversation-specific message atoms (for granular performance)
export const conversationMessagesAtomsFamily = atomFamily((conversationId: string) =>
  splitAtom(
    atom(get => {
      const messages = get(messagesAtom) || []
      return messages.filter(message => {
        return (
          (message.sender_id === conversationId || message.recipient_id === conversationId)
        )
      })
    })
  )
)

// 4. Performance-optimized derived atoms
export const messagesByRecipientAtomFamily = atomFamily((recipientId: string) =>
  atom(get => {
    const messages = get(messagesAtom) || []
    return messages.filter(message => 
      message.sender_id === recipientId || message.recipient_id === recipientId
    )
  })
)

// 5. Granular workout atoms for individual workout management
export const workoutAtomFamily = atomFamily((workoutId: string) =>
  atom(
    get => {
      const workouts = get(workoutsAtom) || []
      return workouts.find(w => w.id === workoutId) || null
    },
    (get, set, newWorkout) => {
      if (!newWorkout) return
      set(workoutsAtom, prev => 
        prev.map(w => w.id === workoutId ? { ...w, ...newWorkout } : w)
      )
    }
  )
)

// 6. Optimized stats atoms with memoization
export const workoutStatsByTypeAtom = atom(get => {
  const workouts = get(filteredWorkoutsAtom) || []
  
  // Group by workout type for better performance insights
  const statsByType = workouts.reduce((acc, workout) => {
    const type = workout.planned_type || 'unknown'
    if (!acc[type]) {
      acc[type] = {
        total: 0,
        completed: 0,
        planned: 0,
        totalDistance: 0,
        completedDistance: 0
      }
    }
    
    acc[type].total++
    if (workout.status === 'completed') {
      acc[type].completed++
      acc[type].completedDistance += workout.actual_distance || workout.planned_distance || 0
    }
    if (workout.status === 'planned') {
      acc[type].planned++
    }
    acc[type].totalDistance += workout.planned_distance || 0
    
    return acc
  }, {} as Record<string, {
    total: number
    completed: number
    planned: number
    totalDistance: number
    completedDistance: number
  }>)
  
  return statsByType
})

// 7. Lazy-loaded atoms for expensive computations
export const expensiveWorkoutAnalyticsAtom = atom(async get => {
  const workouts = get(filteredWorkoutsAtom) || []
  
  // Simulate expensive computation
  await new Promise(resolve => setTimeout(resolve, 100))
  
  return {
    totalWorkouts: workouts.length,
    avgWeeklyDistance: workouts.length > 0 
      ? workouts.reduce((sum, w) => sum + (w.planned_distance || 0), 0) / Math.max(workouts.length / 7, 1)
      : 0,
    consistency: workouts.length > 0
      ? workouts.filter(w => w.status === 'completed').length / workouts.length
      : 0,
    lastWorkoutDate: workouts.length > 0 
      ? Math.max(...workouts.map(w => new Date(w.date || '').getTime()))
      : null
  }
})
