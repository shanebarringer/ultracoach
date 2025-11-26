/**
 * Barrel file for Jotai atoms - maintains backward compatibility
 *
 * This file provides a single import point for all atoms while using
 * modular organization for better maintainability and performance.
 * All actual atom definitions have been moved to domain-specific modules
 * to prevent circular dependencies and improve code organization.
 *
 * @module atoms
 */

// ============================================================================
// Re-exports from modular atom files
// ============================================================================

// Core domain atoms
export * from './auth' // Authentication, session, and auth state atoms
export * from './chat' // Messaging and conversation atoms
export * from './forms' // Form state management atoms
export * from './garmin' // Garmin integration atoms
export * from './notifications' // Notification system atoms
export * from './races' // Race management atoms
export * from './relationships' // Coach-runner relationship and runners atoms
export * from './settings' // User settings management atoms
export * from './strava' // Strava integration atoms
export * from './training-plans' // Training plan and template atoms
export * from './ui' // UI state, modals, and extended UI atoms
export * from './workouts' // Workout management atoms

// Performance optimization patterns
export * from './performance/atom-family' // Dynamic atom creation with cleanup
export * from './performance/cleanup' // Memory management utilities
export * from './performance/loadable' // Async loading patterns
export * from './performance/split-atoms' // Granular state splitting

// Derived atoms (computed values)
export * from './derived' // All computed/derived atoms

// ============================================================================
// Re-export complex atoms from domain modules for backward compatibility
// ============================================================================

// These atoms are re-exported here to maintain backward compatibility
// with existing imports. New code should import directly from domain modules.
export { completeWorkoutAtom, logWorkoutDetailsAtom, skipWorkoutAtom } from './workouts'
export { sendMessageActionAtom } from './chat'

// ============================================================================
// Re-export utility functions from jotai/utils
// ============================================================================

export { atomWithRefresh, atomWithStorage, loadable, splitAtom, unwrap } from 'jotai/utils'
