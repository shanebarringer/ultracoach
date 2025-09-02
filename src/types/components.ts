// Component Prop Types
import type { ReactNode } from 'react'

import type { Session, User } from './auth'

// Layout Props
export interface LayoutProps {
  children: ReactNode
}

export interface HeaderProps {
  user?: User
  session?: Session
}

// Page Component Props
export interface PageClientProps {
  user?: User
  params?: Record<string, string>
  searchParams?: Record<string, string>
}

// Dashboard Props
export interface DashboardProps {
  user: User
  stats?: DashboardStats
}

export interface DashboardStats {
  totalWorkouts: number
  completedWorkouts: number
  upcomingWorkouts: number
  activeAthletes?: number
  totalAthletes?: number
}

// Settings Panel Props
export interface SettingsPanelProps {
  user: User
  onSave?: (data: Record<string, unknown>) => void
  loading?: boolean
}

// Modal Props
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

// Form Props
export interface FormProps {
  onSubmit: (data: Record<string, unknown>) => void
  loading?: boolean
  error?: string
  defaultValues?: Record<string, unknown>
}

// List Component Props
export interface ListProps<T> {
  items: T[]
  loading?: boolean
  error?: string
  emptyMessage?: string
  onItemClick?: (item: T) => void
  renderItem?: (item: T) => ReactNode
}

// Card Component Props
export interface CardProps {
  title?: string
  subtitle?: string
  children?: ReactNode
  actions?: ReactNode
  className?: string
  onClick?: () => void
}

// Calendar Props
export interface CalendarProps {
  user: User
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  events?: CalendarEvent[]
}

export interface CalendarEvent {
  id: string
  title: string
  date: Date
  type: 'workout' | 'race' | 'rest'
  completed?: boolean
}

// Chat Component Props
export interface ChatWindowProps {
  conversationId: string
  currentUser: User
  recipientUser?: User
}

export interface Message {
  id: string
  content: string
  senderId: string
  createdAt: string
  read?: boolean
}

export interface MessageListProps {
  messages: Message[]
  currentUserId: string
  loading?: boolean
}

// Workout Component Props
export interface Workout {
  id: string
  name: string
  description?: string
  scheduledDate: string
  completed: boolean
}

export interface WorkoutCardProps {
  workout: Workout
  onEdit?: (workout: Workout) => void
  onDelete?: (workout: Workout) => void
  onComplete?: (workout: Workout) => void
  showActions?: boolean
}

// Training Plan Props
export interface TrainingPlan {
  id: string
  name: string
  description?: string
  startDate: string
  endDate: string
}

export interface TrainingPlanCardProps {
  plan: TrainingPlan
  onEdit?: (plan: TrainingPlan) => void
  onDelete?: (plan: TrainingPlan) => void
  onView?: (plan: TrainingPlan) => void
  showActions?: boolean
}

// Strava Component Props
export interface StravaConnectionDisplay {
  id: string
  athleteId: string
  connected: boolean
  lastSyncAt?: string
}

export interface StravaWidgetProps {
  user: User
  connection?: StravaConnectionDisplay
  onConnect?: () => void
  onDisconnect?: () => void
  onSync?: () => void
}

// Common Props
export interface WithClassName {
  className?: string
}

export interface WithChildren {
  children: ReactNode
}

export interface WithLoading {
  loading?: boolean
  loadingText?: string
}

export interface WithError {
  error?: string | Error
  onRetry?: () => void
}
