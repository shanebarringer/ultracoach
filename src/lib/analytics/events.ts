/**
 * Analytics Events - Centralized Event Schema
 *
 * Single source of truth for all PostHog analytics events.
 * Using `as const` provides type safety and autocomplete support.
 *
 * Event Naming Convention:
 * - Use snake_case for consistency with PostHog conventions
 * - Use past tense for completed actions (e.g., 'workout_logged')
 * - Use present tense for ongoing actions (e.g., 'strava_connect_initiated')
 * - Group related events with common prefixes (e.g., 'workout_*', 'strava_*')
 */

export const ANALYTICS_EVENTS = {
  // ========================================
  // Training Plans
  // ========================================
  TRAINING_PLAN_CREATED: 'training_plan_created',
  TRAINING_PLAN_UPDATED: 'training_plan_updated',
  TRAINING_PLAN_DELETED: 'training_plan_deleted',
  TRAINING_PLAN_STARTED: 'training_plan_started',
  TRAINING_PLAN_COMPLETED: 'training_plan_completed',
  TRAINING_PLAN_ABANDONED: 'training_plan_abandoned',
  TRAINING_PLAN_SHARED: 'training_plan_shared',
  TRAINING_PLAN_TEMPLATE_USED: 'training_plan_template_used',

  // ========================================
  // Workouts
  // ========================================
  WORKOUT_CREATED: 'workout_created',
  WORKOUT_UPDATED: 'workout_updated',
  WORKOUT_DELETED: 'workout_deleted',
  WORKOUT_LOGGED: 'workout_logged', // Currently in use
  WORKOUT_COMPLETED: 'workout_completed',
  WORKOUT_SKIPPED: 'workout_skipped',
  WORKOUT_RESCHEDULED: 'workout_rescheduled',
  WORKOUT_NOTES_ADDED: 'workout_notes_added',

  // ========================================
  // Races
  // ========================================
  RACE_ADDED: 'race_added',
  RACE_UPDATED: 'race_updated',
  RACE_DELETED: 'race_deleted',
  RACE_REGISTERED: 'race_registered',
  RACE_COMPLETED: 'race_completed',
  RACE_IMPORTED_GPX: 'race_imported_gpx',
  RACE_IMPORTED_CSV: 'race_imported_csv',
  RACE_GOAL_SET: 'race_goal_set',

  // ========================================
  // Strava Integration
  // ========================================
  STRAVA_CONNECT_INITIATED: 'strava_connect_initiated', // Currently in use
  STRAVA_CONNECTED: 'strava_connected',
  STRAVA_DISCONNECTED: 'strava_disconnected',
  STRAVA_SYNC_STARTED: 'strava_sync_started',
  STRAVA_SYNC_COMPLETED: 'strava_sync_completed',
  STRAVA_SYNC_FAILED: 'strava_sync_failed',
  STRAVA_ACTIVITY_IMPORTED: 'strava_activity_imported',
  STRAVA_WORKOUT_MATCHED: 'strava_workout_matched',

  // ========================================
  // Coach-Runner Relationships
  // ========================================
  RELATIONSHIP_REQUESTED: 'relationship_requested',
  RELATIONSHIP_ACCEPTED: 'relationship_accepted',
  RELATIONSHIP_REJECTED: 'relationship_rejected',
  RELATIONSHIP_ENDED: 'relationship_ended',
  COACH_INVITATION_SENT: 'coach_invitation_sent',
  RUNNER_INVITATION_ACCEPTED: 'runner_invitation_accepted',

  // ========================================
  // Communication
  // ========================================
  MESSAGE_SENT: 'message_sent',
  MESSAGE_RECEIVED: 'message_received',
  CONVERSATION_STARTED: 'conversation_started',
  NOTIFICATION_SENT: 'notification_sent',
  NOTIFICATION_READ: 'notification_read',
  NOTIFICATION_CLICKED: 'notification_clicked',

  // ========================================
  // User Authentication & Profile
  // ========================================
  USER_SIGNED_UP: 'user_signed_up',
  USER_SIGNED_IN: 'user_signed_in',
  USER_SIGNED_OUT: 'user_signed_out',
  USER_PROFILE_UPDATED: 'user_profile_updated',
  USER_SETTINGS_CHANGED: 'user_settings_changed',
  USER_PASSWORD_RESET: 'user_password_reset',

  // ========================================
  // Navigation & Engagement
  // ========================================
  PAGE_VIEWED: 'page_viewed',
  DASHBOARD_VIEWED: 'dashboard_viewed',
  CALENDAR_VIEWED: 'calendar_viewed',
  WEEKLY_PLANNER_VIEWED: 'weekly_planner_viewed',
  WEEKLY_PLANNER_DAY_EXPANDED: 'weekly_planner_day_expanded',
  TRAINING_LOG_VIEWED: 'training_log_viewed',

  // ========================================
  // Error Tracking
  // ========================================
  ERROR_OCCURRED: 'error_occurred',
  API_ERROR: 'api_error',
  VALIDATION_ERROR: 'validation_error',
  NETWORK_ERROR: 'network_error',

  // ========================================
  // Feature Usage
  // ========================================
  FEATURE_FLAG_EVALUATED: 'feature_flag_evaluated',
  EXPORT_INITIATED: 'export_initiated',
  EXPORT_COMPLETED: 'export_completed',
  IMPORT_INITIATED: 'import_initiated',
  IMPORT_COMPLETED: 'import_completed',
  FILTER_APPLIED: 'filter_applied',
  SEARCH_PERFORMED: 'search_performed',
} as const

/**
 * Type representing all valid analytics event names
 * Provides autocomplete and compile-time validation
 */
export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]

/**
 * Helper function to validate event names at runtime
 * Useful for debugging and error handling
 */
export function isValidEventName(name: string): name is AnalyticsEventName {
  return Object.values(ANALYTICS_EVENTS).includes(name as AnalyticsEventName)
}

/**
 * Get all event names as an array
 * Useful for testing and validation
 */
export function getAllEventNames(): AnalyticsEventName[] {
  return Object.values(ANALYTICS_EVENTS)
}
