'use client'

import {
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
  UserIcon,
  UserPlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid'
import { Button, Card, CardBody, CardHeader, Progress } from '@heroui/react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'

import { memo, useCallback, useEffect, useState } from 'react'

import Link from 'next/link'

import {
  type OnboardingStep,
  completeStepAtom,
  dismissChecklistAtom,
  isOnboardingCompleteAtom,
  markCelebrationShownAtom,
  markFirstViewedAtom,
  nextStepAtom,
  onboardingProgressAtom,
  shouldShowChecklistAtom,
  stepsWithStatusAtom,
} from '@/lib/atoms/onboarding'
import { createLogger } from '@/lib/logger'

const logger = createLogger('OnboardingChecklist')

// ========================================
// Icon Mapping
// ========================================

const STEP_ICONS: Record<OnboardingStep['icon'], React.ComponentType<{ className?: string }>> = {
  user: UserIcon,
  clipboard: ClipboardDocumentListIcon,
  'user-plus': UserPlusIcon,
  activity: CheckCircleIcon,
  message: ChatBubbleLeftRightIcon,
}

// ========================================
// Subcomponents
// ========================================

interface StepItemProps {
  step: OnboardingStep & { isCompleted: boolean }
  isNext: boolean
  onComplete: (stepId: OnboardingStep['id']) => void
}

const StepItem = memo(function StepItem({ step, isNext, onComplete: _onComplete }: StepItemProps) {
  const IconComponent = STEP_ICONS[step.icon]

  return (
    <Link
      href={step.href}
      className={`
        group flex items-center gap-3 p-3 rounded-lg transition-all duration-200
        ${
          step.isCompleted
            ? 'bg-forest-100/50 dark:bg-forest-900/20'
            : isNext
              ? 'bg-alpine-blue-50 dark:bg-alpine-blue-900/20 ring-2 ring-alpine-blue-400 dark:ring-alpine-blue-600'
              : 'hover:bg-granite-100 dark:hover:bg-granite-800'
        }
      `}
      onClick={_e => {
        // Allow navigation but also track click for potential auto-completion
        logger.debug('Step clicked', { stepId: step.id, isCompleted: step.isCompleted })
      }}
    >
      {/* Completion indicator */}
      <div
        className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors
          ${
            step.isCompleted
              ? 'bg-forest-500 text-white'
              : isNext
                ? 'bg-alpine-blue-500 text-white'
                : 'bg-granite-200 dark:bg-granite-700 text-granite-500 dark:text-granite-400'
          }
        `}
      >
        {step.isCompleted ? (
          <CheckCircleSolidIcon className="w-5 h-5" />
        ) : (
          <IconComponent className="w-4 h-4" />
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 min-w-0">
        <p
          className={`
            font-medium text-sm truncate
            ${
              step.isCompleted
                ? 'text-forest-700 dark:text-forest-400 line-through'
                : 'text-granite-900 dark:text-granite-100'
            }
          `}
        >
          {step.title}
        </p>
        <p
          className={`
            text-xs truncate
            ${step.isCompleted ? 'text-forest-600 dark:text-forest-500' : 'text-granite-500 dark:text-granite-400'}
          `}
        >
          {step.description}
        </p>
      </div>

      {/* Arrow indicator for next step */}
      {isNext && !step.isCompleted && (
        <div className="flex-shrink-0">
          <span className="text-xs font-medium text-alpine-blue-600 dark:text-alpine-blue-400 bg-alpine-blue-100 dark:bg-alpine-blue-900/30 px-2 py-0.5 rounded-full">
            Next
          </span>
        </div>
      )}
    </Link>
  )
})

// ========================================
// Celebration Animation
// ========================================

interface CelebrationProps {
  onComplete: () => void
}

const Celebration = memo(function Celebration({ onComplete }: CelebrationProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-summit-gold-400/90 to-alpine-blue-500/90 rounded-xl z-10 animate-fade-in">
      <div className="text-center text-white p-6">
        <div className="mb-4 animate-bounce">
          <SparklesIcon className="w-16 h-16 mx-auto text-white" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Summit Reached!</h3>
        <p className="text-white/90">
          You have completed all onboarding steps. Welcome to UltraCoach!
        </p>
      </div>
    </div>
  )
})

// ========================================
// Main Component
// ========================================

interface OnboardingChecklistProps {
  className?: string
  /** Variant affects sizing and layout */
  variant?: 'card' | 'compact' | 'sidebar'
  /** Optional callback when step completion changes */
  onStepComplete?: (stepId: OnboardingStep['id']) => void
}

/**
 * OnboardingChecklist Component
 *
 * A "Base Camp Checklist" that guides new coaches through 5 key activation steps.
 * Features progress tracking, celebration animation, and Mountain Peak styling.
 *
 * @example
 * ```tsx
 * // In coach dashboard
 * <OnboardingChecklist variant="card" />
 *
 * // In sidebar
 * <OnboardingChecklist variant="sidebar" className="mb-4" />
 * ```
 */
const OnboardingChecklist = memo(function OnboardingChecklist({
  className = '',
  variant = 'card',
  onStepComplete,
}: OnboardingChecklistProps) {
  const [showCelebration, setShowCelebration] = useState(false)

  // Atoms
  const shouldShow = useAtomValue(shouldShowChecklistAtom)
  const stepsWithStatus = useAtomValue(stepsWithStatusAtom)
  const progress = useAtomValue(onboardingProgressAtom)
  const isComplete = useAtomValue(isOnboardingCompleteAtom)
  const nextStep = useAtomValue(nextStepAtom)
  const [, markCelebrationShown] = useAtom(markCelebrationShownAtom)
  const dismiss = useSetAtom(dismissChecklistAtom)
  const completeStep = useSetAtom(completeStepAtom)
  const markFirstViewed = useSetAtom(markFirstViewedAtom)

  // Mark as viewed on mount
  useEffect(() => {
    markFirstViewed()
  }, [markFirstViewed])

  // Trigger celebration when complete
  useEffect(() => {
    if (isComplete && !showCelebration) {
      setShowCelebration(true)
      logger.info('Onboarding complete - showing celebration')
    }
  }, [isComplete, showCelebration])

  // Handle step completion
  const handleStepComplete = useCallback(
    (stepId: OnboardingStep['id']) => {
      completeStep(stepId)
      onStepComplete?.(stepId)
    },
    [completeStep, onStepComplete]
  )

  // Handle celebration end
  const handleCelebrationComplete = useCallback(() => {
    setShowCelebration(false)
    markCelebrationShown()
  }, [markCelebrationShown])

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    dismiss()
    logger.info('Checklist dismissed by user')
  }, [dismiss])

  // Don't render if shouldn't show
  if (!shouldShow) {
    return null
  }

  const completedCount = stepsWithStatus.filter(s => s.isCompleted).length
  const totalCount = stepsWithStatus.length

  // Compact variant for tight spaces
  if (variant === 'compact') {
    return (
      <div className={`p-3 bg-alpine-blue-50 dark:bg-alpine-blue-900/20 rounded-lg ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-alpine-blue-700 dark:text-alpine-blue-300">
            Base Camp Checklist
          </span>
          <span className="text-xs text-alpine-blue-600 dark:text-alpine-blue-400">
            {completedCount}/{totalCount}
          </span>
        </div>
        <Progress
          value={progress}
          color="primary"
          size="sm"
          className="mb-2"
          aria-label="Onboarding progress"
        />
        {nextStep && (
          <Link
            href={nextStep.href}
            className="text-xs text-alpine-blue-600 dark:text-alpine-blue-400 hover:underline"
          >
            Next: {nextStep.title}
          </Link>
        )}
      </div>
    )
  }

  // Sidebar variant
  if (variant === 'sidebar') {
    return (
      <div
        className={`p-4 bg-gradient-to-br from-alpine-blue-50 to-forest-50 dark:from-alpine-blue-900/30 dark:to-forest-900/30 rounded-xl border border-alpine-blue-200/50 dark:border-alpine-blue-700/50 ${className}`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-alpine-blue-500 flex items-center justify-center">
              <SparklesIcon className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm text-granite-900 dark:text-granite-100">
              Base Camp
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-granite-400 hover:text-granite-600 dark:hover:text-granite-200 transition-colors"
            aria-label="Dismiss checklist"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        <Progress
          value={progress}
          color={isComplete ? 'success' : 'primary'}
          size="sm"
          className="mb-3"
          aria-label="Onboarding progress"
        />

        <p className="text-xs text-granite-600 dark:text-granite-400 mb-3">
          {completedCount} of {totalCount} steps complete
        </p>

        <div className="space-y-1">
          {stepsWithStatus.slice(0, 3).map(step => (
            <div
              key={step.id}
              className={`flex items-center gap-2 text-xs ${
                step.isCompleted
                  ? 'text-forest-600 dark:text-forest-400'
                  : 'text-granite-600 dark:text-granite-400'
              }`}
            >
              {step.isCompleted ? (
                <CheckCircleSolidIcon className="w-4 h-4 text-forest-500" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-granite-300 dark:border-granite-600" />
              )}
              <span className={step.isCompleted ? 'line-through' : ''}>{step.title}</span>
            </div>
          ))}
          {stepsWithStatus.length > 3 && (
            <Link
              href="/settings"
              className="text-xs text-alpine-blue-600 dark:text-alpine-blue-400 hover:underline ml-6"
            >
              +{stepsWithStatus.length - 3} more steps
            </Link>
          )}
        </div>
      </div>
    )
  }

  // Full card variant (default)
  return (
    <Card
      className={`relative overflow-hidden border border-alpine-blue-200/50 dark:border-alpine-blue-700/50 ${className}`}
    >
      {/* Celebration overlay */}
      {showCelebration && <Celebration onComplete={handleCelebrationComplete} />}

      {/* Decorative gradient header */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-alpine-blue-500 via-forest-500 to-summit-gold-500" />

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-alpine-blue-500 to-alpine-blue-600 flex items-center justify-center shadow-lg">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-granite-900 dark:text-granite-100">
                Base Camp Checklist
              </h3>
              <p className="text-sm text-granite-500 dark:text-granite-400">
                Complete these steps to get started
              </p>
            </div>
          </div>
          <Button
            isIconOnly
            variant="light"
            size="sm"
            onPress={handleDismiss}
            aria-label="Dismiss checklist"
            className="text-granite-400 hover:text-granite-600 dark:hover:text-granite-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>

      <CardBody className="pt-2">
        {/* Progress section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-granite-700 dark:text-granite-300">
              Your Progress
            </span>
            <span className="text-sm font-semibold text-alpine-blue-600 dark:text-alpine-blue-400">
              {completedCount} of {totalCount} complete
            </span>
          </div>
          <Progress
            value={progress}
            color={isComplete ? 'success' : 'primary'}
            size="md"
            className="mb-1"
            aria-label="Onboarding progress"
            classNames={{
              indicator: isComplete
                ? 'bg-gradient-to-r from-forest-500 to-forest-600'
                : 'bg-gradient-to-r from-alpine-blue-500 to-alpine-blue-600',
            }}
          />
        </div>

        {/* Steps list */}
        <div className="space-y-2">
          {stepsWithStatus.map(step => (
            <StepItem
              key={step.id}
              step={step}
              isNext={nextStep?.id === step.id}
              onComplete={handleStepComplete}
            />
          ))}
        </div>

        {/* Completion message */}
        {isComplete && !showCelebration && (
          <div className="mt-4 p-3 bg-forest-50 dark:bg-forest-900/20 rounded-lg border border-forest-200 dark:border-forest-700">
            <p className="text-sm text-forest-700 dark:text-forest-300 text-center">
              <CheckCircleSolidIcon className="w-5 h-5 inline-block mr-1 -mt-0.5" />
              All steps complete! You are ready to start coaching.
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  )
})

OnboardingChecklist.displayName = 'OnboardingChecklist'

export default OnboardingChecklist
