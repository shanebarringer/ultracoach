// Garmin Connect IQ Integration - Type Definitions
// Created: 2025-01-12
// Epic: ULT-16

// ============================================
// Garmin Training API Types
// ============================================

/**
 * Garmin sport type identifiers
 * @see https://developer.garmin.com/gc-developer-program/training-api/
 */
export interface GarminSportType {
  sportTypeId: number
  sportTypeKey: string
}

export const GARMIN_SPORT_TYPES = {
  RUNNING: { sportTypeId: 1, sportTypeKey: 'running' },
  CYCLING: { sportTypeId: 2, sportTypeKey: 'cycling' },
  TRAIL_RUNNING: { sportTypeId: 1, sportTypeKey: 'running' }, // Uses same ID as running
  SWIMMING: { sportTypeId: 5, sportTypeKey: 'swimming' },
} as const

/**
 * Garmin workout step types
 */
export interface GarminStepType {
  stepTypeId: number
  stepTypeKey: string
}

export const GARMIN_STEP_TYPES = {
  WARMUP: { stepTypeId: 3, stepTypeKey: 'warmup' },
  ACTIVE: { stepTypeId: 6, stepTypeKey: 'active' },
  RECOVERY: { stepTypeId: 4, stepTypeKey: 'recovery' },
  INTERVAL: { stepTypeId: 5, stepTypeKey: 'interval' },
  COOLDOWN: { stepTypeId: 7, stepTypeKey: 'cooldown' },
  REST: { stepTypeId: 2, stepTypeKey: 'rest' },
} as const

/**
 * Garmin duration types
 */
export interface GarminDurationType {
  durationTypeId: number
  durationTypeKey: string
}

export const GARMIN_DURATION_TYPES = {
  TIME: { durationTypeId: 2, durationTypeKey: 'time' }, // seconds
  DISTANCE: { durationTypeId: 1, durationTypeKey: 'distance' }, // meters
  LAP_BUTTON: { durationTypeId: 5, durationTypeKey: 'lap.button' },
  OPEN: { durationTypeId: 6, durationTypeKey: 'open' },
} as const

/**
 * Garmin target types
 */
export interface GarminTargetType {
  workoutTargetTypeId: number
  workoutTargetTypeKey: string
}

export const GARMIN_TARGET_TYPES = {
  PACE_ZONE: { workoutTargetTypeId: 3, workoutTargetTypeKey: 'pace.zone' },
  HEART_RATE_ZONE: { workoutTargetTypeId: 4, workoutTargetTypeKey: 'heart.rate.zone' },
  POWER_ZONE: { workoutTargetTypeId: 11, workoutTargetTypeKey: 'power.zone' },
  NO_TARGET: { workoutTargetTypeId: 1, workoutTargetTypeKey: 'no.target' },
} as const

// ============================================
// Garmin Workout JSON Structure
// ============================================

/**
 * Complete Garmin workout structure for Training API
 * @see https://developer.garmin.com/gc-developer-program/training-api/workout-json/
 */
export interface GarminWorkout {
  workoutId?: number // Garmin's workout ID (returned after creation)
  workoutName: string
  description?: string
  sportType: GarminSportType
  workoutSegments: GarminWorkoutSegment[]
}

/**
 * Workout segment containing ordered steps
 */
export interface GarminWorkoutSegment {
  segmentOrder: number
  sportType: GarminSportType
  workoutSteps: GarminWorkoutStep[]
}

/**
 * Individual workout step (interval, rest, etc.)
 */
export interface GarminWorkoutStep {
  stepId?: number
  stepOrder: number
  stepType: GarminStepType
  durationType: GarminDurationType
  durationValue: number
  targetType: GarminTargetType
  targetValueOne?: number // Zone low or pace value
  targetValueTwo?: number // Zone high or pace value
  targetValueCustom?: string // Custom target description
}

// ============================================
// Garmin Activity Types (for import)
// ============================================

/**
 * Garmin activity data structure
 */
export interface GarminActivity {
  activityId: number
  activityName: string
  activityType: string
  startTimeLocal: string // ISO 8601
  startTimeGMT: string // ISO 8601
  distance: number // meters
  duration: number // seconds
  elapsedDuration: number // seconds
  movingDuration: number // seconds
  elevationGain: number // meters
  elevationLoss: number // meters
  averageSpeed: number // m/s
  maxSpeed: number // m/s
  averageHR?: number // bpm
  maxHR?: number // bpm
  averagePower?: number // watts
  maxPower?: number // watts
  calories: number
  locationName?: string
  geoLocation?: {
    latitude: number
    longitude: number
  }
  deviceName?: string
}

/**
 * Garmin activity summary for listing
 */
export interface GarminActivitySummary {
  activityId: number
  activityName: string
  startTimeLocal: string
  distance: number
  duration: number
  activityType: string
}

// ============================================
// OAuth Types
// ============================================

/**
 * Garmin OAuth token response
 */
export interface GarminOAuthTokens {
  access_token: string
  token_type: string
  expires_in: number // seconds
  refresh_token: string
  scope: string
}

/**
 * Garmin OAuth user profile
 */
export interface GarminUserProfile {
  userId: number
  displayName: string
  emailAddress: string
  profileImage?: string
}

// ============================================
// Database Types (matching schema.ts)
// ============================================

/**
 * Garmin connection record
 */
export interface GarminConnection {
  id: string
  user_id: string
  garmin_user_id: string
  access_token: string // Encrypted
  refresh_token: string // Encrypted
  token_expires_at: Date
  scope: string | null
  created_at: Date
  updated_at: Date
  last_sync_at: Date | null
  sync_status: 'active' | 'expired' | 'disconnected'
}

/**
 * Garmin workout sync record
 */
export interface GarminWorkoutSync {
  id: string
  workout_id: string
  garmin_workout_id: string | null
  garmin_activity_id: number | null
  sync_direction: 'to_garmin' | 'from_garmin'
  sync_status: 'pending' | 'synced' | 'failed'
  sync_error: string | null
  synced_at: Date | null
  created_at: Date
  updated_at: Date
}

/**
 * Garmin device record
 */
export interface GarminDevice {
  id: string
  user_id: string
  device_id: string
  device_name: string
  device_model: string | null
  firmware_version: string | null
  last_seen_at: Date | null
  created_at: Date
}

// ============================================
// API Request/Response Types
// ============================================

/**
 * Request to sync workouts to Garmin
 */
export interface SyncWorkoutsRequest {
  workout_ids: string[]
  sync_mode: 'manual' | 'automatic'
}

/**
 * Response from sync operation
 */
export interface SyncWorkoutsResponse {
  success: boolean
  synced: number
  failed: number
  results: SyncResult[]
}

export interface SyncResult {
  workout_id: string
  garmin_workout_id?: number
  status: 'synced' | 'failed'
  error?: string
}

/**
 * Request to import Garmin activity
 */
export interface ImportActivityRequest {
  activity_id: number
  workout_id?: string // Optional: specify which workout to update
}

/**
 * Response from activity import
 */
export interface ImportActivityResponse {
  success: boolean
  workout_id: string
  activity_id: number
  matched: boolean
  confidence?: number
}

// ============================================
// Conversion Utilities Types
// ============================================

/**
 * UltraCoach to Garmin workout conversion options
 */
export interface WorkoutConversionOptions {
  includeWarmup?: boolean
  includeCooldown?: boolean
  warmupDuration?: number // seconds
  cooldownDuration?: number // seconds
  targetZoneOffset?: number // Adjust target zones up/down
}

/**
 * Activity matching result
 */
export interface ActivityMatchResult {
  workout_id: string
  confidence: number
  discrepancies: {
    distance_diff?: number // miles
    duration_diff?: number // minutes
    date_diff?: number // days
    type_match?: boolean
  }
}

// ============================================
// Error Types
// ============================================

/**
 * Garmin API error response
 */
export interface GarminAPIError {
  statusCode: number
  errorCode?: string
  message: string
  details?: unknown
}

/**
 * Custom error for Garmin integration
 */
export class GarminIntegrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message)
    this.name = 'GarminIntegrationError'
  }
}

// ============================================
// Utility Type Guards
// ============================================

/**
 * Check if error is a Garmin API error
 */
export function isGarminAPIError(error: unknown): error is GarminAPIError {
  return typeof error === 'object' && error !== null && 'statusCode' in error && 'message' in error
}

/**
 * Check if workout has required fields for Garmin sync
 */
export function isValidForSync(workout: {
  planned_distance?: number | null
  planned_duration?: number | null
  planned_type?: string | null
}): boolean {
  return !!((workout.planned_distance || workout.planned_duration) && workout.planned_type)
}
