'use client'

import { useAtom } from 'jotai'

import { refreshableTrainingPlansAtom } from '@/lib/atoms/index'

export function useRefreshableTrainingPlans() {
  const [trainingPlans, refreshTrainingPlans] = useAtom(refreshableTrainingPlansAtom)

  return {
    trainingPlans,
    refreshTrainingPlans,
    isLoading: false, // atomWithRefresh handles loading internally
  }
}
