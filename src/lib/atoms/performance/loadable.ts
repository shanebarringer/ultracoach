// Loadable patterns for async atoms with loading states
import { atom } from 'jotai'
import { loadable } from 'jotai/utils'

import { asyncConversationsAtom } from '../chat'
import { asyncNotificationsAtom } from '../notifications'
import { asyncTrainingPlansAtom } from '../training-plans'
import { withDebugLabel } from '../utils'
import { asyncWorkoutsAtom } from '../workouts'

// Example async atoms
const fetchUserDataAtom = atom(async () => {
  // Simulated async operation
  return new Promise(resolve => {
    setTimeout(() => resolve({ id: '1', name: 'User' }), 1000)
  })
})

const fetchWorkoutsAtom = atom(async () => {
  // Simulated async operation
  return new Promise(resolve => {
    setTimeout(() => resolve([]), 1000)
  })
})

// Loadable wrappers for async atoms
export const loadableUserDataAtom = loadable(fetchUserDataAtom)
export const loadableWorkoutsAtom = loadable(fetchWorkoutsAtom)

// Loadable atoms that work with Suspense
export const workoutsLoadableAtom = loadable(asyncWorkoutsAtom)
export const notificationsLoadableAtom = loadable(asyncNotificationsAtom)
export const conversationsLoadableAtom = loadable(asyncConversationsAtom)
export const trainingPlansLoadableAtom = loadable(asyncTrainingPlansAtom)

// Helper to check loading state
export const isLoadingAtom = atom(get => {
  const userData = get(loadableUserDataAtom)
  const workouts = get(loadableWorkoutsAtom)

  return userData.state === 'loading' || workouts.state === 'loading'
})

// Helper to get all errors
export const errorsAtom = atom(get => {
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
})

// Jotai Devtools debug labels
// Note: local atoms are labeled for clarity even if not exported
withDebugLabel(fetchUserDataAtom, 'perf/fetchUserData')
withDebugLabel(fetchWorkoutsAtom, 'perf/fetchWorkouts')
withDebugLabel(loadableUserDataAtom, 'perf/loadableUserData')
withDebugLabel(loadableWorkoutsAtom, 'perf/loadableWorkouts')
withDebugLabel(workoutsLoadableAtom, 'perf/workoutsLoadable')
withDebugLabel(notificationsLoadableAtom, 'perf/notificationsLoadable')
withDebugLabel(conversationsLoadableAtom, 'perf/conversationsLoadable')
withDebugLabel(trainingPlansLoadableAtom, 'perf/trainingPlansLoadable')
withDebugLabel(isLoadingAtom, 'perf/isLoading')
withDebugLabel(errorsAtom, 'perf/errors')
