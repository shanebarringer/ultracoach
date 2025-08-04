import { useAtom } from 'jotai'

import { useCallback, useEffect, useState } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import { loadingStatesAtom, trainingPlansAtom, workoutsAtom } from '@/lib/atoms'
import type { TrainingPlan, User, Workout } from '@/lib/supabase'

type TrainingPlanWithRunner = TrainingPlan & { runners: User }

interface RelationshipData {
  id: string
  status: 'pending' | 'active' | 'inactive'
  relationship_type: 'standard' | 'invited'
  other_party: {
    id: string
    name: string
    full_name: string
    email: string
    role: 'coach' | 'runner'
  }
  is_coach: boolean
  is_runner: boolean
}

export function useDashboardData() {
  const { data: session } = useSession()
  const [trainingPlans, setTrainingPlans] = useAtom(trainingPlansAtom)
  const [workouts, setWorkouts] = useAtom(workoutsAtom)
  const [loadingStates, setLoadingStates] = useAtom(loadingStatesAtom)
  const [relationships, setRelationships] = useState<RelationshipData[]>([])

  const fetchDashboardData = useCallback(async () => {
    if (!session?.user?.id) return

    setLoadingStates(prev => ({
      ...prev,
      trainingPlans: true,
      workouts: true,
      relationships: true,
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

      // Fetch relationships (new!)
      const relationshipsResponse = await fetch('/api/my-relationships?status=active')
      if (relationshipsResponse.ok) {
        const relationshipsData = await relationshipsResponse.json()
        setRelationships(relationshipsData.relationships || [])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoadingStates(prev => ({
        ...prev,
        trainingPlans: false,
        workouts: false,
        relationships: false,
      }))
    }
  }, [session?.user?.id, setTrainingPlans, setWorkouts, setLoadingStates])

  useEffect(() => {
    if (session?.user?.id) {
      fetchDashboardData()
    }
  }, [session?.user?.id]) // Remove fetchDashboardData from dependencies since it's memoized with stable deps

  // Get runners from relationships (primary source) with fallback to training plans
  const runners = relationships
    .filter(rel => rel.other_party.role === 'runner')
    .map(
      rel =>
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
    runners.length === 0
      ? (trainingPlans as TrainingPlanWithRunner[]).reduce((acc: User[], plan) => {
          if (plan.runners && !acc.find(r => r.id === plan.runners.id)) {
            acc.push(plan.runners)
          }
          return acc
        }, [])
      : []

  const allRunners = runners.length > 0 ? runners : fallbackRunners

  const recentWorkouts = workouts.filter((w: Workout) => w.status === 'completed').slice(0, 5)

  const upcomingWorkouts = workouts
    .filter((w: Workout) => w.status === 'planned' && new Date(w.date) >= new Date())
    .slice(0, 5)

  return {
    trainingPlans,
    runners: allRunners,
    recentWorkouts,
    upcomingWorkouts,
    relationships,
    loading: loadingStates.trainingPlans || loadingStates.workouts || loadingStates.relationships,
  }
}
