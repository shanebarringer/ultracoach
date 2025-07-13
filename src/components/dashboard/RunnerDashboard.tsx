'use client'

import { useSession } from 'next-auth/react'
import { useDashboardData } from '@/hooks/useDashboardData'


export default function RunnerDashboard() {
  const { data: session } = useSession()
  const { trainingPlans, upcomingWorkouts, loading } = useDashboardData()

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
            Runner Dashboard
          </h2>
          <p className="text-gray-600">Welcome back, {session?.user?.name}!</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Active Training Plans</h3>
            <p className="text-3xl font-bold text-blue-600">{trainingPlans.length}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
            <h3 className="text-sm font-medium text-green-900 mb-2">Upcoming Workouts</h3>
            <p className="text-3xl font-bold text-green-600">{upcomingWorkouts.length}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
            <h3 className="text-sm font-medium text-purple-900 mb-2">This Week</h3>
            <p className="text-3xl font-bold text-purple-600">
              {upcomingWorkouts.filter(w => {
                const workoutDate = new Date(w.date)
                const today = new Date()
                const weekFromToday = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
                return workoutDate >= today && workoutDate <= weekFromToday
              }).length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Training Plans</h3>
          {trainingPlans.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No training plans yet.</p>
              <p className="text-sm text-gray-400">Ask your coach to create a training plan for you.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {trainingPlans.map((plan) => (
                <div key={plan.id} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900">{plan.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                  {plan.target_race_date && (
                    <p className="text-sm text-blue-600 mt-2">
                      Target Race: {new Date(plan.target_race_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Workouts</h3>
          {upcomingWorkouts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No upcoming workouts scheduled.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingWorkouts.map((workout) => (
                <div key={workout.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{workout.planned_type}</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(workout.date).toLocaleDateString()}
                      </p>
                      {workout.planned_distance && (
                        <p className="text-sm text-gray-600">
                          Distance: {workout.planned_distance} miles
                        </p>
                      )}
                    </div>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      Planned
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}