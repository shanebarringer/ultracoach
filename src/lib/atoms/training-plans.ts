/**
 * Training plan management atoms
 *
 * This module manages all training plan related state including
 * plans, templates, forms, and filtering.
 *
 * @module atoms/training-plans
 */
import { atom } from 'jotai'
import { atomWithRefresh, atomWithStorage } from 'jotai/utils'

import type { PlanTemplate } from '@/lib/supabase'
import type { ExtendedTrainingPlan } from '@/types/training'

import { api } from '../api-client'
import { createLogger } from '../logger'
import { normalizeListResponse } from '../utils/api-utils'

// Environment check
const isBrowser = typeof window !== 'undefined'

// Core training plan atoms
export const trainingPlansAtom = atom<ExtendedTrainingPlan[]>([])
trainingPlansAtom.debugLabel = 'trainingPlansAtom'
export const trainingPlansLoadingAtom = atom(false)
trainingPlansLoadingAtom.debugLabel = 'trainingPlansLoadingAtom'
export const trainingPlansErrorAtom = atom<string | null>(null)
trainingPlansErrorAtom.debugLabel = 'trainingPlansErrorAtom'

// Async training plans atom with suspense support
export const asyncTrainingPlansAtom = atom(async () => {
  // This would be populated with actual async data fetching
  return [] as ExtendedTrainingPlan[]
})
asyncTrainingPlansAtom.debugLabel = 'asyncTrainingPlansAtom'

// Refreshable training plans atom using atomWithRefresh
export const refreshableTrainingPlansAtom = atomWithRefresh(async () => {
  // Only execute on client-side to prevent build-time fetch errors
  if (!isBrowser) return []
  const logger = createLogger('TrainingPlansAtom')
  try {
    logger.debug('Fetching training plans...')
    const response = await api.get<
      { trainingPlans?: ExtendedTrainingPlan[] } | ExtendedTrainingPlan[]
    >('/api/training-plans', {
      suppressGlobalToast: true,
    })
    const data = response.data
    // API returns { trainingPlans: [...] } so extract the array
    const plansArray = normalizeListResponse(data, 'trainingPlans')
    logger.debug('Training plans fetched', { count: plansArray.length })
    return plansArray as ExtendedTrainingPlan[]
  } catch (error) {
    logger.error('Error fetching training plans', error)
    return []
  }
})
refreshableTrainingPlansAtom.debugLabel = 'refreshableTrainingPlansAtom'

// Selected training plan atoms
export const selectedTrainingPlanAtom = atom<ExtendedTrainingPlan | null>(null)
selectedTrainingPlanAtom.debugLabel = 'selectedTrainingPlanAtom'
export const selectedTrainingPlanIdAtom = atom<string | null>(null)
selectedTrainingPlanIdAtom.debugLabel = 'selectedTrainingPlanIdAtom'

// Training plan filtering atoms
export const trainingPlanSearchTermAtom = atomWithStorage('trainingPlanSearchTerm', '')
trainingPlanSearchTermAtom.debugLabel = 'trainingPlanSearchTermAtom'
export const trainingPlanStatusFilterAtom = atomWithStorage('trainingPlanStatusFilter', 'all')
trainingPlanStatusFilterAtom.debugLabel = 'trainingPlanStatusFilterAtom'
export const trainingPlanSortByAtom = atomWithStorage<'name' | 'start_date' | 'created_at'>(
  'trainingPlanSortBy',
  'created_at'
)
trainingPlanSortByAtom.debugLabel = 'trainingPlanSortByAtom'

// Training plan form atoms
export const trainingPlanFormDataAtom = atom<Partial<ExtendedTrainingPlan>>({})
trainingPlanFormDataAtom.debugLabel = 'trainingPlanFormDataAtom'
export const isEditingTrainingPlanAtom = atom(false)
isEditingTrainingPlanAtom.debugLabel = 'isEditingTrainingPlanAtom'
export const editingTrainingPlanIdAtom = atom<string | null>(null)
editingTrainingPlanIdAtom.debugLabel = 'editingTrainingPlanIdAtom'

/**
 * Plan templates list atom - stores available training plan templates
 * Migrated from barrel file for better organization
 */
export const planTemplatesAtom = atom<PlanTemplate[]>([])
planTemplatesAtom.debugLabel = 'planTemplatesAtom'
