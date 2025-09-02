// Training plan management atoms
import { atom } from 'jotai'
import { atomWithRefresh, atomWithStorage } from 'jotai/utils'

import { createLogger } from '../logger'
import type { ExtendedTrainingPlan } from '@/types/training'

// Environment check
const isBrowser = typeof window !== 'undefined'

// Core training plan atoms
export const trainingPlansAtom = atom<ExtendedTrainingPlan[]>([])
export const trainingPlansLoadingAtom = atom(false)
export const trainingPlansErrorAtom = atom<string | null>(null)

// Async training plans atom with suspense support
export const asyncTrainingPlansAtom = atom(async () => {
  // This would be populated with actual async data fetching
  return [] as ExtendedTrainingPlan[]
})

// Refreshable training plans atom using atomWithRefresh
export const refreshableTrainingPlansAtom = atomWithRefresh(async () => {
  // Only execute on client-side to prevent build-time fetch errors
  if (!isBrowser) return []
  const logger = createLogger('TrainingPlansAtom')
  try {
    logger.debug('Fetching training plans...')
    const response = await fetch('/api/training-plans', {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })
    if (!response.ok) {
      logger.error(`Failed to fetch training plans: ${response.status} ${response.statusText}`)
      return []
    }
    const data = await response.json()
    logger.debug('Training plans fetched', { count: data.length })
    return data as ExtendedTrainingPlan[]
  } catch (error) {
    logger.error('Error fetching training plans', error)
    return []
  }
})

// Selected training plan atoms
export const selectedTrainingPlanAtom = atom<ExtendedTrainingPlan | null>(null)
export const selectedTrainingPlanIdAtom = atom<string | null>(null)

// Training plan filtering atoms
export const trainingPlanSearchTermAtom = atomWithStorage('trainingPlanSearchTerm', '')
export const trainingPlanStatusFilterAtom = atomWithStorage('trainingPlanStatusFilter', 'all')
export const trainingPlanSortByAtom = atomWithStorage<'name' | 'start_date' | 'created_at'>(
  'trainingPlanSortBy',
  'created_at'
)

// Training plan form atoms
export const trainingPlanFormDataAtom = atom<Partial<ExtendedTrainingPlan>>({})
export const isEditingTrainingPlanAtom = atom(false)
export const editingTrainingPlanIdAtom = atom<string | null>(null)