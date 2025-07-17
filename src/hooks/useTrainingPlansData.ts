'use client'

import { useAtom, useSetAtom } from 'jotai'
import { useSession } from '@/hooks/useBetterSession'
import { useEffect, useRef } from 'react'
import axios from 'axios'
import { trainingPlansAtom, loadingStatesAtom } from '@/lib/atoms'
import { createLogger } from '@/lib/logger'

const logger = createLogger('useTrainingPlansData')

export function useTrainingPlansData() {
  logger.debug('Hook initialized')
  const { data: session } = useSession()
  const [trainingPlans, setTrainingPlans] = useAtom(trainingPlansAtom)
  const setLoadingStates = useSetAtom(loadingStatesAtom)
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    logger.debug('useEffect: Running')
    
    // Only fetch if we have a session and haven't fetched yet
    if (!session?.user?.id || hasFetchedRef.current) {
      return
    }

    const fetchTrainingPlans = async () => {
      logger.debug('fetchTrainingPlans: Called via useTrainingPlansData')
      setLoadingStates(prev => ({ ...prev, trainingPlans: true }))

      try {
        const response = await axios.get('/api/training-plans')
        
        logger.debug('setTrainingPlans: Data updated', response.data.trainingPlans?.length)
        setTrainingPlans(response.data.trainingPlans || [])
        hasFetchedRef.current = true
      } catch (error) {
        logger.error('Error fetching training plans:', error)
      } finally {
        setLoadingStates(prev => ({ ...prev, trainingPlans: false }))
      }
    }

    fetchTrainingPlans()
  }, [session?.user?.id, setTrainingPlans, setLoadingStates])

  return {
    trainingPlans,
  }
}