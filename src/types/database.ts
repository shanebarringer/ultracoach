// Database Schema Types
// These types should match the Drizzle schema definitions

export interface DbUser {
  id: string
  email: string
  name?: string | null
  fullName?: string | null
  emailVerified?: boolean
  image?: string | null
  role?: string
  userType?: string
  createdAt: Date
  updatedAt: Date
}

export interface DbSession {
  id: string
  token: string
  userId: string
  expiresAt: Date
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface DbWorkout {
  id: string
  name: string
  description?: string | null
  userId: string
  trainingPlanId?: string | null
  scheduledDate: Date
  completedDate?: Date | null
  completed: boolean
  category: string
  intensity?: number | null
  targetTime?: number | null
  targetDistance?: number | null
  actualTime?: number | null
  actualDistance?: number | null
  notes?: string | null
  terrain?: string | null
  heartRateAvg?: number | null
  elevationGain?: number | null
  stravaActivityId?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface DbTrainingPlan {
  id: string
  name: string
  description?: string | null
  userId: string
  coachId?: string | null
  startDate: Date
  endDate: Date
  goal?: string | null
  targetRaceId?: string | null
  difficulty?: string | null
  weeklyMileage?: number | null
  isTemplate: boolean
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

export interface DbMessage {
  id: string
  conversationId: string
  senderId: string
  content: string
  workoutId?: string | null
  read: boolean
  edited: boolean
  deletedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface DbConversation {
  id: string
  participant1Id: string
  participant2Id: string
  lastMessageAt?: Date | null
  lastMessagePreview?: string | null
  unreadCount1: number
  unreadCount2: number
  archivedBy1: boolean
  archivedBy2: boolean
  createdAt: Date
  updatedAt: Date
}

export interface DbCoachRunner {
  id: string
  coachId: string
  runnerId: string
  status: string
  startedAt?: Date | null
  endedAt?: Date | null
  notes?: string | null
  invitationSentAt?: Date | null
  invitationAcceptedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface DbRace {
  id: string
  name: string
  date: Date
  location?: string | null
  distance: number
  distanceUnit: string
  elevationGain?: number | null
  terrain?: string | null
  description?: string | null
  websiteUrl?: string | null
  routeGpxUrl?: string | null
  userId?: string | null
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

export interface DbNotification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  read: boolean
  actionUrl?: string | null
  metadata?: Record<string, unknown>
  createdAt: Date
  readAt?: Date | null
}

export interface DbStravaConnection {
  id: string
  userId: string
  athleteId: string
  accessToken?: string | null
  refreshToken?: string | null
  expiresAt?: Date | null
  scope?: string | null
  athleteData?: Record<string, unknown>
  lastSyncAt?: Date | null
  syncEnabled: boolean
  autoSync: boolean
  createdAt: Date
  updatedAt: Date
}

export interface DbStravaActivitySync {
  id: string
  userId: string
  stravaActivityId: string
  workoutId?: string | null
  activityData?: Record<string, unknown>
  syncStatus: string
  syncedAt?: Date | null
  error?: string | null
  createdAt: Date
  updatedAt: Date
}
