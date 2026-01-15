/**
 * Shared API Response Types
 *
 * This file provides a single source of truth for all API response types.
 * All API routes and consumers should use these shared types to ensure consistency.
 */

// =============================================================================
// Common Types
// =============================================================================

/**
 * Relationship status between coach and runner
 */
export type RelationshipStatus = 'pending' | 'active' | 'inactive'

/**
 * User type (role) in the application
 */
export type UserType = 'runner' | 'coach'

/**
 * Statistics for connected users (coaches or runners)
 */
export interface UserStats {
  trainingPlans: number
  completedWorkouts: number
  upcomingWorkouts: number
}

/**
 * Base user fields common to all user responses
 */
export interface BaseUserResponse {
  id: string
  email: string
}

// =============================================================================
// Runner Response Types
// =============================================================================

/**
 * Runner with statistics and relationship data
 * Returned by GET /api/runners for connected runners
 */
export interface RunnerWithStats extends BaseUserResponse {
  full_name: string | null
  role: string // Contains userType value from database
  created_at: string
  relationship_status: RelationshipStatus
  connected_at: string | null
  stats?: UserStats
}

/**
 * Response from GET /api/runners
 * Returns runners connected to the authenticated coach
 */
export interface RunnersResponse {
  runners: RunnerWithStats[]
}

/**
 * Available runner for connection
 * Returned by GET /api/runners/available
 */
export interface AvailableRunner {
  id: string
  name: string
  fullName: string | null
  email: string
  createdAt: Date | null
}

/**
 * Response from GET /api/runners/available
 * Returns runners not yet connected to the authenticated coach
 */
export interface AvailableRunnersResponse {
  runners: AvailableRunner[]
}

// =============================================================================
// Coach Response Types
// =============================================================================

/**
 * Coach with statistics and relationship data
 * Returned by GET /api/coaches for connected coaches
 */
export interface CoachWithStats extends BaseUserResponse {
  full_name: string | null
  role: string // Contains userType value from database
  created_at: string
  relationship_status: RelationshipStatus
  connected_at: string | null
  stats?: UserStats
}

/**
 * Response from GET /api/coaches
 * Returns coaches connected to the authenticated runner
 */
export interface CoachesResponse {
  coaches: CoachWithStats[]
}

/**
 * Available coach for connection
 * Returned by GET /api/coaches/available
 */
export interface AvailableCoach {
  id: string
  name: string
  fullName: string | null
  email: string
  createdAt: Date | null
}

/**
 * Response from GET /api/coaches/available
 * Returns coaches not yet connected to the authenticated runner
 */
export interface AvailableCoachesResponse {
  coaches: AvailableCoach[]
}

// =============================================================================
// Generic API Error Response
// =============================================================================

/**
 * Standard error response from API routes
 */
export interface ApiErrorResponse {
  error: string
}
