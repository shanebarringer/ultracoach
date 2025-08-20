import { atom } from 'jotai'
import {
  atomFamily,
  atomWithRefresh,
  atomWithStorage,
  loadable,
  splitAtom,
  unwrap,
} from 'jotai/utils'

import type { RelationshipData } from '@/types/relationships'
import type { StravaActivity, StravaConnection } from '@/types/strava'
// ============================================================================
// Workout Matching & Diffing Atoms
// ============================================================================

import type { WorkoutMatch } from '@/utils/workout-matching'

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

// Environment check - prevents atoms from executing during build/SSR
const isBrowser = typeof window !== 'undefined'

// Authentication atoms - Better Auth session structure (flexible to match actual API)
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
export const planTemplatesAtom = atom<PlanTemplate[]>([])

// Races atom for coach races management
export const racesAtom = atomWithRefresh(async () => {
  // Only execute on client-side to prevent build-time fetch errors
  if (!isBrowser) return []

  const logger = createLogger('RacesAtom')

  try {
    logger.debug('Fetching races...')
    const response = await fetch('/api/races', {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      logger.error(`Failed to fetch races: ${response.status} ${response.statusText}`)
      throw new Error(`Failed to fetch races: ${response.statusText}`)
    }

    const data = await response.json()
    logger.info('Races fetched successfully', { count: data.races?.length || 0 })
    return data.races || []
  } catch (error) {
    logger.error('Error fetching races:', error)
    return []
  }
})

// Selected race atom for race management UI
export const selectedRaceAtom = atom<Race | null>(null)

// Connected runners atom (for coaches to see their connected runners with stats)
export const connectedRunnersAtom = atomWithRefresh(async () => {
  // Only execute on client-side to prevent build-time fetch errors
  if (!isBrowser) return []

  const logger = createLogger('ConnectedRunnersAtom')
  try {
    logger.debug('Fetching connected runners...')
    const response = await fetch('/api/runners', {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      logger.error(`Failed to fetch connected runners: ${response.status} ${response.statusText}`)
      throw new Error(`Failed to fetch connected runners: ${response.statusText}`)
    }

    const data = await response.json()
    logger.info('Connected runners fetched successfully', { count: data.runners?.length || 0 })
    return data.runners || []
  } catch (error) {
    logger.error('Error fetching connected runners:', error)
    return []
  }
})

// Available runners atom (for coaches to discover new runners to connect with)
export const availableRunnersAtom = atomWithRefresh(async () => {
  // Only execute on client-side to prevent build-time fetch errors
  if (!isBrowser) return []

  const logger = createLogger('AvailableRunnersAtom')
  try {
    logger.debug('Fetching available runners...')
    const response = await fetch('/api/runners/available', {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      logger.error(`Failed to fetch available runners: ${response.status} ${response.statusText}`)
      throw new Error(`Failed to fetch available runners: ${response.statusText}`)
    }

    const data = await response.json()
    logger.info('Available runners fetched successfully', { count: data.runners?.length || 0 })
    return data.runners || []
  } catch (error) {
    logger.error('Error fetching available runners:', error)
    return []
  }
})

// Refreshable training plans atom using atomWithRefresh
export const refreshableTrainingPlansAtom = atomWithRefresh(async () => {
  // Only execute on client-side to prevent build-time fetch errors
  if (!isBrowser) return []

  const logger = createLogger('TrainingPlansAtom')
  try {
    logger.debug('Fetching training plans...')
    const response = await fetch('/api/training-plans', {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      logger.error(`Failed to fetch training plans: ${response.status} ${response.statusText}`)
      throw new Error(`Failed to fetch training plans: ${response.statusText}`)
    }

    const data = await response.json()
    logger.info('Training plans fetched successfully', { count: data.trainingPlans?.length || 0 })
    return data.trainingPlans || []
  } catch (error) {
    logger.error('Error fetching training plans:', error)
    return []
  }
})

// Available coaches atom for runner-coach connections
export const availableCoachesAtom = atomWithRefresh(async () => {
  // Only execute on client-side to prevent build-time fetch errors
  if (!isBrowser) return []

  const logger = createLogger('AvailableCoachesAtom')

  try {
    logger.debug('Fetching available coaches...')
    const response = await fetch('/api/coaches/available', {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      logger.error(`Failed to fetch available coaches: ${response.status} ${response.statusText}`)
      throw new Error(`Failed to fetch available coaches: ${response.statusText}`)
    }

    const data = await response.json()
    logger.info('Available coaches fetched successfully', { count: data.coaches?.length || 0 })
    return data.coaches || []
  } catch (error) {
    logger.error('Error fetching available coaches:', error)
    return []
  }
})

// Relationships atom for coach-runner relationships management
export const relationshipsAtom = atom<RelationshipData[]>([])

// Loadable atom for fetching relationships
export const relationshipsLoadableAtom = loadable(
  atom(async _get => {
    // Only execute on client-side to prevent build-time fetch errors
    if (!isBrowser) return []

    const logger = createLogger('RelationshipsLoadable')

    try {
      logger.debug('Fetching relationships...')
      const response = await fetch('/api/coach-runners', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        logger.error(`Failed to fetch relationships: ${response.status} ${response.statusText}`)
        throw new Error(`Failed to fetch relationships: ${response.statusText}`)
      }

      const data = await response.json()
      logger.info('Relationships fetched successfully', { count: data.relationships?.length || 0 })
      return data.relationships || []
    } catch (error) {
      logger.error('Error fetching relationships:', error)
      return []
    }
  })
)

// Chat atoms
export const messagesAtom = atom<MessageWithUser[]>([])
export const conversationsAtom = atom<ConversationWithUser[]>([])
export const currentConversationIdAtom = atom<string | null>(null)

// Offline message queue atom
interface OfflineMessage {
  id: string
  recipientId: string
  content: string
  workoutId?: string
  contextType?: string
  timestamp: number
  retryCount: number
}

export const offlineMessageQueueAtom = atomWithStorage<OfflineMessage[]>('offline-messages', [])

// Derived atom to sync recipient selection with chat UI state
export const selectedRecipientAtom = atom(
  get => get(chatUiStateAtom).currentRecipientId,
  (get, set, recipientId: string | null) => {
    set(chatUiStateAtom, prev => ({
      ...prev,
      currentRecipientId: recipientId,
      selectedConversationId: recipientId, // Sync conversation selection
    }))
    set(currentConversationIdAtom, recipientId)
  }
)

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
  selectedConversationId: null as string | null,
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

// Runners page active tab atom
export const runnersPageTabAtom = atom<'connected' | 'discover'>('connected')

// RunnerSelector search and connecting states
export const runnerSearchTermAtom = atom<string>('')
export const connectingRunnerIdsAtom = atom<Set<string>>(new Set<string>())

// Debouncing atoms for hooks and performance optimization
export const messagesFetchTimestampAtom = atom<number>(0)
export const workoutLinkSelectorSearchAtom = atom<string>('')

// Typing status debouncing atoms
export const typingTimeoutRefsAtom = atom<Record<string, NodeJS.Timeout | null>>({})
export const sendTypingTimeoutRefsAtom = atom<Record<string, NodeJS.Timeout | null>>({})

// EnhancedWorkoutsList filter states
export const workoutSearchTermAtom = atom<string>('')
export const workoutSortByAtom = atom<'date-desc' | 'date-asc' | 'type' | 'status' | 'distance'>(
  'date-desc'
)
export const workoutTypeFilterAtom = atom<string>('all')
export const workoutStatusFilterAtom = atom<string>('all')
export const workoutViewModeAtom = atom<'grid' | 'list'>('grid')
export const workoutQuickFilterAtom = atom<'all' | 'today' | 'this-week' | 'completed' | 'planned'>(
  'all'
)
export const workoutShowAdvancedFiltersAtom = atom(false)
export const workoutStravaShowPanelAtom = atom(false)

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
  defaultToComplete: false,
  connectionStatus: 'connected' as 'connected' | 'reconnecting' | 'disconnected',
  isDrawerOpen: false,
})

// Async atoms for data fetching with Suspense support
const logger = createLogger('AsyncAtoms')

// Refresh trigger atom for forcing data refetch
export const workoutsRefreshTriggerAtom = atom(0)

export const asyncWorkoutsAtom = atom(async get => {
  // Only execute on client-side to prevent build-time fetch errors
  if (!isBrowser) return []

  const authState = get(authStateAtom)
  const refreshTrigger = get(workoutsRefreshTriggerAtom) // Dependency for invalidation
  // refreshTrigger is used as a dependency to force atom re-evaluation
  void refreshTrigger // Silence ESLint warning

  // Check if we have a valid session from Better Auth
  if (!authState.user || authState.loading) {
    logger.debug('No session or still loading, returning empty workouts')
    return []
  }

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
  // Only execute on client-side to prevent build-time fetch errors
  if (!isBrowser) return []

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
  // Only execute on client-side to prevent build-time fetch errors
  if (!isBrowser) return []

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
  // Only execute on client-side to prevent build-time fetch errors
  if (!isBrowser) return []

  const session = get(sessionAtom)
  // Type guard and validation for Better Auth session
  if (
    !session ||
    typeof session !== 'object' ||
    !session.user ||
    typeof session.user !== 'object'
  ) {
    throw new Error('No session available')
  }

  const user = session.user as { id: string; email: string; name?: string; role?: string }
  if (!user.id) throw new Error('No user ID available')

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

    // Map API response to ConversationWithUser structure - Better Auth session structure
    const mappedConversations = fetchedConversations.map(
      (conv: {
        user: User
        lastMessage?: { conversation_id: string; created_at: string }
        unreadCount?: number
      }) => ({
        id: conv.lastMessage?.conversation_id || '',
        sender: {
          id: user.id,
          email: user.email,
          role: user.role || 'runner',
          full_name: user.name || '',
          created_at: '',
          updated_at: '',
        },
        recipient: conv.user,
        sender_id: user.id,
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
  // Only execute on client-side to prevent build-time fetch errors
  if (!isBrowser) return []

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
    const session = get(sessionAtom)
    // Type guard and validation for Better Auth session
    if (
      !session ||
      typeof session !== 'object' ||
      !session.user ||
      typeof session.user !== 'object'
    ) {
      throw new Error('No session available')
    }

    const user = session.user as { id: string; email: string; name?: string; role?: string }
    if (!user.id) throw new Error('No user ID available')

    const { recipientId, content, workoutId } = payload

    // Create optimistic message
    const optimisticMessage: MessageWithUser = {
      id: `temp-${Date.now()}`,
      conversation_id: '',
      content,
      sender_id: user.id,
      recipient_id: recipientId,
      workout_id: workoutId || null,
      read: false,
      created_at: new Date().toISOString(),
      sender: {
        id: user.id,
        full_name: user.name || 'You',
        email: user.email || '',
        role: (user.role || 'runner') as 'runner' | 'coach',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }

    // Add optimistic message immediately
    set(messagesAtom, prev => [...prev, optimisticMessage])

    try {
      const requestBody = { content, recipientId, workoutId }

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        credentials: 'include',
      })

      if (!response.ok) {
        await response.text() // Consume response body
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
        return message.sender_id === conversationId || message.recipient_id === conversationId
      })
    })
  )
)

// 4. Performance-optimized derived atoms
export const messagesByRecipientAtomFamily = atomFamily((recipientId: string) =>
  atom(get => {
    const messages = get(messagesAtom) || []
    return messages.filter(
      message => message.sender_id === recipientId || message.recipient_id === recipientId
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
      set(workoutsAtom, prev => prev.map(w => (w.id === workoutId ? { ...w, ...newWorkout } : w)))
    }
  )
)

// 6. Optimized stats atoms with memoization
export const workoutStatsByTypeAtom = atom(get => {
  const workouts = get(filteredWorkoutsAtom) || []

  // Group by workout type for better performance insights
  const statsByType = workouts.reduce(
    (acc, workout) => {
      const type = workout.planned_type || 'unknown'
      if (!acc[type]) {
        acc[type] = {
          total: 0,
          completed: 0,
          planned: 0,
          totalDistance: 0,
          completedDistance: 0,
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
    },
    {} as Record<
      string,
      {
        total: number
        completed: number
        planned: number
        totalDistance: number
        completedDistance: number
      }
    >
  )

  return statsByType
})

// 7. Lazy-loaded atoms for expensive computations
export const expensiveWorkoutAnalyticsAtom = atom(async get => {
  // Only execute on client-side to prevent build-time fetch errors
  if (!isBrowser) {
    return {
      totalWorkouts: 0,
      completedThisWeek: 0,
      avgDistancePerWorkout: 0,
      totalDistance: 0,
      streakDays: 0,
    }
  }

  const workouts = get(filteredWorkoutsAtom) || []

  // Simulate expensive computation
  await new Promise(resolve => setTimeout(resolve, 100))

  return {
    totalWorkouts: workouts.length,
    avgWeeklyDistance:
      workouts.length > 0
        ? workouts.reduce((sum, w) => sum + (w.planned_distance || 0), 0) /
          Math.max(workouts.length / 7, 1)
        : 0,
    consistency:
      workouts.length > 0
        ? workouts.filter(w => w.status === 'completed').length / workouts.length
        : 0,
    lastWorkoutDate:
      workouts.length > 0 ? Math.max(...workouts.map(w => new Date(w.date || '').getTime())) : null,
  }
})

// ==========================================
// PHASE 3: ADVANCED STATE MANAGEMENT PATTERNS
// ==========================================

// 1. Action Atoms for Centralized Operations
export const workoutActionsAtom = atom(
  null,
  (get, set, action: { type: string; payload?: unknown }) => {
    const currentWorkouts = get(workoutsAtom)

    switch (action.type) {
      case 'CREATE_WORKOUT': {
        const payload = action.payload as Partial<Workout>
        const newWorkout = {
          id: `workout-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          status: 'planned',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...payload,
        } as Workout

        set(workoutsAtom, [...currentWorkouts, newWorkout])

        // Log the action for debugging
        logger.info('🏃 Workout created:', { id: newWorkout.id, type: newWorkout.planned_type })
        break
      }

      case 'UPDATE_WORKOUT': {
        const { id, updates } = action.payload as { id: string; updates: Partial<Workout> }
        const updatedWorkouts = currentWorkouts.map(workout =>
          workout.id === id
            ? { ...workout, ...updates, updated_at: new Date().toISOString() }
            : workout
        )

        set(workoutsAtom, updatedWorkouts)
        logger.info('📝 Workout updated:', { id, updates })
        break
      }

      case 'DELETE_WORKOUT': {
        const { id } = action.payload as { id: string }
        const filteredWorkouts = currentWorkouts.filter(workout => workout.id !== id)

        set(workoutsAtom, filteredWorkouts)
        logger.info('🗑️ Workout deleted:', { id })
        break
      }

      case 'COMPLETE_WORKOUT': {
        const { id, completionData } = action.payload as {
          id: string
          completionData: {
            distance?: number
            duration?: number
            notes?: string
            intensity?: number
          }
        }
        const updatedWorkouts = currentWorkouts.map(workout =>
          workout.id === id
            ? {
                ...workout,
                status: 'completed' as const,
                actual_distance: completionData.distance || workout.planned_distance,
                actual_duration: completionData.duration || workout.planned_duration,
                workout_notes: completionData.notes || workout.workout_notes,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            : workout
        )

        set(workoutsAtom, updatedWorkouts)
        logger.info('✅ Workout completed:', { id, completionData })
        break
      }

      case 'BULK_UPDATE_STATUS': {
        const { workoutIds, status } = action.payload as {
          workoutIds: string[]
          status: 'planned' | 'completed' | 'skipped'
        }
        const updatedWorkouts = currentWorkouts.map(workout =>
          workoutIds.includes(workout.id)
            ? { ...workout, status, updated_at: new Date().toISOString() }
            : workout
        )

        set(workoutsAtom, updatedWorkouts)
        logger.info('📋 Bulk status update:', { count: workoutIds.length, status })
        break
      }

      default:
        logger.warn('Unknown workout action:', action.type)
    }
  }
)

export const messageActionsAtom = atom(
  null,
  (get, set, action: { type: string; payload?: unknown }) => {
    const currentMessages = get(messagesAtom)
    const currentConversations = get(conversationsAtom)

    switch (action.type) {
      case 'SEND_MESSAGE': {
        const { content, recipientId, workoutId, senderId } = action.payload as {
          content: string
          recipientId: string
          workoutId?: string
          senderId: string
        }
        const newMessage = {
          id: `msg-${Date.now()}`,
          content,
          sender_id: senderId,
          recipient_id: recipientId,
          workout_id: workoutId || null,
          created_at: new Date().toISOString(),
          read: false,
          sender: null, // Will be populated by the server
        } as unknown as MessageWithUser

        // Optimistically add message
        set(messagesAtom, [...currentMessages, newMessage])

        // Update conversation last message time
        const updatedConversations = currentConversations.map(conv =>
          conv.recipient.id === recipientId || conv.sender.id === recipientId
            ? { ...conv, last_message_at: newMessage.created_at }
            : conv
        )
        set(conversationsAtom, updatedConversations)

        logger.info('💬 Message sent optimistically:', { recipientId, hasWorkout: !!workoutId })
        break
      }

      case 'MARK_MESSAGES_READ': {
        const { senderId, recipientId } = action.payload as {
          senderId: string
          recipientId: string
        }
        const updatedMessages = currentMessages.map(message =>
          message.sender_id === senderId && message.recipient_id === recipientId && !message.read
            ? { ...message, read: true }
            : message
        )

        set(messagesAtom, updatedMessages)

        // Update conversation unread count
        const updatedConversations = currentConversations.map(conv =>
          conv.recipient.id === senderId || conv.sender.id === senderId
            ? { ...conv, unreadCount: 0 }
            : conv
        )
        set(conversationsAtom, updatedConversations)

        logger.info('📖 Messages marked as read:', { senderId, recipientId })
        break
      }

      case 'DELETE_MESSAGE': {
        const { messageId } = action.payload as { messageId: string }
        const filteredMessages = currentMessages.filter(message => message.id !== messageId)

        set(messagesAtom, filteredMessages)
        logger.info('🗑️ Message deleted:', { messageId })
        break
      }

      default:
        logger.warn('Unknown message action:', action.type)
    }
  }
)

// 2. State Serialization and Persistence
export const persistedStateAtom = atomWithStorage('ultracoach-state', {
  theme: 'dark' as 'light' | 'dark',
  workoutFilter: 'all' as 'all' | 'planned' | 'completed' | 'skipped',
  chatSettings: {
    notifications: true,
    soundEnabled: true,
  },
  uiPreferences: {
    workoutCardVariant: 'default' as 'default' | 'compact' | 'detailed',
    sidebarCollapsed: false,
    lastVisitedPage: '/' as string,
  },
  lastSync: new Date().toISOString(),
})

// 3. Optimistic Updates with Rollback
export const optimisticOperationAtom = atom(
  null,
  (
    get,
    set,
    operation: {
      type: 'workout' | 'message'
      action: string
      payload: unknown
      rollback?: () => void
    }
  ) => {
    const { type, action, payload } = operation

    // Store current state for potential rollback
    const currentWorkouts = get(workoutsAtom)
    const currentMessages = get(messagesAtom)

    // Create rollback function
    const rollback = () => {
      if (type === 'workout') {
        set(workoutsAtom, currentWorkouts)
        logger.warn('🔄 Rolled back workout operation:', action)
      } else if (type === 'message') {
        set(messagesAtom, currentMessages)
        logger.warn('🔄 Rolled back message operation:', action)
      }
    }

    // Perform optimistic update
    try {
      if (type === 'workout') {
        set(workoutActionsAtom, { type: action, payload })
      } else if (type === 'message') {
        set(messageActionsAtom, { type: action, payload })
      }

      // Store rollback function in case of server error
      operation.rollback = rollback

      logger.info('⚡ Optimistic operation applied:', { type, action })
    } catch (error) {
      logger.error('❌ Optimistic operation failed, rolling back:', error)
      rollback()
    }
  }
)

// 4. Advanced Analytics with Derived State
export const workoutAnalyticsAtom = atom(get => {
  const workouts = get(workoutsAtom) || []
  const now = new Date()

  // Weekly analytics
  const thisWeek = workouts.filter(w => {
    const workoutDate = new Date(w.date || '')
    const daysDiff = Math.floor((now.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24))
    return daysDiff >= 0 && daysDiff < 7
  })

  // Monthly analytics
  const thisMonth = workouts.filter(w => {
    const workoutDate = new Date(w.date || '')
    return (
      workoutDate.getMonth() === now.getMonth() && workoutDate.getFullYear() === now.getFullYear()
    )
  })

  // Streak calculation
  const sortedWorkouts = [...workouts]
    .filter(w => w.status === 'completed')
    .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime())

  let currentStreak = 0
  let lastDate = new Date()

  for (const workout of sortedWorkouts) {
    const workoutDate = new Date(workout.date || '')
    const daysDiff = Math.floor(
      (lastDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysDiff <= 1) {
      currentStreak++
      lastDate = workoutDate
    } else {
      break
    }
  }

  return {
    total: workouts.length,
    completed: workouts.filter(w => w.status === 'completed').length,
    completionRate:
      workouts.length > 0
        ? (workouts.filter(w => w.status === 'completed').length / workouts.length) * 100
        : 0,

    thisWeek: {
      total: thisWeek.length,
      completed: thisWeek.filter(w => w.status === 'completed').length,
      totalDistance: thisWeek.reduce(
        (sum, w) => sum + (w.actual_distance || w.planned_distance || 0),
        0
      ),
    },

    thisMonth: {
      total: thisMonth.length,
      completed: thisMonth.filter(w => w.status === 'completed').length,
      totalDistance: thisMonth.reduce(
        (sum, w) => sum + (w.actual_distance || w.planned_distance || 0),
        0
      ),
    },

    streak: {
      current: currentStreak,
      best: currentStreak, // Simplified - could track historical best
    },

    byType: workouts.reduce(
      (acc, workout) => {
        const type = workout.planned_type || 'Unknown'
        if (!acc[type]) {
          acc[type] = { total: 0, completed: 0 }
        }
        acc[type].total++
        if (workout.status === 'completed') {
          acc[type].completed++
        }
        return acc
      },
      {} as Record<string, { total: number; completed: number }>
    ),

    lastUpdated: new Date().toISOString(),
  }
})

// 5. Error Handling and Recovery
export const errorRecoveryAtom = atom(
  null,
  (get, set, error: { type: string; message: string; context?: unknown; timestamp?: string }) => {
    const errorWithTimestamp = {
      ...error,
      timestamp: error.timestamp || new Date().toISOString(),
    }

    logger.error('🚨 Error captured by recovery atom:', errorWithTimestamp)

    // Could implement specific recovery strategies based on error type
    switch (error.type) {
      case 'FETCH_FAILED':
        // Could trigger a retry or show offline mode
        logger.info('🔄 Attempting to recover from fetch failure')
        break

      case 'OPTIMISTIC_UPDATE_FAILED':
        // Rollback handled by optimistic operation atom
        logger.info('⏪ Optimistic update failure handled')
        break

      case 'SYNC_CONFLICT':
        // Could implement conflict resolution
        logger.info('⚠️ Sync conflict detected, manual resolution needed')
        break

      default:
        logger.info('❓ Unknown error type, using default recovery')
    }
  }
)

// ===================================
// STRAVA INTEGRATION ATOMS
// ===================================

// Core Strava connection atom
export const stravaConnectionAtom = atom<StravaConnection | null>(null)

// Strava connection status atom
export const stravaStatusAtom = atom<
  'disconnected' | 'connecting' | 'connected' | 'expired' | 'error'
>('disconnected')

// Error state for Strava operations
export const stravaErrorAtom = atom<string | null>(null)

// Strava activities atom
export const stravaActivitiesAtom = atom<StravaActivity[]>([])

// Sync progress tracking for individual activities
export const syncProgressAtom = atom<{
  [activityId: string]: {
    syncing: boolean
    synced: boolean
    error?: string
    workoutId?: string
  }
}>({})

// Refreshable Strava connection status atom (only fetches when user is authenticated)
export const stravaConnectionStatusAtom = atomWithRefresh(async get => {
  if (!isBrowser) return { connected: false, enabled: false }

  // Check authentication first - don't make API calls for unauthenticated users
  const authState = get(authStateAtom)
  if (!authState.user || authState.loading) {
    return { connected: false, enabled: false }
  }

  const logger = createLogger('StravaConnectionStatus')

  try {
    logger.debug('Fetching Strava connection status for authenticated user...')
    const response = await fetch('/api/strava/status', {
      credentials: 'include',
    })

    if (!response.ok) {
      logger.error(`Failed to fetch Strava status: ${response.status} ${response.statusText}`)
      return { connected: false, enabled: false, error: 'Failed to load status' }
    }

    const data = await response.json()
    logger.info('Strava connection status fetched successfully', { connected: data.connected })
    return data
  } catch (error) {
    logger.error('Error fetching Strava connection status:', error)
    return { connected: false, enabled: false, error: 'Network error' }
  }
})

// Refreshable Strava activities atom (only fetches when user is authenticated)
export const stravaActivitiesRefreshableAtom = atomWithRefresh(async get => {
  if (!isBrowser) return []

  // Check authentication first - don't make API calls for unauthenticated users
  const authState = get(authStateAtom)
  if (!authState.user || authState.loading) {
    return []
  }

  const logger = createLogger('StravaActivities')

  try {
    logger.debug('Fetching Strava activities for authenticated user...')
    const response = await fetch('/api/strava/activities', {
      credentials: 'include',
    })

    if (!response.ok) {
      if (response.status === 403) {
        logger.warn('Insufficient Strava permissions for activities')
        return []
      }
      logger.error(`Failed to fetch Strava activities: ${response.status} ${response.statusText}`)
      throw new Error(`Failed to fetch Strava activities: ${response.statusText}`)
    }

    const data = await response.json()
    logger.info('Strava activities fetched successfully', { count: data.activities?.length || 0 })
    return data.activities || []
  } catch (error) {
    logger.error('Error fetching Strava activities:', error)
    return []
  }
})

// Derived atoms for better performance using unwrap for async data
export const unsyncedActivitiesAtom = atom(get => {
  const activitiesLoadable = get(loadable(stravaActivitiesRefreshableAtom))
  const syncProgress = get(syncProgressAtom)

  if (activitiesLoadable.state !== 'hasData') {
    return []
  }

  const activities = activitiesLoadable.data
  return activities.filter((activity: StravaActivity) => {
    const progress = syncProgress[activity.id]
    return !progress?.synced
  })
})

export const syncedActivitiesAtom = atom(get => {
  const activitiesLoadable = get(loadable(stravaActivitiesRefreshableAtom))
  const syncProgress = get(syncProgressAtom)

  if (activitiesLoadable.state !== 'hasData') {
    return []
  }

  const activities = activitiesLoadable.data
  return activities.filter((activity: StravaActivity) => {
    const progress = syncProgress[activity.id]
    return progress?.synced
  })
})

export const syncStatsAtom = atom(get => {
  const activitiesLoadable = get(loadable(stravaActivitiesRefreshableAtom))
  const syncProgress = get(syncProgressAtom)

  if (activitiesLoadable.state !== 'hasData') {
    return {
      total: 0,
      synced: 0,
      pending: 0,
      syncing: 0,
      syncRate: 0,
    }
  }

  const activities = activitiesLoadable.data
  const total = activities.length
  const synced = activities.filter(
    (activity: StravaActivity) => syncProgress[activity.id]?.synced
  ).length
  const pending = total - synced
  const syncing = Object.values(syncProgress).filter(p => p.syncing).length

  return {
    total,
    synced,
    pending,
    syncing,
    syncRate: total > 0 ? Math.round((synced / total) * 100) : 0,
  }
})

// Auto-reconnect state
export const stravaAutoReconnectAtom = atom<{
  enabled: boolean
  attempts: number
  maxAttempts: number
  lastAttempt: Date | null
}>({
  enabled: true,
  attempts: 0,
  maxAttempts: 3,
  lastAttempt: null,
})

// Types for Strava action payloads
interface SyncActivityPayload {
  activityId: string
  syncAsWorkout?: boolean
}

// Strava sync operations atom for actions
export const stravaActionsAtom = atom(
  null,
  (
    get,
    set,
    action: {
      type: 'SYNC_ACTIVITY' | 'CONNECT' | 'DISCONNECT' | 'RECONNECT'
      payload?: SyncActivityPayload
    }
  ) => {
    const logger = createLogger('StravaActions')

    switch (action.type) {
      case 'SYNC_ACTIVITY':
        if (!action.payload) {
          logger.error('SYNC_ACTIVITY action requires payload with activityId')
          return
        }
        const { activityId, syncAsWorkout = true } = action.payload

        // Set syncing state
        set(syncProgressAtom, prev => ({
          ...prev,
          [activityId]: { ...prev[activityId], syncing: true, error: undefined },
        }))

        // Perform sync operation
        fetch('/api/strava/sync', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activity_id: activityId,
            sync_as_workout: syncAsWorkout,
          }),
        })
          .then(async response => {
            if (response.ok) {
              const result = await response.json()
              set(syncProgressAtom, prev => ({
                ...prev,
                [activityId]: {
                  syncing: false,
                  synced: true,
                  workoutId: result.workout_id,
                },
              }))
              logger.info('Activity synced successfully', {
                activityId,
                workoutId: result.workout_id,
              })
            } else {
              const errorData = await response.json()
              set(syncProgressAtom, prev => ({
                ...prev,
                [activityId]: {
                  syncing: false,
                  synced: false,
                  error: errorData.error,
                },
              }))
              logger.error('Failed to sync activity', { activityId, error: errorData.error })
            }
          })
          .catch(error => {
            set(syncProgressAtom, prev => ({
              ...prev,
              [activityId]: {
                syncing: false,
                synced: false,
                error: 'Network error',
              },
            }))
            logger.error('Network error syncing activity', { activityId, error })
          })
        break

      case 'CONNECT':
        set(stravaStatusAtom, 'connecting')
        fetch('/api/strava/connect', { credentials: 'include' })
          .then(async response => {
            if (response.ok) {
              const data = await response.json()
              window.location.href = data.authUrl
            } else {
              set(stravaStatusAtom, 'error')
              set(stravaErrorAtom, 'Failed to initiate connection')
            }
          })
          .catch(() => {
            set(stravaStatusAtom, 'error')
            set(stravaErrorAtom, 'Network error')
          })
        break

      case 'DISCONNECT':
        fetch('/api/strava/disconnect', {
          method: 'POST',
          credentials: 'include',
        })
          .then(async response => {
            if (response.ok) {
              set(stravaStatusAtom, 'disconnected')
              set(stravaConnectionAtom, null)
              set(stravaActivitiesAtom, [])
              set(syncProgressAtom, {})
              logger.info('Successfully disconnected from Strava')
            } else {
              set(stravaErrorAtom, 'Failed to disconnect')
            }
          })
          .catch(() => {
            set(stravaErrorAtom, 'Network error during disconnect')
          })
        break

      case 'RECONNECT':
        const reconnectState = get(stravaAutoReconnectAtom)
        if (reconnectState.attempts < reconnectState.maxAttempts) {
          set(stravaAutoReconnectAtom, {
            ...reconnectState,
            attempts: reconnectState.attempts + 1,
            lastAttempt: new Date(),
          })
          // Trigger connect action
          set(stravaActionsAtom, { type: 'CONNECT' })
        } else {
          logger.warn('Max reconnect attempts reached')
          set(stravaErrorAtom, 'Max reconnection attempts reached')
        }
        break
    }
  }
)

// Combined Strava state atom for easy consumption
export const stravaStateAtom = atom(get => {
  const connectionLoadable = get(loadable(stravaConnectionStatusAtom))
  const activitiesLoadable = get(loadable(stravaActivitiesRefreshableAtom))
  const syncStats = get(syncStatsAtom)
  const status = get(stravaStatusAtom)
  const error = get(stravaErrorAtom)
  const autoReconnect = get(stravaAutoReconnectAtom)

  const connection =
    connectionLoadable.state === 'hasData'
      ? connectionLoadable.data
      : { connected: false, enabled: false }
  const activities = activitiesLoadable.state === 'hasData' ? activitiesLoadable.data : []

  return {
    connection,
    activities,
    syncStats,
    status,
    error,
    autoReconnect,
    isConnected: connection.connected && status === 'connected',
    canSync: connection.connected && connection.scope?.includes('activity:read_all'),
    needsReconnect:
      status === 'expired' ||
      (connection.connected && !connection.scope?.includes('activity:read_all')),
    loading: connectionLoadable.state === 'loading' || activitiesLoadable.state === 'loading',
  }
})

// Workout matching state
export const workoutMatchingStateAtom = atom<{
  matches: Map<number, WorkoutMatch[]>
  loading: boolean
  lastProcessed: string | null
  error: string | null
}>({
  matches: new Map(),
  loading: false,
  lastProcessed: null,
  error: null,
})

// Current matching options
export const matchingOptionsAtom = atom({
  dateTolerance: 1, // days
  distanceTolerance: 0.15, // 15%
  durationTolerance: 0.2, // 20%
  minConfidence: 0.3, // 30%
})

// Selected match for diffing
export const selectedMatchAtom = atom<WorkoutMatch | null>(null)

// Show workout diff modal
export const showWorkoutDiffModalAtom = atom(false)

// Workout matching summary statistics
export const matchingSummaryAtom = atom(get => {
  const stravaState = get(stravaStateAtom)
  const workouts = get(workoutsAtom)
  const matchingState = get(workoutMatchingStateAtom)

  if (!stravaState.activities || workouts.length === 0 || matchingState.matches.size === 0) {
    return null
  }

  const activities = stravaState.activities
  const matches = matchingState.matches

  // Calculate summary statistics
  const allMatches = Array.from(matches.values()).flat()
  const totalMatches = allMatches.length
  const exactMatches = allMatches.filter(m => m.matchType === 'exact').length
  const probableMatches = allMatches.filter(m => m.matchType === 'probable').length
  const possibleMatches = allMatches.filter(m => m.matchType === 'possible').length
  const conflicts = allMatches.filter(m => m.matchType === 'conflict').length

  // Find unmatched planned workouts
  const matchedWorkoutIds = new Set(
    allMatches.filter(m => m.confidence > 0.5).map(m => m.workout.id)
  )
  const unmatchedWorkouts = workouts.filter(
    w => w.status === 'planned' && !matchedWorkoutIds.has(w.id) && new Date(w.date) <= new Date()
  ).length

  return {
    total: {
      activities: activities.length,
      workouts: workouts.length,
      matches: totalMatches,
    },
    byType: {
      exact: exactMatches,
      probable: probableMatches,
      possible: possibleMatches,
      conflicts: conflicts,
    },
    unmatchedWorkouts,
    lastProcessed: matchingState.lastProcessed,
  }
})

// Action atom to trigger workout matching
export const triggerWorkoutMatchingAtom = atom(null, async (get, set) => {
  const stravaState = get(stravaStateAtom)
  const workouts = get(workoutsAtom)
  const options = get(matchingOptionsAtom)

  if (!stravaState.activities || workouts.length === 0) {
    logger.warn('Cannot perform workout matching: missing activities or workouts')
    return
  }

  set(workoutMatchingStateAtom, prev => ({ ...prev, loading: true, error: null }))

  try {
    logger.info('Starting workout matching process', {
      activities: stravaState.activities.length,
      workouts: workouts.length,
      options,
    })

    const { batchMatchActivities } = await import('@/utils/workout-matching')
    const matches = batchMatchActivities(stravaState.activities, workouts, options)

    set(workoutMatchingStateAtom, prev => ({
      ...prev,
      matches,
      loading: false,
      lastProcessed: new Date().toISOString(),
      error: null,
    }))

    logger.info('Workout matching completed successfully', {
      matchedActivities: matches.size,
      totalMatches: Array.from(matches.values()).flat().length,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Workout matching failed:', error)

    set(workoutMatchingStateAtom, prev => ({
      ...prev,
      loading: false,
      error: errorMessage,
    }))
  }
})
