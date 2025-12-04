/**
 * Tour Metadata - Centralized source of truth for tour information
 *
 * This file provides consistent tour metadata to avoid hardcoding step counts
 * and other tour properties across multiple files.
 */
import type { TourId } from '@/lib/atoms/tours'

import { coachOnboardingTour } from './coachTour'

export interface TourMetadata {
  stepCount: number
  isImplemented: boolean
  dashboardUrl: string
  name: string
  description: string
}

/**
 * Centralized tour metadata derived from actual tour definitions where available.
 * Step counts are derived from the tour definition to ensure consistency.
 */
export const tourMetadata: Record<TourId, TourMetadata> = {
  'coach-onboarding': {
    stepCount: coachOnboardingTour.steps.length,
    isImplemented: true,
    dashboardUrl: '/dashboard/coach',
    name: 'Coach Tour',
    description: 'Learn how to manage athletes, create training plans, and track progress.',
  },
  'runner-onboarding': {
    stepCount: 8, // Placeholder until runner tour is implemented
    isImplemented: false,
    dashboardUrl: '/dashboard/runner',
    name: 'Runner Tour',
    description:
      'Discover how to track workouts, view training plans, and communicate with your coach.',
  },
} as const

/**
 * Get step count for a tour, derived from the actual tour definition
 * when available, or from metadata placeholder otherwise.
 */
export function getTourStepCount(tourId: TourId): number {
  return tourMetadata[tourId].stepCount
}

/**
 * Check if a tour is implemented and available
 */
export function isTourImplemented(tourId: TourId): boolean {
  return tourMetadata[tourId].isImplemented
}
