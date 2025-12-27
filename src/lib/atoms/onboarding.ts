/**
 * Onboarding Checklist Atoms - Jotai State Management for Coach Activation
 *
 * Tracks coach onboarding progress through 5 key activation steps:
 * 1. Complete your profile
 * 2. Create your first training plan
 * 3. Invite a runner
 * 4. Log a workout (or have a runner log one)
 * 5. Send your first message
 *
 * Uses localStorage for persistence and derives completion from actual data.
 *
 * @module atoms/onboarding
 */
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import { createLogger } from '@/lib/logger'

import { withDebugLabel } from './utils'

const logger = createLogger('OnboardingAtoms')

// ========================================
// Types
// ========================================

export type OnboardingStepId =
  | 'complete-profile'
  | 'create-training-plan'
  | 'invite-runner'
  | 'log-workout'
  | 'send-message'

export interface OnboardingStep {
  id: OnboardingStepId
  title: string
  description: string
  href: string
  icon: 'user' | 'clipboard' | 'user-plus' | 'activity' | 'message'
}

export interface OnboardingChecklistState {
  /** Steps that have been completed */
  completedSteps: OnboardingStepId[]
  /** Whether the checklist has been dismissed by the user */
  isDismissed: boolean
  /** Whether the celebration animation has been shown */
  celebrationShown: boolean
  /** Timestamp when all steps were first completed */
  completedAt: string | null
  /** Timestamp when the checklist was first viewed */
  firstViewedAt: string | null
}

// ========================================
// Step Definitions
// ========================================

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'complete-profile',
    title: 'Complete Your Profile',
    description: 'Add your coaching background and expertise',
    href: '/settings',
    icon: 'user',
  },
  {
    id: 'create-training-plan',
    title: 'Create Your First Training Plan',
    description: 'Build a training plan for your athletes',
    href: '/training-plans',
    icon: 'clipboard',
  },
  {
    id: 'invite-runner',
    title: 'Invite a Runner',
    description: 'Connect with your first athlete',
    href: '/relationships',
    icon: 'user-plus',
  },
  {
    id: 'log-workout',
    title: 'Log a Workout',
    description: 'Track your first training session',
    href: '/workouts',
    icon: 'activity',
  },
  {
    id: 'send-message',
    title: 'Send Your First Message',
    description: 'Start a conversation with an athlete',
    href: '/chat',
    icon: 'message',
  },
]

// ========================================
// Default State
// ========================================

const defaultOnboardingState: OnboardingChecklistState = {
  completedSteps: [],
  isDismissed: false,
  celebrationShown: false,
  completedAt: null,
  firstViewedAt: null,
}

// ========================================
// Core State Atom (localStorage persisted)
// ========================================

/**
 * Main onboarding checklist state
 * Persisted to localStorage for cross-session tracking
 */
export const onboardingChecklistAtom = atomWithStorage<OnboardingChecklistState>(
  'ultracoach-coach-onboarding',
  defaultOnboardingState
)

// ========================================
// Derived Atoms
// ========================================

/**
 * Number of completed steps
 */
export const completedStepsCountAtom = atom(get => {
  const state = get(onboardingChecklistAtom)
  return state.completedSteps.length
})

/**
 * Total number of steps
 */
export const totalStepsCountAtom = atom(() => ONBOARDING_STEPS.length)

/**
 * Progress percentage (0-100)
 */
export const onboardingProgressAtom = atom(get => {
  const completed = get(completedStepsCountAtom)
  const total = get(totalStepsCountAtom)
  return total > 0 ? Math.round((completed / total) * 100) : 0
})

/**
 * Whether all steps are complete
 */
export const isOnboardingCompleteAtom = atom(get => {
  const completed = get(completedStepsCountAtom)
  const total = get(totalStepsCountAtom)
  return completed >= total
})

/**
 * Whether the checklist should be visible
 * Hidden if dismissed or all steps completed + celebration shown
 */
export const shouldShowChecklistAtom = atom(get => {
  const state = get(onboardingChecklistAtom)
  const isComplete = get(isOnboardingCompleteAtom)

  // Don't show if explicitly dismissed
  if (state.isDismissed) {
    return false
  }

  // Don't show if completed and celebration already shown
  if (isComplete && state.celebrationShown) {
    return false
  }

  return true
})

/**
 * Check if a specific step is completed
 */
export const isStepCompletedAtom = atom(get => {
  const state = get(onboardingChecklistAtom)
  return (stepId: OnboardingStepId) => state.completedSteps.includes(stepId)
})

/**
 * Get step with completion status
 */
export const stepsWithStatusAtom = atom(get => {
  const state = get(onboardingChecklistAtom)
  return ONBOARDING_STEPS.map(step => ({
    ...step,
    isCompleted: state.completedSteps.includes(step.id),
  }))
})

/**
 * Next incomplete step (for highlighting)
 */
export const nextStepAtom = atom(get => {
  const stepsWithStatus = get(stepsWithStatusAtom)
  return stepsWithStatus.find(step => !step.isCompleted) || null
})

// ========================================
// Action Atoms
// ========================================

/**
 * Mark a step as completed
 */
export const completeStepAtom = atom(null, (get, set, stepId: OnboardingStepId) => {
  const current = get(onboardingChecklistAtom)

  // Don't add if already completed
  if (current.completedSteps.includes(stepId)) {
    logger.debug('Step already completed', { stepId })
    return
  }

  const newCompletedSteps = [...current.completedSteps, stepId]
  const isNowComplete = newCompletedSteps.length >= ONBOARDING_STEPS.length
  const now = new Date().toISOString()

  set(onboardingChecklistAtom, {
    ...current,
    completedSteps: newCompletedSteps,
    completedAt: isNowComplete && !current.completedAt ? now : current.completedAt,
    firstViewedAt: current.firstViewedAt || now,
  })

  logger.info('Onboarding step completed', {
    stepId,
    totalCompleted: newCompletedSteps.length,
    isNowComplete,
  })
})

/**
 * Mark multiple steps as completed at once
 * Useful for initial state sync from API data
 */
export const completeMultipleStepsAtom = atom(null, (get, set, stepIds: OnboardingStepId[]) => {
  const current = get(onboardingChecklistAtom)
  const newCompletedSteps = [...new Set([...current.completedSteps, ...stepIds])]
  const isNowComplete = newCompletedSteps.length >= ONBOARDING_STEPS.length
  const now = new Date().toISOString()

  set(onboardingChecklistAtom, {
    ...current,
    completedSteps: newCompletedSteps,
    completedAt: isNowComplete && !current.completedAt ? now : current.completedAt,
    firstViewedAt: current.firstViewedAt || now,
  })

  logger.info('Multiple onboarding steps completed', {
    stepIds,
    totalCompleted: newCompletedSteps.length,
  })
})

/**
 * Mark celebration as shown
 */
export const markCelebrationShownAtom = atom(null, (get, set) => {
  const current = get(onboardingChecklistAtom)
  set(onboardingChecklistAtom, {
    ...current,
    celebrationShown: true,
  })
  logger.info('Onboarding celebration shown')
})

/**
 * Dismiss the checklist (user chose to hide it)
 */
export const dismissChecklistAtom = atom(null, (get, set) => {
  const current = get(onboardingChecklistAtom)
  set(onboardingChecklistAtom, {
    ...current,
    isDismissed: true,
  })
  logger.info('Onboarding checklist dismissed')
})

/**
 * Reset the checklist (for testing or re-onboarding)
 */
export const resetChecklistAtom = atom(null, (_get, set) => {
  set(onboardingChecklistAtom, defaultOnboardingState)
  logger.info('Onboarding checklist reset')
})

/**
 * Mark first viewed timestamp
 */
export const markFirstViewedAtom = atom(null, (get, set) => {
  const current = get(onboardingChecklistAtom)
  if (current.firstViewedAt) return // Already viewed

  set(onboardingChecklistAtom, {
    ...current,
    firstViewedAt: new Date().toISOString(),
  })
  logger.debug('Onboarding checklist first viewed')
})

// ========================================
// Debug Labels
// ========================================

withDebugLabel(onboardingChecklistAtom, 'onboarding/checklist')
withDebugLabel(completedStepsCountAtom, 'onboarding/completedCount')
withDebugLabel(totalStepsCountAtom, 'onboarding/totalCount')
withDebugLabel(onboardingProgressAtom, 'onboarding/progress')
withDebugLabel(isOnboardingCompleteAtom, 'onboarding/isComplete')
withDebugLabel(shouldShowChecklistAtom, 'onboarding/shouldShow')
withDebugLabel(isStepCompletedAtom, 'onboarding/isStepCompleted')
withDebugLabel(stepsWithStatusAtom, 'onboarding/stepsWithStatus')
withDebugLabel(nextStepAtom, 'onboarding/nextStep')
withDebugLabel(completeStepAtom, 'onboarding/completeStep')
withDebugLabel(completeMultipleStepsAtom, 'onboarding/completeMultiple')
withDebugLabel(markCelebrationShownAtom, 'onboarding/markCelebrationShown')
withDebugLabel(dismissChecklistAtom, 'onboarding/dismiss')
withDebugLabel(resetChecklistAtom, 'onboarding/reset')
withDebugLabel(markFirstViewedAtom, 'onboarding/markFirstViewed')
