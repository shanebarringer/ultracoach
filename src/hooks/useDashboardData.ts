import { useAtom, useAtomValue } from 'jotai'

import { useCallback, useEffect, useMemo } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import {
  loadingStatesAtom,
  relationshipsAtom,
  relationshipsLoadableAtom,
  trainingPlansAtom,
  workoutsAtom,
} from '@/lib/atoms'
import { createLogger } from '@/lib/logger'
import type { TrainingPlan, User, Workout } from '@/lib/supabase'
import type { RelationshipData } from '@/types/relationships'

const logger = createLogger('useDashboardData')

type TrainingPlanWithRunner = TrainingPlan & { runners: User }

export function useDashboardData() {
  const { data: session } = useSession()
  // Use Jotai atoms for centralized state management
  const [trainingPlans, setTrainingPlans] = useAtom(trainingPlansAtom)
  const [workouts, setWorkouts] = useAtom(workoutsAtom)
  const [loadingStates, setLoadingStates] = useAtom(loadingStatesAtom)
  const [relationships, setRelationships] = useAtom(relationshipsAtom)
  const relationshipsLoadable = useAtomValue(relationshipsLoadableAtom)

  const fetchDashboardData = useCallback(async () => {
    if (!session?.user?.id) return

    setLoadingStates(prev => ({
      ...prev,
      trainingPlans: true,
      workouts: true,
    }))

    try {
      // Fetch training plans
      const plansResponse = await fetch('/api/training-plans')
      if (plansResponse.ok) {
        const plansData = await plansResponse.json()
        setTrainingPlans(plansData.trainingPlans || [])
      }

      // Fetch workouts
      const workoutsResponse = await fetch('/api/workouts')
      if (workoutsResponse.ok) {
        const workoutsData = await workoutsResponse.json()
        setWorkouts(workoutsData.workouts || [])
      }

      // Relationships are now handled by the relationshipsAtom automatically
    } catch (error) {
      logger.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoadingStates(prev => ({
        ...prev,
        trainingPlans: false,
        workouts: false,
      }))
    }
  }, [session?.user?.id, setTrainingPlans, setWorkouts, setLoadingStates])

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
            role: rel.other_party.role,
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

  const recentWorkouts = useMemo(
    () => workouts.filter((w: Workout) => w.status === 'completed').slice(0, 5),
    [workouts]
  )

  const upcomingWorkouts = useMemo(() => {
    return workouts
      .filter((w: Workout) => w.status === 'planned' && new Date(w.date) >= new Date())
      .slice(0, 5)
  }, [workouts])

  return {
    trainingPlans,
    runners,
    recentWorkouts,
    upcomingWorkouts,
    relationships,
    loading: loadingStates.trainingPlans || loadingStates.workouts || relationships.length === 0,
  }
}
