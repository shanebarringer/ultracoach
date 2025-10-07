'use client'

import { useAtomValue, useSetAtom } from 'jotai'

import { asyncTrainingPlansAtom, refreshTrainingPlansAtom } from '@/lib/atoms/training-plans'

export function useRefreshableTrainingPlans() {
  const trainingPlans = useAtomValue(asyncTrainingPlansAtom)
  const refreshTrainingPlans = useSetAtom(refreshTrainingPlansAtom)

  return {
    trainingPlans,
    refreshTrainingPlans,
    isLoading: false, // Suspense handles loading state
  }
}
