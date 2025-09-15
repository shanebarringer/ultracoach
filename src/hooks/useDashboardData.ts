import { useAtom, useAtomValue, useSetAtom } from 'jotai'

import { useCallback, useEffect, useMemo } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import {
  asyncWorkoutsAtom,
  completedWorkoutsAtom,
  loadingStatesAtom,
  refreshWorkoutsAtom,
  relationshipsAtom,
  relationshipsLoadableAtom,
  trainingPlansAtom,
  upcomingWorkoutsAtom,
  workoutsAtom,
} from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import type { TrainingPlan, User } from '@/lib/supabase'
import type { RelationshipData } from '@/types/relationships'

const logger = createLogger('useDashboardData')

type TrainingPlanWithRunner = TrainingPlan & { runners: User }

export function useDashboardData() {
  const { data: session } = useSession()
  // Use Jotai atoms for centralized state management
  const [trainingPlans, setTrainingPlans] = useAtom(trainingPlansAtom)
  const [, setWorkouts] = useAtom(workoutsAtom)

  // Trigger async workouts loading and sync to main atom
  const asyncWorkouts = useAtomValue(asyncWorkoutsAtom)

  // Update the main workouts atom when async workouts are fetched
  useEffect(() => {
    if (asyncWorkouts) {
      setWorkouts(asyncWorkouts)
    }
  }, [asyncWorkouts, setWorkouts])

  const upcomingWorkouts = useAtomValue(upcomingWorkoutsAtom)
  const completedWorkouts = useAtomValue(completedWorkoutsAtom)
  const refreshWorkouts = useSetAtom(refreshWorkoutsAtom)
  const [loadingStates, setLoadingStates] = useAtom(loadingStatesAtom)
  const [relationships, setRelationships] = useAtom(relationshipsAtom)
  const relationshipsLoadable = useAtomValue(relationshipsLoadableAtom)

  const fetchDashboardData = useCallback(async () => {
    if (!session?.user?.id) return

    setLoadingStates(prev => ({
      ...prev,
      trainingPlans: true,
    }))

    try {
      // Fetch training plans
      const plansResponse = await fetch('/api/training-plans')
      if (plansResponse.ok) {
        const plansData = await plansResponse.json()
        setTrainingPlans(plansData.trainingPlans || [])
      }

      // Workouts are now handled by asyncWorkoutsAtom - just trigger a refresh
      refreshWorkouts()

      // Relationships are now handled by the relationshipsAtom automatically
    } catch (error) {
      logger.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoadingStates(prev => ({
        ...prev,
        trainingPlans: false,
      }))
    }
  }, [session?.user?.id, setTrainingPlans, refreshWorkouts, setLoadingStates])

  useEffect(() => {
    if (session?.user?.id) {
      fetchDashboardData()
    }
  }, [session?.user?.id, fetchDashboardData])

  // Sync relationships data from loadable to regular atom
  useEffect(() => {
    if (
      relationshipsLoadable.state === 'hasData' &&
      'data' in relationshipsLoadable &&
      relationshipsLoadable.data
    ) {
      setRelationships(relationshipsLoadable.data)
    }
  }, [relationshipsLoadable, setRelationships])

  // Use useMemo for better performance when computing derived data
  const runners = useMemo(() => {
    // Add safety check for other_party and role
    const relationshipRunners = relationships
      .filter((rel: RelationshipData) => {
        if (!rel.other_party) {
          return false
        }
        // Check role property (as defined in RelationshipData type)
        if (!rel.other_party.role) {
          return false
        }
        return rel.other_party.role === 'runner'
      })
      .map(
        (rel: RelationshipData) =>
          ({
            id: rel.other_party.id,
            email: rel.other_party.email,
            userType: rel.other_party.role as 'runner' | 'coach', // Map role to userType
            full_name: rel.other_party.full_name,
            created_at: new Date().toISOString(), // Default value for compatibility
            updated_at: new Date().toISOString(), // Default value for compatibility
          }) as User
      )

    // If no runners from relationships, fall back to training plan runners
    const fallbackRunners =
      relationshipRunners.length === 0
        ? (trainingPlans as TrainingPlanWithRunner[]).reduce((acc: User[], plan) => {
            if (plan.runners && !acc.find(r => r.id === plan.runners.id)) {
              acc.push(plan.runners)
            }
            return acc
          }, [])
        : []

    return relationshipRunners.length > 0 ? relationshipRunners : fallbackRunners
  }, [relationships, trainingPlans])

  // Use derived atoms directly, they're already filtered and sorted
  const recentWorkouts = useMemo(() => completedWorkouts.slice(0, 5), [completedWorkouts])

  const upcomingWorkoutsLimited = useMemo(() => {
    return upcomingWorkouts.slice(0, 5)
  }, [upcomingWorkouts])

  return {
    trainingPlans,
    runners,
    recentWorkouts,
    upcomingWorkouts: upcomingWorkoutsLimited,
    relationships,
    loading: loadingStates.trainingPlans,
  }
}
