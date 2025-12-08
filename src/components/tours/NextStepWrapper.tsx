'use client'

/**
 * NextStepWrapper - Provider wrapper for NextStep.js product tours
 *
 * Wraps the application with NextStepProvider and NextStep,
 * integrating with Jotai atoms for state management and API
 * for database persistence.
 */
import { useAtomValue, useSetAtom } from 'jotai'

import React, { useCallback, useMemo } from 'react'

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
import { tourMetadata } from './tours/metadata'

const logger = createLogger('NextStepWrapper')

// Valid tour IDs derived from centralized metadata (single source of truth)
const VALID_TOUR_IDS = Object.keys(tourMetadata) as TourId[]

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
  const { shadowRgb, shadowOpacity } = useMemo(() => {
    const isDarkMode = themeMode === 'dark'
    return {
      shadowRgb: isDarkMode ? '255, 255, 255' : '0, 0, 0',
      shadowOpacity: isDarkMode ? '0.4' : '0.6',
    }
  }, [themeMode])

  /**
   * Persist tour action to database
   */
  const persistTourAction = useCallback(
    async (
      tourId: TourId,
      action: 'start' | 'complete' | 'reset' | 'skip',
      metadata?: { stoppedAtStep?: number }
    ) => {
      try {
        const response = await fetch('/api/tours', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ tourId, action, ...(metadata && { metadata }) }),
        })

        if (!response.ok) {
          // Fallback for non-JSON responses (e.g., HTML 500 errors)
          let errorDetails: unknown
          try {
            errorDetails = await response.json()
          } catch {
            errorDetails = { status: response.status, statusText: response.statusText }
          }
          logger.warn('Failed to persist tour action', { tourId, action, error: errorDetails })
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

      // Runtime validation - ensure tourName is a valid TourId
      if (!VALID_TOUR_IDS.includes(tourName as TourId)) {
        logger.warn('Unknown tour name received on step change', { tourName })
        return
      }

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
   * Handle tour skip with database persistence
   */
  const handleSkip = useCallback(
    (step: number, tourName: string | null) => {
      if (!tourName) return

      // Runtime validation - ensure tourName is a valid TourId
      if (!VALID_TOUR_IDS.includes(tourName as TourId)) {
        logger.warn('Unknown tour name received on skip', { tourName })
        return
      }

      logger.info('Tour skipped', { tourName, step })
      skipTour()

      // Persist skip action to database (fire-and-forget for UI responsiveness)
      fetch('/api/tours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          tourId: tourName,
          action: 'skip',
          metadata: { stoppedAtStep: step },
        }),
      }).catch(error => {
        logger.error('Failed to persist tour skip', { tourName, step, error })
      })
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
        scrollToTop={false}
      >
        {children}
      </NextStep>
    </NextStepProvider>
  )
}
