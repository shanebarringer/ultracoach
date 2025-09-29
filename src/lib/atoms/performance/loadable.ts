// Loadable patterns for async atoms with loading states
import { atom } from 'jotai'
import { loadable } from 'jotai/utils'

import { asyncConversationsAtom } from '../chat'
import { asyncNotificationsAtom } from '../notifications'
import { refreshableTrainingPlansAtom } from '../training-plans'
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
fetchWorkoutsAtom.debugLabel = 'fetchWorkoutsAtom'
fetchUserDataAtom.debugLabel = 'fetchUserDataAtom'
export const loadableUserDataAtom = loadable(fetchUserDataAtom)
loadableUserDataAtom.debugLabel = 'loadableUserDataAtom'
export const loadableWorkoutsAtom = loadable(fetchWorkoutsAtom)
loadableWorkoutsAtom.debugLabel = 'loadableWorkoutsAtom'

// Loadable atoms that work with Suspense
export const workoutsLoadableAtom = loadable(asyncWorkoutsAtom)
workoutsLoadableAtom.debugLabel = 'workoutsLoadableAtom'
export const notificationsLoadableAtom = loadable(asyncNotificationsAtom)
notificationsLoadableAtom.debugLabel = 'notificationsLoadableAtom'
export const conversationsLoadableAtom = loadable(asyncConversationsAtom)
conversationsLoadableAtom.debugLabel = 'conversationsLoadableAtom'
export const trainingPlansLoadableAtom = loadable(refreshableTrainingPlansAtom)
trainingPlansLoadableAtom.debugLabel = 'trainingPlansLoadableAtom'

// Helper to check loading state
export const isLoadingAtom = atom(get => {
  const userData = get(loadableUserDataAtom)
  const workouts = get(loadableWorkoutsAtom)

  return userData.state === 'loading' || workouts.state === 'loading'
})

// Helper to get all errors
isLoadingAtom.debugLabel = 'isLoadingAtom'
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
errorsAtom.debugLabel = 'errorsAtom'
