// API Request and Response Types

// Common API response types
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// Workout API types
export interface WorkoutCreateRequest {
  name: string
  description?: string
  trainingPlanId?: string
  userId: string
  scheduledDate: string
  category: string
  intensity?: number
  targetTime?: number
  targetDistance?: number
  terrain?: string
}

export interface WorkoutUpdateRequest {
  id: string
  completed?: boolean
  actualTime?: number
  actualDistance?: number
  notes?: string
  heartRateAvg?: number
  elevationGain?: number
  stravaActivityId?: string
}

// Training Plan API types
export interface TrainingPlanCreateRequest {
  name: string
  description?: string
  userId: string
  startDate: string
  endDate: string
  goal?: string
  targetRaceId?: string
}

// Message API types
export interface MessageCreateRequest {
  conversationId: string
  senderId: string
  content: string
  workoutId?: string
}

// Relationship API types
export interface RelationshipCreateRequest {
  coachId: string
  runnerId: string
  status?: string
  notes?: string
}

// Strava API types
export interface StravaConnectRequest {
  code: string
  scope: string
  state?: string
}

export interface StravaSyncRequest {
  userId: string
  startDate?: string
  endDate?: string
  syncType?: 'bulk' | 'enhanced' | 'selective'
}

// Race API types
export interface RaceImportRequest {
  file: File
  importType: 'gpx' | 'csv'
  userId: string
}
