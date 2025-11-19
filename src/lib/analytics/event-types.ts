/**
 * Analytics Event Types - Type-Safe Event Properties
 *
 * Defines TypeScript interfaces for all analytics events.
 * Provides compile-time validation and IntelliSense support.
 *
 * Usage:
 * ```typescript
 * const trackEvent = useTypedPostHogEvent()
 * trackEvent('workout_logged', {
 *   workoutId: '123',
 *   status: 'completed', // Autocomplete!
 *   distance: 10
 * })
 * ```
 */
import { ANALYTICS_EVENTS } from './events'

// ========================================
// Common Types
// ========================================

export type WorkoutStatus = 'planned' | 'completed' | 'skipped'
export type WorkoutType =
  | 'easy'
  | 'tempo'
  | 'interval'
  | 'long_run'
  | 'race_simulation'
  | 'recovery'
  | 'speed_work'
export type TerrainType = 'road' | 'trail' | 'track' | 'treadmill' | 'mixed'
export type UserType = 'runner' | 'coach'
export type PlanType = 'custom' | 'template' | 'ai_generated'
export type GoalType = 'completion' | 'time' | 'placement' | 'training'
export type RelationshipStatus = 'pending' | 'active' | 'inactive'
export type SyncStatus = 'success' | 'partial' | 'failed'

// ========================================
// Training Plan Events
// ========================================

export interface TrainingPlanCreatedEvent {
  planType: PlanType
  goalType: GoalType
  duration?: number // Duration in weeks
  raceGoal?: string
  templateId?: string
  userId: string
  userType: UserType
}

export interface TrainingPlanUpdatedEvent {
  planId: string
  updatedFields: string[] // Array of field names that were updated
  userId: string
}

export interface TrainingPlanDeletedEvent {
  planId: string
  reason?: 'user_deleted' | 'plan_completed' | 'plan_abandoned'
  userId: string
}

export interface TrainingPlanStartedEvent {
  planId: string
  startDate: string // ISO date string
  targetRace?: string
  userId: string
}

export interface TrainingPlanCompletedEvent {
  planId: string
  completionDate: string // ISO date string
  completionRate: number // Percentage of workouts completed
  userId: string
}

// ========================================
// Workout Events
// ========================================

export interface WorkoutLoggedEvent {
  workoutId: string
  status: WorkoutStatus
  workoutType?: WorkoutType
  distance?: number // Distance in miles/km
  duration?: number // Duration in minutes
  effort?: number // Effort level 1-10
  terrainType?: TerrainType
  elevationGain?: number // Elevation in feet/meters
  userId: string
}

export interface WorkoutCompletedEvent {
  workoutId: string
  workoutType: WorkoutType
  distance: number
  duration: number
  pace?: number // Pace in min/mile or min/km
  elevationGain?: number
  heartRateAvg?: number
  heartRateMax?: number
  effortLevel: number // 1-10
  notes?: string
  userId: string
}

export interface WorkoutSkippedEvent {
  workoutId: string
  reason?: string
  plannedWorkoutType: WorkoutType
  userId: string
}

export interface WorkoutRescheduledEvent {
  workoutId: string
  originalDate: string // ISO date string
  newDate: string // ISO date string
  reason?: string
  userId: string
}

// ========================================
// Race Events
// ========================================

export interface RaceAddedEvent {
  raceId: string
  raceName: string
  distance: number // Distance in miles/km
  raceDate: string // ISO date string
  location?: string
  terrainType?: TerrainType
  elevationGain?: number
  source?: 'manual' | 'gpx' | 'csv'
  userId: string
}

export interface RaceImportedGPXEvent {
  raceId: string
  raceName: string
  distance: number
  elevationGain: number
  terrainType: TerrainType
  dataPoints: number // Number of GPS points
  userId: string
}

export interface RaceImportedCSVEvent {
  racesCount: number
  successCount: number
  errorCount: number
  userId: string
}

export interface RaceGoalSetEvent {
  raceId: string
  goalType: GoalType
  goalValue?: string // e.g., "4:30:00" for time goal
  userId: string
}

// ========================================
// Strava Integration Events
// ========================================

export interface StravaConnectInitiatedEvent {
  source: 'connection_card' | 'dashboard' | 'settings' | 'workout_page'
  userId: string
}

export interface StravaConnectedEvent {
  stravaUserId: string
  athleteName: string
  source: string
  userId: string
}

export interface StravaDisconnectedEvent {
  source: 'connection_card' | 'dashboard' | 'settings'
  userId?: string
}

export interface StravaSyncStartedEvent {
  syncType: 'full' | 'incremental' | 'selective'
  activityCount?: number
  userId: string
}

export interface StravaSyncCompletedEvent {
  syncType: 'full' | 'incremental' | 'selective'
  activitiesProcessed: number
  activitiesImported: number
  activitiesMatched: number
  syncStatus: SyncStatus
  duration: number // Sync duration in seconds
  userId: string
}

export interface StravaActivityImportedEvent {
  stravaActivityId: string
  activityType: string
  distance: number
  duration: number
  startDate: string
  userId: string
}

export interface StravaWorkoutMatchedEvent {
  stravaActivityId: string
  workoutId: string
  matchConfidence: number // 0-100
  matchedFields: string[]
  userId: string
}

// ========================================
// Coach-Runner Relationship Events
// ========================================

export interface RelationshipRequestedEvent {
  relationshipId: string
  requestedBy: UserType
  coachId: string
  runnerId: string
}

export interface RelationshipAcceptedEvent {
  relationshipId: string
  acceptedBy: UserType
  coachId: string
  runnerId: string
}

export interface RelationshipEndedEvent {
  relationshipId: string
  endedBy: UserType
  reason?: string
  coachId: string
  runnerId: string
}

// ========================================
// Communication Events
// ========================================

export interface MessageSentEvent {
  conversationId: string
  messageId: string
  messageLength: number
  senderId: string
  recipientId: string
  senderType: UserType
}

export interface ConversationStartedEvent {
  conversationId: string
  participants: string[] // User IDs
  initiatedBy: string
  initiatorType: UserType
}

// ========================================
// User Events
// ========================================

export interface UserSignedUpEvent {
  userId: string
  userType: UserType
  signupMethod: 'email' | 'google' | 'apple'
  referralSource?: string
}

export interface UserSignedInEvent {
  userId: string
  userType: UserType
  signInMethod: 'email' | 'google' | 'apple'
  sessionDuration?: number // Previous session duration in minutes
}

export interface UserProfileUpdatedEvent {
  userId: string
  updatedFields: string[]
  userType: UserType
}

// ========================================
// Navigation & Engagement Events
// ========================================

export interface PageViewedEvent {
  pagePath: string
  pageTitle?: string
  referrer?: string
  userId?: string
}

export interface DashboardViewedEvent {
  dashboardType: 'runner' | 'coach'
  userId: string
}

export interface WeeklyPlannerDayExpandedEvent {
  dayIndex: number // 0-6 (Sunday-Saturday)
  workoutCount: number
  userId: string
}

// ========================================
// Error Tracking Events
// ========================================

export interface ErrorOccurredEvent {
  errorType: string
  errorMessage: string
  errorStack?: string
  componentName?: string
  userId?: string
}

export interface APIErrorEvent {
  endpoint: string
  statusCode: number
  errorMessage: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  userId?: string
}

// ========================================
// Feature Usage Events
// ========================================

export interface FeatureFlagEvaluatedEvent {
  flagKey: string
  flagValue: boolean | string
  userId?: string
}

export interface ExportInitiatedEvent {
  exportType: 'csv' | 'pdf' | 'gpx' | 'tcx'
  dataType: 'workouts' | 'training_plan' | 'race_data'
  userId: string
}

export interface FilterAppliedEvent {
  filterType: string
  filterValue: string
  page: string
  userId?: string
}

export interface SearchPerformedEvent {
  searchQuery: string
  searchType: 'workouts' | 'races' | 'athletes' | 'training_plans'
  resultsCount: number
  userId?: string
}

// ========================================
// Analytics Event Map
// ========================================

/**
 * Comprehensive map of all analytics events to their property types
 * Enables fully type-safe event tracking
 */
export interface AnalyticsEventMap {
  // Training Plans
  [ANALYTICS_EVENTS.TRAINING_PLAN_CREATED]: TrainingPlanCreatedEvent
  [ANALYTICS_EVENTS.TRAINING_PLAN_UPDATED]: TrainingPlanUpdatedEvent
  [ANALYTICS_EVENTS.TRAINING_PLAN_DELETED]: TrainingPlanDeletedEvent
  [ANALYTICS_EVENTS.TRAINING_PLAN_STARTED]: TrainingPlanStartedEvent
  [ANALYTICS_EVENTS.TRAINING_PLAN_COMPLETED]: TrainingPlanCompletedEvent

  // Workouts
  [ANALYTICS_EVENTS.WORKOUT_LOGGED]: WorkoutLoggedEvent
  [ANALYTICS_EVENTS.WORKOUT_COMPLETED]: WorkoutCompletedEvent
  [ANALYTICS_EVENTS.WORKOUT_SKIPPED]: WorkoutSkippedEvent
  [ANALYTICS_EVENTS.WORKOUT_RESCHEDULED]: WorkoutRescheduledEvent

  // Races
  [ANALYTICS_EVENTS.RACE_ADDED]: RaceAddedEvent
  [ANALYTICS_EVENTS.RACE_IMPORTED_GPX]: RaceImportedGPXEvent
  [ANALYTICS_EVENTS.RACE_IMPORTED_CSV]: RaceImportedCSVEvent
  [ANALYTICS_EVENTS.RACE_GOAL_SET]: RaceGoalSetEvent

  // Strava
  [ANALYTICS_EVENTS.STRAVA_CONNECT_INITIATED]: StravaConnectInitiatedEvent
  [ANALYTICS_EVENTS.STRAVA_CONNECTED]: StravaConnectedEvent
  [ANALYTICS_EVENTS.STRAVA_DISCONNECTED]: StravaDisconnectedEvent
  [ANALYTICS_EVENTS.STRAVA_SYNC_STARTED]: StravaSyncStartedEvent
  [ANALYTICS_EVENTS.STRAVA_SYNC_COMPLETED]: StravaSyncCompletedEvent
  [ANALYTICS_EVENTS.STRAVA_ACTIVITY_IMPORTED]: StravaActivityImportedEvent
  [ANALYTICS_EVENTS.STRAVA_WORKOUT_MATCHED]: StravaWorkoutMatchedEvent

  // Relationships
  [ANALYTICS_EVENTS.RELATIONSHIP_REQUESTED]: RelationshipRequestedEvent
  [ANALYTICS_EVENTS.RELATIONSHIP_ACCEPTED]: RelationshipAcceptedEvent
  [ANALYTICS_EVENTS.RELATIONSHIP_ENDED]: RelationshipEndedEvent

  // Communication
  [ANALYTICS_EVENTS.MESSAGE_SENT]: MessageSentEvent
  [ANALYTICS_EVENTS.CONVERSATION_STARTED]: ConversationStartedEvent

  // User
  [ANALYTICS_EVENTS.USER_SIGNED_UP]: UserSignedUpEvent
  [ANALYTICS_EVENTS.USER_SIGNED_IN]: UserSignedInEvent
  [ANALYTICS_EVENTS.USER_PROFILE_UPDATED]: UserProfileUpdatedEvent

  // Navigation
  [ANALYTICS_EVENTS.PAGE_VIEWED]: PageViewedEvent
  [ANALYTICS_EVENTS.DASHBOARD_VIEWED]: DashboardViewedEvent
  [ANALYTICS_EVENTS.WEEKLY_PLANNER_DAY_EXPANDED]: WeeklyPlannerDayExpandedEvent

  // Errors
  [ANALYTICS_EVENTS.ERROR_OCCURRED]: ErrorOccurredEvent
  [ANALYTICS_EVENTS.API_ERROR]: APIErrorEvent

  // Features
  [ANALYTICS_EVENTS.FEATURE_FLAG_EVALUATED]: FeatureFlagEvaluatedEvent
  [ANALYTICS_EVENTS.EXPORT_INITIATED]: ExportInitiatedEvent
  [ANALYTICS_EVENTS.FILTER_APPLIED]: FilterAppliedEvent
  [ANALYTICS_EVENTS.SEARCH_PERFORMED]: SearchPerformedEvent
}

/**
 * Type helper to extract event properties for a specific event
 * Usage: EventProperties<'workout_logged'> => WorkoutLoggedEvent
 */
export type EventProperties<K extends keyof AnalyticsEventMap> = AnalyticsEventMap[K]
