'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { TrainingPlan, User, Workout } from '@/lib/supabase'

type TrainingPlanWithRunner = TrainingPlan & { runners: User }

export default function CoachDashboard() {
  const { data: session } = useSession()
  const [trainingPlans, setTrainingPlans] = useState<TrainingPlanWithRunner[]>([])
  const [runners, setRunners] = useState<User[]>([])
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = useCallback(async () => {
    try {
      const { data: plans, error: plansError } = await supabase
        .from('training_plans')
        .select('*, runners:runner_id(*)')
        .eq('coach_id', session?.user?.id)
        .order('created_at', { ascending: false })

      if (plansError) throw plansError

      const { data: workouts, error: workoutsError } = await supabase
        .from('workouts')
        .select('*, training_plans!inner(*)')
        .eq('training_plans.coach_id', session?.user?.id)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(5)

      if (workoutsError) throw workoutsError

      const uniqueRunners = plans?.reduce((acc: User[], plan: TrainingPlanWithRunner) => {
        if (plan.runners && !acc.find(r => r.id === plan.runners.id)) {
          acc.push(plan.runners)
        }
        return acc
      }, []) || []

      setTrainingPlans(plans || [])
      setRunners(uniqueRunners)
      setRecentWorkouts(workouts || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (session?.user?.id) {
      fetchDashboardData()
    }
  }, [session, fetchDashboardData])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Coach Dashboard - {session?.user?.name}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900">Active Training Plans</h3>
            <p className="text-2xl font-bold text-blue-600">{trainingPlans.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900">Runners</h3>
            <p className="text-2xl font-bold text-green-600">{runners.length}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-900">Recent Workouts</h3>
            <p className="text-2xl font-bold text-purple-600">{recentWorkouts.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Training Plans</h3>
            <Link 
              href="/training-plans"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              Manage Plans
            </Link>
          </div>
          {trainingPlans.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No training plans yet.</p>
              <p className="text-sm text-gray-400">Create your first training plan to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {trainingPlans.map((plan) => (
                <div key={plan.id} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900">{plan.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                  {plan.runners && (
                    <p className="text-sm text-blue-600 mt-2">
                      Runner: {plan.runners.full_name}
                    </p>
                  )}
                  {plan.target_race_date && (
                    <p className="text-sm text-gray-600 mt-1">
                      Target Race: {new Date(plan.target_race_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {recentWorkouts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No recent workout activity.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentWorkouts.map((workout) => (
                <div key={workout.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{workout.actual_type || workout.planned_type}</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(workout.date).toLocaleDateString()}
                      </p>
                      {workout.actual_distance && (
                        <p className="text-sm text-gray-600">
                          Distance: {workout.actual_distance} miles
                        </p>
                      )}
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Completed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Runners</h3>
        {runners.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No runners assigned yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {runners.map((runner) => (
              <div key={runner.id} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">{runner.full_name}</h4>
                <p className="text-sm text-gray-600">{runner.email}</p>
                <div className="mt-2 flex gap-2">
                  <button className="text-blue-600 hover:text-blue-700 text-sm">
                    View Progress
                  </button>
                  <button className="text-green-600 hover:text-green-700 text-sm">
                    Send Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}