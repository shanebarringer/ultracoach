// Loadable patterns for async atoms with loading states
import { atom } from 'jotai'
import { loadable } from 'jotai/utils'

import { withDebugLabel } from '@/lib/atoms/utils'

import { asyncConversationsAtom } from '../chat'
import { asyncNotificationsAtom } from '../notifications'
import { refreshableTrainingPlansAtom } from '../training-plans'
import { asyncWorkoutsAtom } from '../workouts'

// Example async atoms
const fetchUserDataAtom = withDebugLabel(
  atom(async () => {
    // Simulated async operation
    return new Promise(resolve => {
      setTimeout(() => resolve({ id: '1', name: 'User' }), 1000)
    })
  }),
  'perf/fetchUserData'
)

const fetchWorkoutsAtom = withDebugLabel(
  atom(async () => {
    // Simulated async operation
    return new Promise(resolve => {
      setTimeout(() => resolve([]), 1000)
    })
  }),
  'perf/fetchWorkouts'
)

// Loadable wrappers for async atoms
export const loadableUserDataAtom = withDebugLabel(
  loadable(fetchUserDataAtom),
  'perf/loadableUserData'
)
export const loadableWorkoutsAtom = withDebugLabel(
  loadable(fetchWorkoutsAtom),
  'perf/loadableWorkouts'
)

// Loadable atoms that work with Suspense
export const workoutsLoadableAtom = withDebugLabel(
  loadable(asyncWorkoutsAtom),
  'perf/workoutsLoadable'
)
export const notificationsLoadableAtom = withDebugLabel(
  loadable(asyncNotificationsAtom),
  'perf/notificationsLoadable'
)
export const conversationsLoadableAtom = withDebugLabel(
  loadable(asyncConversationsAtom),
  'perf/conversationsLoadable'
)
export const trainingPlansLoadableAtom = withDebugLabel(
  loadable(refreshableTrainingPlansAtom),
  'perf/trainingPlansLoadable'
)

// Helper to check loading state
export const isLoadingAtom = withDebugLabel(
  atom(get => {
    const userData = get(loadableUserDataAtom)
    const workouts = get(loadableWorkoutsAtom)

    return userData.state === 'loading' || workouts.state === 'loading'
  }),
  'perf/isLoading'
)

// Helper to get all errors
export const errorsAtom = withDebugLabel(
  atom(get => {
    const errors: string[] = []
    const userData = get(loadableUserDataAtom)
    const workouts = get(loadableWorkoutsAtom)

    if (userData.state === 'hasError') {
      errors.push(String(userData.error))
    }
    if (workouts.state === 'hasError') {
      errors.push(String(workouts.error))
    }

    return errors
  }),
  'perf/errors'
)

// Jotai Devtools debug labels are applied via withDebugLabel at instantiation
