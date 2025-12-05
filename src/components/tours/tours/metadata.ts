/**
 * Tour Metadata - Centralized source of truth for tour information
 *
 * This file provides consistent tour metadata to avoid hardcoding step counts
 * and other tour properties across multiple files.
 */
import type { TourId } from '@/lib/atoms/tours'

import { coachOnboardingTour } from './coachTour'

/** Short form tour key used in UI components */
export type TourKey = 'coach' | 'runner'

export interface TourMetadata {
  stepCount: number
  isImplemented: boolean
  dashboardUrl: string
  name: string
  description: string
  /** Estimated time to complete tour in minutes (~30s per step) */
  estimatedMinutes: number
}

/** Type-safe mapping from TourKey to TourId */
const TOUR_KEY_TO_ID: Record<TourKey, TourId> = {
  coach: 'coach-onboarding',
  runner: 'runner-onboarding',
}

/**
 * Convert TourKey to TourId with compile-time type safety.
 * Eliminates unsafe `as TourId` type assertions.
 */
export function tourKeyToTourId(tourKey: TourKey): TourId {
  return TOUR_KEY_TO_ID[tourKey]
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
    estimatedMinutes: Math.ceil(coachOnboardingTour.steps.length * 0.5),
  },
  'runner-onboarding': {
    stepCount: 8, // Placeholder until runner tour is implemented
    isImplemented: false,
    dashboardUrl: '/dashboard/runner',
    name: 'Runner Tour',
    description:
      'Discover how to track workouts, view training plans, and communicate with your coach.',
    estimatedMinutes: 4, // 8 steps * 0.5 = 4 min
  },
}

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
