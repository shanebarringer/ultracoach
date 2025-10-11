'use client'

import { useAtomValue, useSetAtom } from 'jotai'

import { useEffect } from 'react'

import { asyncTrainingPlansAtom, trainingPlansAtom } from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'

const logger = createLogger('useTrainingPlans')

/**
 * Hook to hydrate the synchronous trainingPlansAtom from the async Suspense-based atom
 * This ensures data consistency and works properly with React Suspense boundaries
 *
 * IMPORTANT: This hook will trigger Suspense if data is not loaded yet.
 * It should be called from components wrapped in <Suspense> boundaries.
 */
export function useHydrateTrainingPlans() {
  const setTrainingPlans = useSetAtom(trainingPlansAtom)

  // This will trigger Suspense if not already loaded
  // asyncTrainingPlansAtom is an async atom with refresh trigger pattern
  const asyncTrainingPlans = useAtomValue(asyncTrainingPlansAtom)

  useEffect(() => {
    logger.debug('Hydrating training plans atom from async data', {
      count: asyncTrainingPlans?.length ?? 0,
    })
    setTrainingPlans(asyncTrainingPlans ?? [])
  }, [asyncTrainingPlans, setTrainingPlans])

  return asyncTrainingPlans
}
