'use client'

import axios from 'axios'
import { useAtom, useSetAtom } from 'jotai'

import { useCallback, useEffect, useRef } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import { loadingStatesAtom, trainingPlansAtom } from '@/lib/atoms'
import { createLogger } from '@/lib/logger'

const logger = createLogger('useTrainingPlansData')

export function useTrainingPlansData() {
  logger.debug('Hook initialized')
  const { data: session } = useSession()
  const [trainingPlans, setTrainingPlans] = useAtom(trainingPlansAtom)
  const setLoadingStates = useSetAtom(loadingStatesAtom)
  const lastSessionIdRef = useRef<string | null>(null)

  const fetchTrainingPlans = useCallback(
    async (force = false) => {
      if (!session?.user?.id) {
        logger.debug('No session, skipping fetch')
        return
      }

      // If we already have training plans and it's not a forced refresh, skip
      if (trainingPlans.length > 0 && !force) {
        logger.debug('Training plans already loaded, skipping fetch')
        return
      }

      logger.debug('fetchTrainingPlans: Called via useTrainingPlansData', { force })
      setLoadingStates(prev => ({ ...prev, trainingPlans: true }))

      try {
        const response = await axios.get('/api/training-plans')

        logger.debug('setTrainingPlans: Data updated', response.data.trainingPlans?.length)
        setTrainingPlans(response.data.trainingPlans || [])
      } catch (error) {
        logger.error('Error fetching training plans:', error)
        // Reset trainingPlans on error to allow retry
        setTrainingPlans([])
      } finally {
        setLoadingStates(prev => ({ ...prev, trainingPlans: false }))
      }
    },
    [session?.user?.id, trainingPlans.length, setTrainingPlans, setLoadingStates]
  )

  useEffect(() => {
    logger.debug('useEffect: Running')

    if (!session?.user?.id) {
      return
    }

    // If the session has changed (different user), force a refresh
    const currentSessionId = session.user.id
    const shouldForceRefresh = lastSessionIdRef.current !== currentSessionId

    if (shouldForceRefresh) {
      logger.debug('Session changed, forcing refresh')
      lastSessionIdRef.current = currentSessionId
      setTrainingPlans([]) // Clear existing data
      fetchTrainingPlans(true) // Force fetch
    } else {
      fetchTrainingPlans(false) // Normal fetch
    }
  }, [session?.user?.id, fetchTrainingPlans, setTrainingPlans])

  const refreshTrainingPlans = useCallback(() => {
    logger.debug('Manual refresh requested')
    fetchTrainingPlans(true)
  }, [fetchTrainingPlans])

  return {
    trainingPlans,
    refreshTrainingPlans,
  }
}
