/**
 * Privacy Utilities
 *
 * Helper functions for enforcing user privacy settings throughout the application.
 * Handles profile visibility, data sharing, and privacy-aware data filtering.
 */
import type { PrivacySettings } from '@/lib/atoms/settings'
import { createLogger } from '@/lib/logger'

const logger = createLogger('PrivacyUtils')

export type PrivacyLevel = 'public' | 'coaches_only' | 'private'

export interface PrivacyCheckResult {
  canView: boolean
  reason?: string
}

/**
 * Check if a viewer can see a profile based on privacy settings
 */
export function canViewProfile(
  ownerId: string,
  viewerId: string,
  privacySettings: PrivacySettings | null | undefined,
  viewerRelationship?: 'coach' | 'runner' | null
): PrivacyCheckResult {
  // Owner can always view their own profile
  if (ownerId === viewerId) {
    return { canView: true }
  }

  // If no privacy settings, default to coaches_only for safety
  const visibility = privacySettings?.profile_visibility ?? 'coaches_only'

  logger.debug('Checking profile visibility:', {
    ownerId,
    viewerId,
    visibility,
    viewerRelationship,
  })

  switch (visibility) {
    case 'public':
      return { canView: true }

    case 'coaches_only':
      if (viewerRelationship === 'coach') {
        return { canView: true }
      }
      return {
        canView: false,
        reason: 'Profile is only visible to coaches',
      }

    case 'private':
      return {
        canView: false,
        reason: 'Profile is private',
      }

    default:
      logger.warn('Unknown privacy level:', { visibility })
      return {
        canView: false,
        reason: 'Unknown privacy setting',
      }
  }
}

/**
 * Check if activity stats should be shown
 */
export function canViewActivityStats(
  ownerId: string,
  viewerId: string,
  privacySettings: PrivacySettings | null | undefined
): boolean {
  // Owner can always see their own stats
  if (ownerId === viewerId) return true

  // Check privacy setting
  return privacySettings?.show_activity_stats ?? false
}

/**
 * Check if training calendar should be shown
 */
export function canViewTrainingCalendar(
  ownerId: string,
  viewerId: string,
  privacySettings: PrivacySettings | null | undefined
): boolean {
  // Owner can always see their own calendar
  if (ownerId === viewerId) return true

  // Check privacy setting
  return privacySettings?.show_training_calendar ?? false
}

/**
 * Check if location should be shown
 */
export function canViewLocation(
  ownerId: string,
  viewerId: string,
  privacySettings: PrivacySettings | null | undefined
): boolean {
  // Owner can always see their own location
  if (ownerId === viewerId) return true

  // Check privacy setting
  return privacySettings?.show_location ?? false
}

/**
 * Check if age should be shown
 */
export function canViewAge(
  ownerId: string,
  viewerId: string,
  privacySettings: PrivacySettings | null | undefined
): boolean {
  // Owner can always see their own age
  if (ownerId === viewerId) return true

  // Check privacy setting
  return privacySettings?.show_age ?? false
}

/**
 * Check if user accepts coach invitations
 */
export function acceptsCoachInvitations(
  privacySettings: PrivacySettings | null | undefined
): boolean {
  return privacySettings?.allow_coach_invitations ?? true
}

/**
 * Check if user accepts runner connections
 */
export function acceptsRunnerConnections(
  privacySettings: PrivacySettings | null | undefined
): boolean {
  return privacySettings?.allow_runner_connections ?? true
}

/**
 * Filter user data based on privacy settings
 * Removes sensitive fields that shouldn't be visible to the viewer
 */
export function filterUserDataByPrivacy<T extends Record<string, unknown>>(
  userData: T,
  ownerId: string,
  viewerId: string,
  privacySettings: PrivacySettings | null | undefined
): Partial<T> {
  // Owner sees everything
  if (ownerId === viewerId) {
    return userData
  }

  const filtered = { ...userData }

  // Remove location if not allowed
  if (!canViewLocation(ownerId, viewerId, privacySettings)) {
    delete filtered.location
    delete filtered.city
    delete filtered.state
    delete filtered.country
  }

  // Remove age/birthdate if not allowed
  if (!canViewAge(ownerId, viewerId, privacySettings)) {
    delete filtered.age
    delete filtered.birth_date
    delete filtered.birthdate
  }

  // Remove activity stats if not allowed
  if (!canViewActivityStats(ownerId, viewerId, privacySettings)) {
    delete filtered.total_miles
    delete filtered.total_workouts
    delete filtered.total_races
    delete filtered.pr_times
  }

  return filtered
}
