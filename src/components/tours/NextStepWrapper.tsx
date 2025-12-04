'use client'

/**
 * NextStepWrapper - Provider wrapper for NextStep.js product tours
 *
 * Wraps the application with NextStepProvider and NextStep,
 * integrating with Jotai atoms for state management and API
 * for database persistence.
 */
import { useAtomValue, useSetAtom } from 'jotai'

import React, { useCallback } from 'react'

import { NextStep, NextStepProvider } from 'nextstepjs'

import { themeModeAtom } from '@/lib/atoms/index'
import {
  type TourId,
  completeTourAtom,
  skipTourAtom,
  startTourAtom,
  updateTourProgressAtom,
} from '@/lib/atoms/tours'
import { createLogger } from '@/lib/logger'

import TourCard from './TourCard'
import { allTours } from './tours'

const logger = createLogger('NextStepWrapper')

// Valid tour IDs for runtime validation (static, never changes)
const VALID_TOUR_IDS: readonly TourId[] = ['coach-onboarding', 'runner-onboarding'] as const

interface NextStepWrapperProps {
  children: React.ReactNode
}

export default function NextStepWrapper({ children }: NextStepWrapperProps) {
  const themeMode = useAtomValue(themeModeAtom)
  const startTour = useSetAtom(startTourAtom)
  const updateProgress = useSetAtom(updateTourProgressAtom)
  const completeTour = useSetAtom(completeTourAtom)
  const skipTour = useSetAtom(skipTourAtom)

  // Dynamic shadow based on theme for proper overlay visibility
  // Stronger dimming ensures spotlight target stands out clearly
  const isDarkMode = themeMode === 'dark'
  const shadowRgb = isDarkMode ? '255, 255, 255' : '0, 0, 0'
  const shadowOpacity = isDarkMode ? '0.4' : '0.6'

  /**
   * Persist tour action to database
   */
  const persistTourAction = useCallback(
    async (tourId: TourId, action: 'start' | 'complete' | 'reset') => {
      try {
        const response = await fetch('/api/tours', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ tourId, action }),
        })

        if (!response.ok) {
          const error = await response.json()
          logger.warn('Failed to persist tour action', { tourId, action, error })
        }
      } catch (error) {
        logger.error('Error persisting tour action', { tourId, action, error })
      }
    },
    []
  )

  /**
   * Handle tour start with runtime validation
   */
  const handleStart = useCallback(
    (tourName: string | null) => {
      if (!tourName) return

      // Runtime validation - ensure tourName is a valid TourId
      if (!VALID_TOUR_IDS.includes(tourName as TourId)) {
        logger.warn('Unknown tour name received', { tourName })
        return
      }

      logger.info('Tour started', { tourName })
      const tourId = tourName as TourId
      startTour(tourId)
      persistTourAction(tourId, 'start')
    },
    [startTour, persistTourAction]
  )

  /**
   * Handle step change
   */
  const handleStepChange = useCallback(
    (step: number, tourName: string | null) => {
      if (!tourName) return

      logger.debug('Tour step changed', { tourName, step })
      updateProgress(step)
    },
    [updateProgress]
  )

  /**
   * Handle tour complete with runtime validation
   */
  const handleComplete = useCallback(
    (tourName: string | null) => {
      if (!tourName) return

      // Runtime validation - ensure tourName is a valid TourId
      if (!VALID_TOUR_IDS.includes(tourName as TourId)) {
        logger.warn('Unknown tour name received on complete', { tourName })
        return
      }

      logger.info('Tour completed', { tourName })
      const tourId = tourName as TourId
      completeTour()
      persistTourAction(tourId, 'complete')
    },
    [completeTour, persistTourAction]
  )

  /**
   * Handle tour skip
   */
  const handleSkip = useCallback(
    (step: number, tourName: string | null) => {
      logger.info('Tour skipped', { tourName, step })
      skipTour()
    },
    [skipTour]
  )

  return (
    <NextStepProvider>
      <NextStep
        steps={allTours}
        cardComponent={TourCard}
        shadowRgb={shadowRgb}
        shadowOpacity={shadowOpacity}
        onStart={handleStart}
        onStepChange={handleStepChange}
        onComplete={handleComplete}
        onSkip={handleSkip}
      >
        {children}
      </NextStep>
    </NextStepProvider>
  )
}
