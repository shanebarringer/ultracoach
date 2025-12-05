'use client'

/**
 * TourTrigger - Automatically triggers product tours based on Jotai state
 *
 * This component watches the `shouldStartTourAtom` and automatically
 * starts the appropriate tour when the atom is set to true.
 *
 * Flow:
 * 1. User completes onboarding modal
 * 2. handleOnboardingComplete() sets shouldStartTourAtom = true
 * 3. TourTrigger detects this and calls startNextStep()
 * 4. The atom is reset to prevent re-triggering
 */
import { useAtom, useAtomValue } from 'jotai'

import { useEffect, useRef } from 'react'

import { useNextStep } from 'nextstepjs'

import { shouldStartTourAtom, tourStateAtom } from '@/lib/atoms/tours'
import { createLogger } from '@/lib/logger'

const logger = createLogger('TourTrigger')

interface TourTriggerProps {
  /** User's role - determines which tour to trigger */
  userRole?: 'coach' | 'runner'
}

export default function TourTrigger({ userRole }: TourTriggerProps) {
  const { startNextStep } = useNextStep()
  const [shouldStartTour, setShouldStartTour] = useAtom(shouldStartTourAtom)
  const tourState = useAtomValue(tourStateAtom)

  // Prevent multiple triggers
  const hasTriggered = useRef(false)

  useEffect(() => {
    // Only trigger once per mount
    if (hasTriggered.current) {
      return
    }

    // Check if we should start the tour
    if (!shouldStartTour) {
      return
    }

    // Determine which tour to start based on user role
    const tourId = userRole === 'coach' ? 'coach-onboarding' : 'runner-onboarding'

    // Check if this tour is already completed
    const isTourCompleted =
      userRole === 'coach' ? tourState.coachTourCompleted : tourState.runnerTourCompleted

    if (isTourCompleted) {
      logger.debug('Tour already completed, skipping auto-start', { tourId })
      setShouldStartTour(false)
      return
    }

    // Guard: Runner tour not yet implemented
    if (userRole === 'runner') {
      logger.debug('Runner tour not yet implemented, skipping')
      setShouldStartTour(false)
      return
    }

    // Mark as triggered to prevent re-runs
    hasTriggered.current = true

    logger.info('Auto-starting tour', { tourId, userRole })

    // Small delay to ensure the page is fully rendered
    const timer = setTimeout(() => {
      try {
        startNextStep(tourId)
        setShouldStartTour(false)
      } catch (error) {
        logger.error('Failed to start tour', { tourId, error })
        // Reset both ref and atom to allow future retry attempts
        hasTriggered.current = false
        setShouldStartTour(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [shouldStartTour, userRole, tourState, startNextStep, setShouldStartTour])

  // This component doesn't render anything
  return null
}
