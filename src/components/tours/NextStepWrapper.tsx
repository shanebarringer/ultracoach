'use client'

/**
 * NextStepWrapper - Provider wrapper for NextStep.js product tours
 *
 * Wraps the application with NextStepProvider and NextStep,
 * integrating with Jotai atoms for state management and API
 * for database persistence.
 */
import { useSetAtom } from 'jotai'

import React, { useCallback } from 'react'

import { NextStep, NextStepProvider } from 'nextstepjs'

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

interface NextStepWrapperProps {
  children: React.ReactNode
}

export default function NextStepWrapper({ children }: NextStepWrapperProps) {
  const startTour = useSetAtom(startTourAtom)
  const updateProgress = useSetAtom(updateTourProgressAtom)
  const completeTour = useSetAtom(completeTourAtom)
  const skipTour = useSetAtom(skipTourAtom)

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
   * Handle tour start
   */
  const handleStart = useCallback(
    (tourName: string | null) => {
      if (!tourName) return

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
   * Handle tour complete
   */
  const handleComplete = useCallback(
    (tourName: string | null) => {
      if (!tourName) return

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
