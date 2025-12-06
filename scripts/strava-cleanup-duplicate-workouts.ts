#!/usr/bin/env tsx
import { config } from 'dotenv'
import { and, asc, eq, ilike } from 'drizzle-orm'

import { db } from '../src/lib/database'
import { createLogger } from '../src/lib/logger'
import { workouts } from '../src/lib/schema'

config({ path: '.env.local' })

const logger = createLogger('strava-duplicate-workouts')

interface StravaWorkoutRow {
  id: string
  user_id: string
  title: string | null
  date: Date | null
  actual_distance: string | null
  actual_duration: number | null
  status: string
  workout_notes: string | null
  created_at: Date | null
}

async function findStravaDuplicateWorkouts() {
  try {
    logger.info('Scanning for Strava-imported workout duplicates...')

    const stravaWorkouts = await db
      .select({
        id: workouts.id,
        user_id: workouts.user_id,
        title: workouts.title,
        date: workouts.date,
        actual_distance: workouts.actual_distance,
        actual_duration: workouts.actual_duration,
        status: workouts.status,
        workout_notes: workouts.workout_notes,
        created_at: workouts.created_at,
      })
      .from(workouts)
      .where(
        and(
          ilike(workouts.workout_notes, 'Imported from Strava:%'),
          eq(workouts.status, 'completed')
        )
      )
      .orderBy(asc(workouts.user_id), asc(workouts.date), asc(workouts.title), asc(workouts.id))

    if (stravaWorkouts.length === 0) {
      logger.info('No Strava-imported workouts found; nothing to scan.')
      return
    }

    const groups = new Map<string, StravaWorkoutRow[]>()

    for (const workout of stravaWorkouts) {
      const dateKey =
        workout.date instanceof Date ? workout.date.toISOString().slice(0, 10) : 'unknown-date'
      const normalizedTitle = (workout.title ?? '').trim().toLowerCase()
      const distanceKey = workout.actual_distance ?? 'null'
      const durationKey =
        typeof workout.actual_duration === 'number' ? workout.actual_duration.toString() : 'null'

      const groupKey = [workout.user_id, dateKey, normalizedTitle, distanceKey, durationKey].join(
        '|'
      )

      const existing = groups.get(groupKey)
      if (existing) {
        existing.push(workout)
      } else {
        groups.set(groupKey, [workout])
      }
    }

    const duplicateGroups: { key: string; workouts: StravaWorkoutRow[] }[] = []

    for (const [key, rows] of groups.entries()) {
      if (rows.length > 1) {
        duplicateGroups.push({ key, workouts: rows })
      }
    }

    if (duplicateGroups.length === 0) {
      logger.info('No obvious Strava duplicates detected.')
      return
    }

    logger.warn('Detected potential Strava duplicate workouts', {
      groupCount: duplicateGroups.length,
    })

    for (const group of duplicateGroups) {
      const [userId, dateKey, titleKey] = group.key.split('|', 3)

      logger.warn('Duplicate group', {
        userId,
        date: dateKey,
        title: titleKey,
        count: group.workouts.length,
      })

      const sorted = [...group.workouts].sort((a, b) => {
        const aTime = a.created_at instanceof Date ? a.created_at.getTime() : 0
        const bTime = b.created_at instanceof Date ? b.created_at.getTime() : 0
        return aTime - bTime
      })

      const [canonical, ...duplicates] = sorted

      logger.info('Canonical workout (kept)', {
        id: canonical.id,
        distance: canonical.actual_distance,
        duration: canonical.actual_duration,
        created_at: canonical.created_at,
      })

      for (const dup of duplicates) {
        logger.info('Duplicate candidate', {
          id: dup.id,
          distance: dup.actual_distance,
          duration: dup.actual_duration,
          created_at: dup.created_at,
        })
      }

      // To actually delete duplicates once you are happy with this report,
      // uncomment the block below and run this script again in a safe environment.
      //
      // const duplicateIds = duplicates.map(workout => workout.id)
      // if (duplicateIds.length > 0) {
      //   await db.delete(workouts).where(inArray(workouts.id, duplicateIds))
      //   logger.info('Deleted duplicate workouts', {
      //     key: group.key,
      //     deletedCount: duplicateIds.length,
      //   })
      // }
    }

    logger.info('Finished Strava duplicate detection. Review logs before enabling deletions.')
  } catch (error) {
    logger.error('Failed to scan Strava duplicate workouts', {
      error: error instanceof Error ? error.message : String(error),
    })
    process.exit(1)
  }
}

findStravaDuplicateWorkouts().then(() => {
  process.exit(0)
})
