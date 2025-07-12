'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useAtom } from 'jotai'
import Layout from '@/components/layout/Layout'
import WorkoutLogModal from '@/components/workouts/WorkoutLogModal'
import { useWorkouts } from '@/hooks/useWorkouts'
import { uiStateAtom, loadingStatesAtom, filteredWorkoutsAtom } from '@/lib/atoms'
import type { Workout } from '@/lib/atoms'

export default function WorkoutsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  useWorkouts() // Initialize workouts data
  const [uiState, setUiState] = useAtom(uiStateAtom)
  const [loadingStates] = useAtom(loadingStatesAtom)
  const [filteredWorkouts] = useAtom(filteredWorkoutsAtom)
  const [showLogWorkout, setShowLogWorkout] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  const handleLogWorkout = (workout: any) => {
    setUiState(prev => ({ ...prev, selectedWorkout: workout }))
    setShowLogWorkout(true)
  }

  const handleLogWorkoutSuccess = () => {
    setUiState(prev => ({ ...prev, selectedWorkout: null }))
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


  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )

  if (!session) {
    return null
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Workouts</h1>
            <p className="text-gray-600 mt-1">
              {session.user.role === 'coach' 
                ? 'View and manage workouts for your runners'
                : 'Track and log your workouts'
              }
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'all', label: 'All Workouts' },
                { key: 'planned', label: 'Planned' },
                { key: 'completed', label: 'Completed' },
                { key: 'skipped', label: 'Skipped' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setUiState(prev => ({ ...prev, workoutFilter: tab.key as 'all' | 'planned' | 'completed' | 'skipped' }))}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    uiState.workoutFilter === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {loadingStates.workouts ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredWorkouts.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No workouts found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {uiState.workoutFilter === 'all' 
                ? 'No workouts have been created yet.'
                : `No ${uiState.workoutFilter} workouts found.`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredWorkouts.map((workout) => (
              <div key={workout.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {workout.type}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getWorkoutStatusColor(workout.status)}`}>
                        {workout.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(workout.date)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Planned</h4>
                        <p className="text-sm text-gray-600">
                          {workout.distance && `${workout.distance} miles`}
                          {workout.duration && ` • ${workout.duration} min`}
                          {!workout.distance && !workout.duration && 'No specific targets'}
                        </p>
                      </div>
                      
                      {workout.status === 'completed' && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Actual</h4>
                          <p className="text-sm text-gray-600">
                            {workout.distance && `${workout.distance} miles`}
                            {workout.duration && ` • ${workout.duration} min`}
                            {!workout.distance && !workout.duration && 'No data logged'}
                          </p>
                        </div>
                      )}
                    </div>

                    {workout.notes && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Notes</h4>
                        <p className="text-sm text-gray-600">{workout.notes}</p>
                      </div>
                    )}


                  </div>
                  
                  <div className="flex gap-2 ml-4">
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

        {uiState.selectedWorkout && (
          <WorkoutLogModal
            isOpen={showLogWorkout}
            onClose={() => setShowLogWorkout(false)}
            onSuccess={handleLogWorkoutSuccess}
            workout={uiState.selectedWorkout as any}
          />
        )}
      </div>
    </Layout>
  )
}