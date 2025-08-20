/**
 * Intelligent Workout Matching & Conflict Detection
 * 
 * This module provides algorithms to match Strava activities with planned workouts
 * and detect potential conflicts or discrepancies between planned vs actual workouts.
 * 
 * Key features:
 * - Date-based matching with fuzzy tolerance
 * - Distance and duration similarity scoring
 * - Activity type correlation (Run, Long Run, etc.)
 * - Conflict detection and resolution suggestions
 * - Batch processing for multiple activities
 */

import { createLogger } from '@/lib/logger'
import type { Workout } from '@/lib/supabase'
import type { StravaActivity } from '@/types/strava'

const logger = createLogger('WorkoutMatching')

export interface WorkoutMatch {
  workout: Workout
  activity: StravaActivity
  confidence: number // 0-1 score
  matchType: 'exact' | 'probable' | 'possible' | 'conflict'
  discrepancies: WorkoutDiscrepancy[]
  suggestions: string[]
}

export interface WorkoutDiscrepancy {
  field: 'distance' | 'duration' | 'type' | 'date'
  planned: string | number
  actual: string | number
  severity: 'minor' | 'moderate' | 'major'
  description: string
}

export interface MatchingOptions {
  dateTolerance: number // days
  distanceTolerance: number // percentage (0-1)
  durationTolerance: number // percentage (0-1)
  minConfidence: number // minimum confidence to consider a match
}

export const defaultMatchingOptions: MatchingOptions = {
  dateTolerance: 1, // 1 day tolerance
  distanceTolerance: 0.15, // 15% distance tolerance
  durationTolerance: 0.20, // 20% duration tolerance
  minConfidence: 0.3, // 30% minimum confidence
}

/**
 * Match a single Strava activity against a list of planned workouts
 */
export function matchActivityToWorkouts(
  activity: StravaActivity,
  workouts: Workout[],
  options: MatchingOptions = defaultMatchingOptions
): WorkoutMatch[] {
  const matches: WorkoutMatch[] = []

  for (const workout of workouts) {
    const match = calculateMatchScore(activity, workout, options)
    if (match.confidence >= options.minConfidence) {
      matches.push(match)
    }
  }

  // Sort by confidence (highest first)
  matches.sort((a, b) => b.confidence - a.confidence)

  logger.debug(`Found ${matches.length} potential matches for activity "${activity.name}"`, {
    activityId: activity.id,
    matches: matches.map(m => ({ workoutId: m.workout.id, confidence: m.confidence }))
  })

  return matches
}

/**
 * Batch process multiple Strava activities against planned workouts
 */
export function batchMatchActivities(
  activities: StravaActivity[],
  workouts: Workout[],
  options: MatchingOptions = defaultMatchingOptions
): Map<number, WorkoutMatch[]> {
  const matchMap = new Map<number, WorkoutMatch[]>()

  logger.info(`Starting batch matching for ${activities.length} activities against ${workouts.length} workouts`)

  for (const activity of activities) {
    const matches = matchActivityToWorkouts(activity, workouts, options)
    if (matches.length > 0) {
      matchMap.set(activity.id, matches)
    }
  }

  logger.info(`Batch matching complete: ${matchMap.size} activities have potential matches`)

  return matchMap
}

/**
 * Calculate match score between a Strava activity and planned workout
 */
function calculateMatchScore(
  activity: StravaActivity,
  workout: Workout,
  options: MatchingOptions
): WorkoutMatch {
  const discrepancies: WorkoutDiscrepancy[] = []
  let confidence = 0
  let matchType: WorkoutMatch['matchType'] = 'possible'
  const suggestions: string[] = []

  // Date matching (most important factor)
  const activityDate = new Date(activity.start_date).toISOString().split('T')[0]
  const workoutDate = workout.date
  const dateDifference = Math.abs(
    (new Date(activityDate).getTime() - new Date(workoutDate).getTime()) / (1000 * 60 * 60 * 24)
  )

  if (dateDifference === 0) {
    confidence += 0.4 // Same day gets high score
  } else if (dateDifference <= options.dateTolerance) {
    confidence += 0.3 - (dateDifference / options.dateTolerance) * 0.1 // Gradual decrease
  } else {
    discrepancies.push({
      field: 'date',
      planned: workoutDate,
      actual: activityDate,
      severity: dateDifference > 3 ? 'major' : 'moderate',
      description: `Activity completed ${dateDifference} days away from planned date`
    })
  }

  // Distance matching
  const plannedDistance = workout.planned_distance || 0
  const actualDistance = activity.distance / 1609.34 // Convert meters to miles
  
  if (plannedDistance > 0 && actualDistance > 0) {
    const distanceRatio = Math.abs(actualDistance - plannedDistance) / plannedDistance
    
    if (distanceRatio <= options.distanceTolerance) {
      confidence += 0.25
    } else {
      const severity = distanceRatio > 0.5 ? 'major' : distanceRatio > 0.25 ? 'moderate' : 'minor'
      discrepancies.push({
        field: 'distance',
        planned: plannedDistance,
        actual: Number(actualDistance.toFixed(2)),
        severity,
        description: `Distance variance of ${(distanceRatio * 100).toFixed(1)}%`
      })
      
      if (distanceRatio < 0.5) {
        confidence += 0.1 // Partial credit for being within reasonable range
      }
    }
  }

  // Duration matching
  const plannedDuration = workout.planned_duration || 0
  const actualDuration = Math.round(activity.moving_time / 60) // Convert seconds to minutes
  
  if (plannedDuration > 0 && actualDuration > 0) {
    const durationRatio = Math.abs(actualDuration - plannedDuration) / plannedDuration
    
    if (durationRatio <= options.durationTolerance) {
      confidence += 0.2
    } else {
      const severity = durationRatio > 0.5 ? 'major' : durationRatio > 0.3 ? 'moderate' : 'minor'
      discrepancies.push({
        field: 'duration',
        planned: plannedDuration,
        actual: actualDuration,
        severity,
        description: `Duration variance of ${(durationRatio * 100).toFixed(1)}%`
      })
      
      if (durationRatio < 0.4) {
        confidence += 0.05 // Partial credit
      }
    }
  }

  // Activity type matching
  const activityType = activity.type.toLowerCase()
  const workoutType = (workout.planned_type || '').toLowerCase()
  
  if (activityType === 'run' && workoutType.includes('run')) {
    confidence += 0.15
  } else if (activityType === workoutType) {
    confidence += 0.15
  } else if (activityType !== 'run') {
    discrepancies.push({
      field: 'type',
      planned: workout.planned_type || 'Unknown',
      actual: activity.type,
      severity: 'moderate',
      description: `Activity type "${activity.type}" doesn't match planned type "${workout.planned_type}"`
    })
  }

  // Determine match type and generate suggestions
  if (confidence >= 0.8 && discrepancies.length === 0) {
    matchType = 'exact'
    suggestions.push('Perfect match - ready to sync')
  } else if (confidence >= 0.6 && discrepancies.filter(d => d.severity === 'major').length === 0) {
    matchType = 'probable'
    suggestions.push('High confidence match - minor differences detected')
  } else if (confidence >= options.minConfidence) {
    matchType = 'possible'
    suggestions.push('Possible match with notable differences - review before syncing')
  } else {
    matchType = 'conflict'
    suggestions.push('Low confidence match - significant conflicts detected')
  }

  // Add specific suggestions based on discrepancies
  if (discrepancies.some(d => d.field === 'distance' && d.severity !== 'minor')) {
    suggestions.push('Consider updating planned distance to match actual performance')
  }
  if (discrepancies.some(d => d.field === 'duration' && d.severity !== 'minor')) {
    suggestions.push('Duration difference may indicate pacing adjustments needed')
  }
  if (discrepancies.some(d => d.field === 'date')) {
    suggestions.push('Workout was completed on a different date than planned')
  }

  return {
    workout,
    activity,
    confidence: Math.min(1, confidence), // Cap at 1.0
    matchType,
    discrepancies,
    suggestions
  }
}

/**
 * Find unmatched planned workouts that might need attention
 */
export function findUnmatchedWorkouts(
  workouts: Workout[],
  matches: Map<number, WorkoutMatch[]>
): Workout[] {
  const matchedWorkoutIds = new Set<string>()
  
  // Collect all matched workout IDs
  for (const matchList of matches.values()) {
    for (const match of matchList) {
      if (match.confidence > 0.5) { // Only consider high-confidence matches
        matchedWorkoutIds.add(match.workout.id)
      }
    }
  }

  // Filter to workouts that are planned but not matched
  return workouts.filter(workout => 
    workout.status === 'planned' && 
    !matchedWorkoutIds.has(workout.id) &&
    new Date(workout.date) <= new Date() // Only past or current workouts
  )
}

/**
 * Generate a summary report of matching results
 */
export function generateMatchingSummary(
  activities: StravaActivity[],
  workouts: Workout[],
  matches: Map<number, WorkoutMatch[]>
): {
  total: {
    activities: number
    workouts: number
    matches: number
  }
  by_confidence: {
    exact: number
    probable: number
    possible: number
    conflicts: number
  }
  unmatched_workouts: number
  suggestions: string[]
} {
  const allMatches = Array.from(matches.values()).flat()
  const unmatchedWorkouts = findUnmatchedWorkouts(workouts, matches)

  const byConfidence = allMatches.reduce((acc, match) => {
    if (match.matchType === 'conflict') {
      acc.conflicts++
    } else {
      acc[match.matchType]++
    }
    return acc
  }, { exact: 0, probable: 0, possible: 0, conflicts: 0 })

  const suggestions: string[] = []
  
  if (byConfidence.exact > 0) {
    suggestions.push(`${byConfidence.exact} activities are perfect matches and ready to sync`)
  }
  if (byConfidence.probable > 0) {
    suggestions.push(`${byConfidence.probable} activities are probable matches - review minor differences`)
  }
  if (byConfidence.possible > 0) {
    suggestions.push(`${byConfidence.possible} activities are possible matches - check for conflicts`)
  }
  if (byConfidence.conflicts > 0) {
    suggestions.push(`${byConfidence.conflicts} activities have conflicts - manual review required`)
  }
  if (unmatchedWorkouts.length > 0) {
    suggestions.push(`${unmatchedWorkouts.length} planned workouts have no matching activities`)
  }

  return {
    total: {
      activities: activities.length,
      workouts: workouts.length,
      matches: allMatches.length
    },
    by_confidence: byConfidence,
    unmatched_workouts: unmatchedWorkouts.length,
    suggestions
  }
}