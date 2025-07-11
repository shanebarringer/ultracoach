'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import Layout from '@/components/layout/Layout'
import AddWorkoutModal from '@/components/workouts/AddWorkoutModal'
import WorkoutLogModal from '@/components/workouts/WorkoutLogModal'
import type { TrainingPlan, User, Workout } from '@/lib/supabase'

type TrainingPlanWithUsers = TrainingPlan & { runners?: User; coaches?: User }

export default function TrainingPlanDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const planId = params.id as string

  const [trainingPlan, setTrainingPlan] = useState<TrainingPlanWithUsers | null>(null)
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddWorkout, setShowAddWorkout] = useState(false)
  const [showLogWorkout, setShowLogWorkout] = useState(false)
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)

  const fetchTrainingPlanDetails = useCallback(async () => {
    if (!session?.user?.id || !planId) return

    try {
      const response = await fetch(`/api/training-plans/${planId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/training-plans')
          return
        }
        console.error('Failed to fetch training plan:', response.statusText)
        return
      }

      const data = await response.json()
      setTrainingPlan(data.trainingPlan)
      setWorkouts(data.workouts || [])
    } catch (error) {
      console.error('Error fetching training plan details:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, planId, router])

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    fetchTrainingPlanDetails()
  }, [session, status, router, planId, fetchTrainingPlanDetails])

  const handleAddWorkoutSuccess = () => {
    fetchTrainingPlanDetails()
  }

  const handleLogWorkoutSuccess = () => {
    fetchTrainingPlanDetails()
    setSelectedWorkout(null)
  }

  const handleLogWorkout = (workout: Workout) => {
    setSelectedWorkout(workout)
    setShowLogWorkout(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getWorkoutStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'skipped':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  if (!session || !trainingPlan) {
    return null
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Training Plans
          </button>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{trainingPlan.title}</h1>
            
            {trainingPlan.description && (
              <p className="text-gray-600 mb-6">{trainingPlan.description}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900">Created</h3>
                <p className="text-blue-700">{formatDate(trainingPlan.created_at)}</p>
              </div>
              
              {trainingPlan.target_race_date && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900">Target Race</h3>
                  <p className="text-green-700">{formatDate(trainingPlan.target_race_date)}</p>
                </div>
              )}
              
              {trainingPlan.target_race_distance && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-900">Distance</h3>
                  <p className="text-purple-700">{trainingPlan.target_race_distance}</p>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900">
                  {session.user.role === 'coach' ? 'Runner' : 'Coach'}
                </h3>
                <p className="text-gray-700">
                  {session.user.role === 'coach' 
                    ? trainingPlan.runners?.full_name
                    : trainingPlan.coaches?.full_name
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Workouts</h2>
            {session.user.role === 'coach' && (
              <button 
                onClick={() => setShowAddWorkout(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Workout
              </button>
            )}
          </div>

          {workouts.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No workouts yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                {session.user.role === 'coach' 
                  ? 'Add workouts to get started with this training plan.'
                  : 'Your coach will add workouts to this training plan.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {workouts.map((workout) => (
                <div key={workout.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900">{workout.planned_type}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${getWorkoutStatusColor(workout.status)}`}>
                          {workout.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{formatDate(workout.date)}</p>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Planned:</span>
                          <span className="ml-2">
                            {workout.planned_distance && `${workout.planned_distance} miles`}
                            {workout.planned_duration && ` • ${workout.planned_duration} min`}
                          </span>
                        </div>
                        
                        {workout.status === 'completed' && (
                          <div>
                            <span className="text-gray-500">Actual:</span>
                            <span className="ml-2">
                              {workout.actual_distance && `${workout.actual_distance} miles`}
                              {workout.actual_duration && ` • ${workout.actual_duration} min`}
                            </span>
                          </div>
                        )}
                      </div>

                      {workout.workout_notes && (
                        <div className="mt-2">
                          <span className="text-gray-500 text-sm">Notes:</span>
                          <p className="text-sm text-gray-700 mt-1">{workout.workout_notes}</p>
                        </div>
                      )}

                      {workout.coach_feedback && (
                        <div className="mt-2">
                          <span className="text-gray-500 text-sm">Coach Feedback:</span>
                          <p className="text-sm text-gray-700 mt-1">{workout.coach_feedback}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      {session.user.role === 'runner' && workout.status === 'planned' && (
                        <button
                          onClick={() => handleLogWorkout(workout)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                        >
                          Log Workout
                        </button>
                      )}
                      {session.user.role === 'runner' && workout.status === 'completed' && (
                        <button
                          onClick={() => handleLogWorkout(workout)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        >
                          Edit Log
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {trainingPlan && (
          <AddWorkoutModal
            isOpen={showAddWorkout}
            onClose={() => setShowAddWorkout(false)}
            onSuccess={handleAddWorkoutSuccess}
            trainingPlanId={trainingPlan.id}
          />
        )}

        {selectedWorkout && (
          <WorkoutLogModal
            isOpen={showLogWorkout}
            onClose={() => setShowLogWorkout(false)}
            onSuccess={handleLogWorkoutSuccess}
            workout={selectedWorkout}
          />
        )}
      </div>
    </Layout>
  )
}