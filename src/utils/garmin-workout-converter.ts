// Garmin Workout Format Converter
// Converts UltraCoach workouts to Garmin Training API JSON format
// Created: 2025-01-12
// Epic: ULT-16
import { createLogger } from '@/lib/logger'
import type {
  GarminWorkout,
  GarminWorkoutSegment,
  GarminWorkoutStep,
  WorkoutConversionOptions,
} from '@/types/garmin'

const logger = createLogger('garmin-workout-converter')

// Import constants from types
const SPORT_TYPES = {
  RUNNING: { sportTypeId: 1, sportTypeKey: 'running' },
  CYCLING: { sportTypeId: 2, sportTypeKey: 'cycling' },
  TRAIL_RUNNING: { sportTypeId: 1, sportTypeKey: 'running' },
} as const

const STEP_TYPES = {
  WARMUP: { stepTypeId: 3, stepTypeKey: 'warmup' },
  ACTIVE: { stepTypeId: 6, stepTypeKey: 'active' },
  RECOVERY: { stepTypeId: 4, stepTypeKey: 'recovery' },
  INTERVAL: { stepTypeId: 5, stepTypeKey: 'interval' },
  COOLDOWN: { stepTypeId: 7, stepTypeKey: 'cooldown' },
} as const

const DURATION_TYPES = {
  TIME: { durationTypeId: 2, durationTypeKey: 'time' },
  DISTANCE: { durationTypeId: 1, durationTypeKey: 'distance' },
} as const

const TARGET_TYPES = {
  PACE_ZONE: { workoutTargetTypeId: 3, workoutTargetTypeKey: 'pace.zone' },
  HEART_RATE_ZONE: { workoutTargetTypeId: 4, workoutTargetTypeKey: 'heart.rate.zone' },
  NO_TARGET: { workoutTargetTypeId: 1, workoutTargetTypeKey: 'no.target' },
} as const

/**
 * UltraCoach workout structure (simplified)
 */
interface UltraCoachWorkout {
  id: string
  title: string
  date: string | Date
  planned_distance?: number | null // miles
  planned_duration?: number | null // seconds
  planned_type?: string | null
  category?: string | null // 'easy', 'tempo', 'interval', 'long_run', 'race_simulation'
  intensity?: number | null // 1-10
  terrain?: string | null
  workout_notes?: string | null
}

/**
 * Convert UltraCoach workout to Garmin Training API format
 */
export function convertWorkoutToGarmin(
  workout: UltraCoachWorkout,
  options: WorkoutConversionOptions = {}
): GarminWorkout {
  logger.info('Converting workout to Garmin format', {
    workoutId: workout.id,
    title: workout.title,
    category: workout.category,
  })

  // Default options
  const {
    includeWarmup = true,
    includeCooldown = true,
    warmupDuration = 600, // 10 minutes
    cooldownDuration = 600, // 10 minutes
  } = options

  // Determine sport type
  const sportType = mapSportType(workout.planned_type, workout.terrain)

  // Build workout steps
  const steps: GarminWorkoutStep[] = []
  let stepOrder = 1

  // Add warmup if requested
  if (includeWarmup) {
    steps.push(createWarmupStep(stepOrder++, warmupDuration))
  }

  // Add main workout step(s)
  const mainSteps = createMainWorkoutSteps(workout, stepOrder)
  steps.push(...mainSteps)
  stepOrder += mainSteps.length

  // Add cooldown if requested
  if (includeCooldown) {
    steps.push(createCooldownStep(stepOrder++, cooldownDuration))
  }

  // Create workout segment
  const segment: GarminWorkoutSegment = {
    segmentOrder: 1,
    sportType,
    workoutSteps: steps,
  }

  // Build final Garmin workout
  const garminWorkout: GarminWorkout = {
    workoutName: `UltraCoach - ${workout.title}`,
    description: workout.workout_notes || undefined,
    sportType,
    workoutSegments: [segment],
  }

  logger.debug('Workout converted successfully', {
    workoutId: workout.id,
    totalSteps: steps.length,
    hasWarmup: includeWarmup,
    hasCooldown: includeCooldown,
  })

  return garminWorkout
}

/**
 * Map UltraCoach workout type to Garmin sport type
 */
function mapSportType(
  plannedType?: string | null,
  terrain?: string | null
): typeof SPORT_TYPES.RUNNING {
  // Default to running
  if (!plannedType) return SPORT_TYPES.RUNNING

  const type = plannedType.toLowerCase()

  if (type.includes('cycling') || type.includes('bike')) {
    return SPORT_TYPES.CYCLING
  }

  if (type.includes('trail') || terrain === 'trail') {
    return SPORT_TYPES.TRAIL_RUNNING
  }

  return SPORT_TYPES.RUNNING
}

/**
 * Create warmup step
 */
function createWarmupStep(stepOrder: number, duration: number): GarminWorkoutStep {
  return {
    stepOrder,
    stepType: STEP_TYPES.WARMUP,
    durationType: DURATION_TYPES.TIME,
    durationValue: duration, // seconds
    targetType: TARGET_TYPES.PACE_ZONE,
    targetValueOne: 1, // Easy zone
    targetValueTwo: 2,
  }
}

/**
 * Create cooldown step
 */
function createCooldownStep(stepOrder: number, duration: number): GarminWorkoutStep {
  return {
    stepOrder,
    stepType: STEP_TYPES.COOLDOWN,
    durationType: DURATION_TYPES.TIME,
    durationValue: duration, // seconds
    targetType: TARGET_TYPES.PACE_ZONE,
    targetValueOne: 1, // Easy zone
    targetValueTwo: 2,
  }
}

/**
 * Create main workout steps based on category
 */
function createMainWorkoutSteps(
  workout: UltraCoachWorkout,
  startingStepOrder: number
): GarminWorkoutStep[] {
  const category = workout.category?.toLowerCase()

  switch (category) {
    case 'interval':
      return createIntervalSteps(workout, startingStepOrder)
    case 'tempo':
      return createTempoSteps(workout, startingStepOrder)
    case 'easy':
    case 'long_run':
    case 'race_simulation':
    default:
      return [createSteadyStateStep(workout, startingStepOrder)]
  }
}

/**
 * Create interval workout steps
 */
function createIntervalSteps(
  workout: UltraCoachWorkout,
  startingStepOrder: number
): GarminWorkoutStep[] {
  const steps: GarminWorkoutStep[] = []
  let stepOrder = startingStepOrder

  // For intervals, we'll create a simple pattern:
  // 5 x (3 min hard + 2 min recovery)
  const intervals = 5
  const hardDuration = 180 // 3 minutes
  const recoveryDuration = 120 // 2 minutes

  for (let i = 0; i < intervals; i++) {
    // Hard interval
    steps.push({
      stepOrder: stepOrder++,
      stepType: STEP_TYPES.INTERVAL,
      durationType: DURATION_TYPES.TIME,
      durationValue: hardDuration,
      targetType: TARGET_TYPES.PACE_ZONE,
      targetValueOne: 4, // Threshold zone
      targetValueTwo: 5,
    })

    // Recovery interval
    steps.push({
      stepOrder: stepOrder++,
      stepType: STEP_TYPES.RECOVERY,
      durationType: DURATION_TYPES.TIME,
      durationValue: recoveryDuration,
      targetType: TARGET_TYPES.PACE_ZONE,
      targetValueOne: 2, // Easy zone
      targetValueTwo: 3,
    })
  }

  return steps
}

/**
 * Create tempo workout steps
 */
function createTempoSteps(
  workout: UltraCoachWorkout,
  startingStepOrder: number
): GarminWorkoutStep[] {
  // Tempo run: sustained effort at threshold pace
  const tempoDuration = workout.planned_duration
    ? workout.planned_duration - 1200 // Subtract warmup/cooldown (10 min each)
    : 2700 // Default 45 minutes

  return [
    {
      stepOrder: startingStepOrder,
      stepType: STEP_TYPES.ACTIVE,
      durationType: DURATION_TYPES.TIME,
      durationValue: Math.max(tempoDuration, 1200), // Minimum 20 minutes
      targetType: TARGET_TYPES.PACE_ZONE,
      targetValueOne: 3, // Tempo zone
      targetValueTwo: 4,
    },
  ]
}

/**
 * Create steady-state workout step (easy, long run)
 */
function createSteadyStateStep(workout: UltraCoachWorkout, stepOrder: number): GarminWorkoutStep {
  // Determine duration or distance
  const useDuration = !!workout.planned_duration
  const durationType = useDuration ? DURATION_TYPES.TIME : DURATION_TYPES.DISTANCE
  const durationValue = useDuration
    ? workout.planned_duration || 3600 // Default 1 hour
    : Math.round((workout.planned_distance || 5) * 1609.34) // Miles to meters

  // Determine intensity zone based on category and intensity
  const { targetValueOne, targetValueTwo } = determineTargetZone(
    workout.category,
    workout.intensity
  )

  return {
    stepOrder,
    stepType: STEP_TYPES.ACTIVE,
    durationType,
    durationValue,
    targetType: TARGET_TYPES.PACE_ZONE,
    targetValueOne,
    targetValueTwo,
  }
}

/**
 * Determine target pace zone based on workout category and intensity
 */
function determineTargetZone(
  category?: string | null,
  intensity?: number | null
): { targetValueOne: number; targetValueTwo: number } {
  // If intensity is specified, use it directly
  if (intensity) {
    // Map 1-10 intensity to Garmin zones (1-5)
    const zone = Math.ceil(intensity / 2)
    return {
      targetValueOne: Math.max(1, zone - 1),
      targetValueTwo: Math.min(5, zone),
    }
  }

  // Otherwise, map by category
  switch (category?.toLowerCase()) {
    case 'easy':
    case 'recovery':
      return { targetValueOne: 1, targetValueTwo: 2 }
    case 'long_run':
      return { targetValueOne: 2, targetValueTwo: 3 }
    case 'tempo':
      return { targetValueOne: 3, targetValueTwo: 4 }
    case 'threshold':
      return { targetValueOne: 4, targetValueTwo: 5 }
    case 'race_simulation':
      return { targetValueOne: 4, targetValueTwo: 5 }
    default:
      return { targetValueOne: 2, targetValueTwo: 3 } // Moderate default
  }
}

/**
 * Validate Garmin workout structure
 */
export function validateGarminWorkout(workout: GarminWorkout): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Required fields
  if (!workout.workoutName || workout.workoutName.trim() === '') {
    errors.push('Workout name is required')
  }

  if (!workout.sportType) {
    errors.push('Sport type is required')
  }

  if (!workout.workoutSegments || workout.workoutSegments.length === 0) {
    errors.push('At least one workout segment is required')
  }

  // Validate segments
  workout.workoutSegments?.forEach((segment, i) => {
    if (!segment.workoutSteps || segment.workoutSteps.length === 0) {
      errors.push(`Segment ${i + 1} has no workout steps`)
    }

    // Validate steps
    segment.workoutSteps?.forEach((step, j) => {
      if (!step.stepType) {
        errors.push(`Segment ${i + 1}, Step ${j + 1}: Step type is required`)
      }
      if (!step.durationType) {
        errors.push(`Segment ${i + 1}, Step ${j + 1}: Duration type is required`)
      }
      if (step.durationValue === undefined || step.durationValue <= 0) {
        errors.push(`Segment ${i + 1}, Step ${j + 1}: Duration value must be positive`)
      }
      if (!step.targetType) {
        errors.push(`Segment ${i + 1}, Step ${j + 1}: Target type is required`)
      }
    })
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}
