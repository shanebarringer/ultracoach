import { useAtom } from 'jotai'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect } from 'react'
import { trainingPlansAtom, workoutsAtom, loadingStatesAtom } from '@/lib/atoms'
import type { TrainingPlan, Workout, User } from '@/lib/supabase'

type TrainingPlanWithRunner = TrainingPlan & { runners: User }

export function useDashboardData() {
  const { data: session } = useSession()
  const [trainingPlans, setTrainingPlans] = useAtom(trainingPlansAtom)
  const [workouts, setWorkouts] = useAtom(workoutsAtom)
  const [loadingStates, setLoadingStates] = useAtom(loadingStatesAtom)

  const fetchDashboardData = useCallback(async () => {
    if (!session?.user?.id) return

    setLoadingStates(prev => ({ ...prev, trainingPlans: true, workouts: true }))

    try {
      const plansResponse = await fetch('/api/training-plans')
      if (plansResponse.ok) {
        const plansData = await plansResponse.json()
        setTrainingPlans(plansData.trainingPlans || [])
      }

      const workoutsResponse = await fetch('/api/workouts')
      if (workoutsResponse.ok) {
        const workoutsData = await workoutsResponse.json()
        setWorkouts(workoutsData.workouts || [])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoadingStates(prev => ({ ...prev, trainingPlans: false, workouts: false }))
    }
  }, [session?.user?.id, setTrainingPlans, setWorkouts, setLoadingStates])

  useEffect(() => {
    if (session?.user?.id) {
      fetchDashboardData()
    }
  }, [session?.user?.id, fetchDashboardData])

  const runners = (trainingPlans as TrainingPlanWithRunner[]).reduce((acc: User[], plan) => {
    if (plan.runners && !acc.find(r => r.id === plan.runners.id)) {
      acc.push(plan.runners)
    }
    return acc
  }, [])

  const recentWorkouts = workouts
    .filter((w: Workout) => w.status === 'completed')
    .slice(0, 5)

  const upcomingWorkouts = workouts
    .filter((w: Workout) => w.status === 'planned' && new Date(w.date) >= new Date())
    .slice(0, 5)

  return {
    trainingPlans,
    runners,
    recentWorkouts,
    upcomingWorkouts,
    loading: loadingStates.trainingPlans || loadingStates.workouts,
  }
}
