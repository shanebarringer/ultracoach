/**
 * Activity Deduplication Utilities
 *
 * Handles conflict detection and resolution when multiple sources
 * (Strava, Garmin, manual) try to provide data for the same workout.
 */
import { eq } from 'drizzle-orm'

import { db } from '@/lib/database'
import { createLogger } from '@/lib/logger'
import { garmin_workout_syncs, strava_activity_syncs, user_settings, workouts } from '@/lib/schema'

const logger = createLogger('activity-dedup')

export type ActivitySource = 'strava' | 'garmin' | 'manual' | 'auto'

export interface DedupResult {
  shouldProceed: boolean
  reason?: string
  existingSource?: ActivitySource
  userPreference: ActivitySource
}

interface TrainingPreferences {
  preferred_activity_source?: ActivitySource
  [key: string]: unknown
}

/**
 * Get user's preferred activity source from settings
 */
export async function getUserActivityPreference(userId: string): Promise<ActivitySource> {
  try {
    const [settings] = await db
      .select({ training_preferences: user_settings.training_preferences })
      .from(user_settings)
      .where(eq(user_settings.user_id, userId))

    const prefs = settings?.training_preferences as TrainingPreferences | null
    return prefs?.preferred_activity_source ?? 'auto'
  } catch (error) {
    logger.error('Failed to get user activity preference', { userId, error })
    return 'auto'
  }
}

/**
 * Check if a workout already has actual data from an external source
 */
export async function getWorkoutActivitySource(workoutId: string): Promise<ActivitySource | null> {
  try {
    // Check for Strava sync
    const [stravaSync] = await db
      .select()
      .from(strava_activity_syncs)
      .where(eq(strava_activity_syncs.ultracoach_workout_id, workoutId))

    if (stravaSync && stravaSync.sync_status === 'synced') {
      return 'strava'
    }

    // Check for Garmin sync
    const [garminSync] = await db
      .select()
      .from(garmin_workout_syncs)
      .where(eq(garmin_workout_syncs.workout_id, workoutId))

    if (garminSync && garminSync.sync_status === 'synced') {
      return 'garmin'
    }

    // Check if workout has actual data but no sync record (manual entry)
    const [workout] = await db
      .select({
        actual_distance: workouts.actual_distance,
        actual_duration: workouts.actual_duration,
      })
      .from(workouts)
      .where(eq(workouts.id, workoutId))

    if (workout?.actual_distance || workout?.actual_duration) {
      return 'manual'
    }

    return null
  } catch (error) {
    logger.error('Failed to check workout activity source', { workoutId, error })
    return null
  }
}

/**
 * Determine if an import should proceed based on:
 * 1. Whether the workout already has data from another source
 * 2. User's preferred activity source setting
 *
 * @param userId - The user's ID
 * @param workoutId - The workout being updated (optional for new workout creation)
 * @param importSource - The source trying to import ('strava' | 'garmin')
 */
export async function shouldAllowImport(
  userId: string,
  workoutId: string | null,
  importSource: 'strava' | 'garmin'
): Promise<DedupResult> {
  const userPreference = await getUserActivityPreference(userId)

  // If manual only, block all external imports
  if (userPreference === 'manual') {
    return {
      shouldProceed: false,
      reason: 'User preference is set to manual-only data entry',
      userPreference,
    }
  }

  // If no workout ID (creating new), check preference
  if (!workoutId) {
    // For new workouts, only block if preference is specifically set to the other source
    if (userPreference !== 'auto' && userPreference !== importSource) {
      return {
        shouldProceed: false,
        reason: `User prefers ${userPreference} as their activity source`,
        userPreference,
      }
    }

    return {
      shouldProceed: true,
      userPreference,
    }
  }

  // Check if workout already has data from another source
  const existingSource = await getWorkoutActivitySource(workoutId)

  // No existing data - allow import
  if (!existingSource) {
    return {
      shouldProceed: true,
      userPreference,
    }
  }

  // Same source trying to update - allow (idempotent)
  if (existingSource === importSource) {
    return {
      shouldProceed: true,
      existingSource,
      userPreference,
    }
  }

  // Different source trying to update - check preference
  if (userPreference === 'auto') {
    // Auto mode: first source wins, block subsequent sources
    return {
      shouldProceed: false,
      reason: `Workout already has ${existingSource} data. In auto mode, first source wins.`,
      existingSource,
      userPreference,
    }
  }

  if (userPreference === importSource) {
    // User prefers this source - allow overwrite
    logger.info('Allowing import to overwrite existing data based on user preference', {
      workoutId,
      existingSource,
      importSource,
      userPreference,
    })
    return {
      shouldProceed: true,
      existingSource,
      userPreference,
    }
  }

  // User prefers a different source - block
  return {
    shouldProceed: false,
    reason: `Workout already has ${existingSource} data and user prefers ${userPreference}`,
    existingSource,
    userPreference,
  }
}

/**
 * Log a deduplication decision for debugging/analytics
 */
export function logDedupDecision(
  action: 'allow' | 'block',
  details: {
    userId: string
    workoutId?: string | null
    importSource: 'strava' | 'garmin'
    existingSource?: ActivitySource | null
    userPreference: ActivitySource
    reason?: string
  }
): void {
  const logData = {
    action,
    ...details,
  }

  if (action === 'allow') {
    logger.debug('Import allowed', logData)
  } else {
    logger.info('Import blocked by deduplication', logData)
  }
}
