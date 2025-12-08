/**
 * Product Tour Atoms - Jotai State Management for NextStep.js Tours
 *
 * Provides global state management for product tours (NextStep.js).
 * Follows UltraCoach atomic state management patterns for consistency.
 *
 * Tour Flow:
 * 1. User completes modal onboarding → shouldStartTourAtom = true
 * 2. TourTrigger component detects → calls startNextStep('coach-onboarding')
 * 3. User completes tour → tourCompletedAtom updated + API call to persist
 * 4. User can restart via K-bar (t+g) or Settings page
 */
import { atom } from 'jotai'
import { atomFamily } from 'jotai/utils'

import { getTourStepCount } from '@/components/tours/tours/metadata'
import { createLogger } from '@/lib/logger'

const logger = createLogger('TourAtoms')

// ========================================
// Tour Types
// ========================================

export type TourId = 'coach-onboarding' | 'runner-onboarding'

export interface TourState {
  coachTourCompleted: boolean
  runnerTourCompleted: boolean
  lastTourStartedAt: string | null
  lastTourCompletedAt: string | null
}

export interface TourProgress {
  tourId: TourId
  currentStep: number
  totalSteps: number
  startedAt: string
}

// ========================================
// Helper Functions
// ========================================

/**
 * Maps a TourId to the corresponding completion state update
 * Reduces duplication in completeTourAtom and resetTourAtom
 */
function getTourCompletionUpdate(tourId: TourId, completed: boolean): Partial<TourState> {
  return tourId === 'coach-onboarding'
    ? { coachTourCompleted: completed }
    : { runnerTourCompleted: completed }
}

// ========================================
// Core Tour State Atoms
// ========================================

/**
 * Tracks whether a tour should be started automatically
 * Set to true after modal onboarding completes (for first-time users)
 */
export const shouldStartTourAtom = atom(false)

/**
 * Currently active tour progress
 * null when no tour is running
 */
export const activeTourAtom = atom<TourProgress | null>(null)

/**
 * Tour completion status from database
 * Synced with user_onboarding table
 */
export const tourStateAtom = atom<TourState>({
  coachTourCompleted: false,
  runnerTourCompleted: false,
  lastTourStartedAt: null,
  lastTourCompletedAt: null,
})

/**
 * Loading state for tour operations
 */
export const tourLoadingAtom = atom(false)

/**
 * Error state for tour operations
 */
export const tourErrorAtom = atom<string | null>(null)

// ========================================
// Derived Atoms
// ========================================

/**
 * Whether the coach tour has been completed
 */
export const isCoachTourCompletedAtom = atom(get => {
  return get(tourStateAtom).coachTourCompleted
})

/**
 * Whether the runner tour has been completed
 */
export const isRunnerTourCompletedAtom = atom(get => {
  return get(tourStateAtom).runnerTourCompleted
})

/**
 * Whether any tour is currently active
 */
export const isTourActiveAtom = atom(get => {
  return get(activeTourAtom) !== null
})

/**
 * Whether a specific tour should show (not completed and not currently active)
 * Uses atomFamily for proper memoization per tourId
 */
export const shouldShowTourAtomFamily = atomFamily((tourId: TourId) =>
  atom(get => {
    const activeTour = get(activeTourAtom)
    if (activeTour !== null) return false

    const tourState = get(tourStateAtom)
    return tourId === 'coach-onboarding'
      ? !tourState.coachTourCompleted
      : !tourState.runnerTourCompleted
  })
)

// ========================================
// Action Atoms
// ========================================

/**
 * Start a tour
 * Sets up the active tour progress tracking
 */
export const startTourAtom = atom(null, (get, set, tourId: TourId) => {
  const currentTour = get(activeTourAtom)

  // Don't start if another tour is active
  if (currentTour !== null) {
    logger.warn('Attempted to start tour while another is active', {
      requestedTour: tourId,
      activeTour: currentTour.tourId,
    })
    return false
  }

  // Get step count from centralized metadata
  const totalSteps = getTourStepCount(tourId)

  set(activeTourAtom, {
    tourId,
    currentStep: 0,
    totalSteps,
    startedAt: new Date().toISOString(),
  })

  const now = new Date().toISOString()
  set(tourStateAtom, current => ({
    ...current,
    lastTourStartedAt: now,
  }))

  set(shouldStartTourAtom, false)

  logger.info('Tour started', { tourId, totalSteps })
  return true
})

/**
 * Update tour progress (step change)
 */
export const updateTourProgressAtom = atom(null, (get, set, step: number) => {
  const activeTour = get(activeTourAtom)

  if (!activeTour) {
    logger.warn('Attempted to update progress but no tour is active')
    return
  }

  set(activeTourAtom, {
    ...activeTour,
    currentStep: step,
  })

  logger.debug('Tour progress updated', {
    tourId: activeTour.tourId,
    step,
    totalSteps: activeTour.totalSteps,
  })
})

/**
 * Complete the current tour
 * Clears active tour and marks completion in state
 */
export const completeTourAtom = atom(null, (get, set) => {
  const activeTour = get(activeTourAtom)

  if (!activeTour) {
    logger.warn('Attempted to complete tour but no tour is active')
    return
  }

  const { tourId } = activeTour
  const now = new Date().toISOString()

  // Update tour state
  const currentState = get(tourStateAtom)
  set(tourStateAtom, {
    ...currentState,
    ...getTourCompletionUpdate(tourId, true),
    lastTourCompletedAt: now,
  })

  // Clear active tour
  set(activeTourAtom, null)

  logger.info('Tour completed', { tourId })
})

/**
 * Skip/cancel the current tour
 * Clears active tour without marking completion
 */
export const skipTourAtom = atom(null, (get, set) => {
  const activeTour = get(activeTourAtom)

  if (!activeTour) {
    logger.warn('Attempted to skip tour but no tour is active')
    return
  }

  logger.info('Tour skipped', {
    tourId: activeTour.tourId,
    stoppedAtStep: activeTour.currentStep,
  })

  set(activeTourAtom, null)
})

/**
 * Reset tour completion status (for re-taking tours)
 */
export const resetTourAtom = atom(null, (get, set, tourId: TourId) => {
  const currentState = get(tourStateAtom)

  set(tourStateAtom, {
    ...currentState,
    ...getTourCompletionUpdate(tourId, false),
  })

  logger.info('Tour reset', { tourId })
})

/**
 * Hydrate tour state from database
 * Called after fetching user's onboarding data
 */
export const hydrateTourStateAtom = atom(null, (_get, set, state: Partial<TourState>) => {
  set(tourStateAtom, current => ({
    ...current,
    ...state,
  }))

  logger.debug('Tour state hydrated from database', state)
})

// ========================================
// Debug Labels
// ========================================

shouldStartTourAtom.debugLabel = 'tours/shouldStart'
activeTourAtom.debugLabel = 'tours/active'
tourStateAtom.debugLabel = 'tours/state'
tourLoadingAtom.debugLabel = 'tours/loading'
tourErrorAtom.debugLabel = 'tours/error'
isCoachTourCompletedAtom.debugLabel = 'tours/isCoachCompleted'
isRunnerTourCompletedAtom.debugLabel = 'tours/isRunnerCompleted'
isTourActiveAtom.debugLabel = 'tours/isActive'
// Note: atomFamily doesn't support debugLabel - individual atoms are auto-named
startTourAtom.debugLabel = 'tours/start'
updateTourProgressAtom.debugLabel = 'tours/updateProgress'
completeTourAtom.debugLabel = 'tours/complete'
skipTourAtom.debugLabel = 'tours/skip'
resetTourAtom.debugLabel = 'tours/reset'
hydrateTourStateAtom.debugLabel = 'tours/hydrate'
