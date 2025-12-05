/**
 * Tour Definitions Export
 *
 * Central export for all product tour configurations.
 * Add new tours here as they are created.
 */
import type { Tour } from 'nextstepjs'

import { coachOnboardingTour } from './coachTour'

// Export individual tours for specific imports
export { coachOnboardingTour }

// Export all tours as a combined array for NextStep provider
export const allTours: Tour[] = [coachOnboardingTour]

// Future: Add runner tour when implemented
// import { runnerOnboardingTour } from './runnerTour'
// export { runnerOnboardingTour }
// export const allTours: Tour[] = [coachOnboardingTour, runnerOnboardingTour]
