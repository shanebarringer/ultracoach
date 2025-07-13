'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
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
      // Fetch training plans via API
      const plansResponse = await fetch('/api/training-plans')
      if (plansResponse.ok) {
        const plansData = await plansResponse.json()
        const plans = plansData.trainingPlans || []
        setTrainingPlans(plans)

        // Extract unique runners from training plans
        const uniqueRunners = plans.reduce((acc: User[], plan: TrainingPlanWithRunner) => {
          if (plan.runners && !acc.find(r => r.id === plan.runners.id)) {
            acc.push(plan.runners)
          }
          return acc
        }, [])
        setRunners(uniqueRunners)
      }

      // Fetch recent completed workouts via API
      const workoutsResponse = await fetch('/api/workouts')
      if (workoutsResponse.ok) {
        const workoutsData = await workoutsResponse.json()
        const recentWorkouts = (workoutsData.workouts || [])
          .filter((w: Workout) => w.status === 'completed')
          .slice(0, 5)
        setRecentWorkouts(recentWorkouts)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session?.user?.id) {
      fetchDashboardData()
    }
  }, [session, fetchDashboardData])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Coach Dashboard
          </h2>
          <p className="text-gray-600">Welcome back, {session?.user?.name}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Active Training Plans</h3>
            <p className="text-3xl font-bold text-blue-600">{trainingPlans.length}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
            <h3 className="text-sm font-medium text-green-900 mb-2">Runners</h3>
            <p className="text-3xl font-bold text-green-600">{runners.length}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
            <h3 className="text-sm font-medium text-purple-900 mb-2">Recent Workouts</h3>
            <p className="text-3xl font-bold text-purple-600">{recentWorkouts.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Training Plans</h3>
            <Link 
              href="/training-plans"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              Manage Plans
            </Link>
          </div>
          {trainingPlans.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-900 font-medium mb-2">No training plans yet</p>
              <p className="text-sm text-gray-500">Create your first training plan to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {trainingPlans.map((plan) => (
                <div key={plan.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="font-semibold text-gray-900 mb-2">{plan.title}</h4>
                  <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {plan.runners && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {plan.runners.full_name}
                      </span>
                    )}
                    {plan.target_race_date && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {new Date(plan.target_race_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h3>
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