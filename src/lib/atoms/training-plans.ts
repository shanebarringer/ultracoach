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

/**
 * Plan templates list atom - stores available training plan templates
 * Migrated from barrel file for better organization
 */
export const planTemplatesAtom = atom<PlanTemplate[]>([])

// Jotai Devtools debug labels
trainingPlansAtom.debugLabel = 'trainingPlans/list'
trainingPlansLoadingAtom.debugLabel = 'trainingPlans/loading'
trainingPlansErrorAtom.debugLabel = 'trainingPlans/error'
asyncTrainingPlansAtom.debugLabel = 'trainingPlans/async'
refreshableTrainingPlansAtom.debugLabel = 'trainingPlans/refreshable'
selectedTrainingPlanAtom.debugLabel = 'trainingPlans/selected'
selectedTrainingPlanIdAtom.debugLabel = 'trainingPlans/selectedId'
trainingPlanSearchTermAtom.debugLabel = 'trainingPlans/searchTerm'
trainingPlanStatusFilterAtom.debugLabel = 'trainingPlans/statusFilter'
trainingPlanSortByAtom.debugLabel = 'trainingPlans/sortBy'
trainingPlanFormDataAtom.debugLabel = 'trainingPlans/formData'
isEditingTrainingPlanAtom.debugLabel = 'trainingPlans/isEditing'
editingTrainingPlanIdAtom.debugLabel = 'trainingPlans/editingId'
planTemplatesAtom.debugLabel = 'trainingPlans/templates'
