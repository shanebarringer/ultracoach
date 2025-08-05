'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'

import Layout from '@/components/layout/Layout'
import AddWorkoutModal from '@/components/workouts/AddWorkoutModal'
import WorkoutLogModal from '@/components/workouts/WorkoutLogModal'
import { useSession } from '@/hooks/useBetterSession'
import type { PlanPhase, Race, TrainingPlan, User, Workout } from '@/lib/supabase'

type TrainingPlanWithUsers = TrainingPlan & {
  runners?: User
  coaches?: User
  race?: Race
  plan_phases?: PlanPhase[]
  previous_plan?: TrainingPlan
  next_plan?: TrainingPlan
}

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
  const [isDeleting, setIsDeleting] = useState(false)

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

      // Fetch plan phases
      const phasesResponse = await fetch(`/api/training-plans/${planId}/phases`)
      if (phasesResponse.ok) {
        const phasesData = await phasesResponse.json()
        setTrainingPlan(prev => ({ ...prev!, plan_phases: phasesData.plan_phases || [] }))
      } else {
        console.error('Failed to fetch plan phases:', phasesResponse.statusText)
      }

      // Fetch previous and next plans if they exist
      if (data.trainingPlan.previous_plan_id) {
        const prevPlanResponse = await fetch(
          `/api/training-plans/${data.trainingPlan.previous_plan_id}`
        )
        if (prevPlanResponse.ok) {
          const prevPlanData = await prevPlanResponse.json()
          setTrainingPlan(prev => ({ ...prev!, previous_plan: prevPlanData.trainingPlan }))
        } else {
          console.error('Failed to fetch previous plan:', prevPlanResponse.statusText)
        }
      }

      if (data.trainingPlan.next_plan_id) {
        const nextPlanResponse = await fetch(
          `/api/training-plans/${data.trainingPlan.next_plan_id}`
        )
        if (nextPlanResponse.ok) {
          const nextPlanData = await nextPlanResponse.json()
          setTrainingPlan(prev => ({ ...prev!, next_plan: nextPlanData.trainingPlan }))
        } else {
          console.error('Failed to fetch next plan:', nextPlanResponse.statusText)
        }
      }
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
  }, [status, session, router, fetchTrainingPlanDetails])

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

  const handleDelete = async () => {
    if (
      !window.confirm(
        'Are you sure you want to delete this training plan? This action cannot be undone.'
      )
    )
      return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/training-plans/${planId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        router.push('/training-plans')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to delete training plan')
      }
    } catch (error) {
      console.error('Error deleting training plan:', error)
      alert('Failed to delete training plan')
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const calculateCurrentPhase = useCallback(() => {
    if (
      !trainingPlan?.start_date ||
      !trainingPlan.plan_phases ||
      trainingPlan.plan_phases.length === 0
    ) {
      return null
    }

    const startDate = new Date(trainingPlan.start_date)
    const today = new Date()
    let totalWeeks = 0

    for (const phase of trainingPlan.plan_phases.sort((a, b) => a.order - b.order)) {
      const phaseEndDate = new Date(startDate)
      phaseEndDate.setDate(startDate.getDate() + (totalWeeks + phase.duration_weeks) * 7)

      if (today >= startDate && today <= phaseEndDate) {
        return phase
      }
      totalWeeks += phase.duration_weeks
    }
    return null
  }, [trainingPlan])

  const currentPhase = calculateCurrentPhase()

  const groupWorkoutsByPhase = useCallback(() => {
    if (
      !trainingPlan?.plan_phases ||
      trainingPlan.plan_phases.length === 0 ||
      !trainingPlan.start_date
    ) {
      return { grouped: {}, ungrouped: workouts }
    }

    const grouped: Record<string, Workout[]> = {}
    const phaseDates: Record<string, { start: Date; end: Date }> = {}
    const planStartDate = new Date(trainingPlan.start_date)
    let currentWeekOffset = 0

    trainingPlan.plan_phases
      .sort((a, b) => a.order - b.order)
      .forEach(phase => {
        const phaseStartDate = new Date(planStartDate)
        phaseStartDate.setDate(planStartDate.getDate() + currentWeekOffset * 7)
        const phaseEndDate = new Date(phaseStartDate)
        phaseEndDate.setDate(phaseStartDate.getDate() + phase.duration_weeks * 7 - 1) // -1 to keep it within the week

        phaseDates[phase.id] = { start: phaseStartDate, end: phaseEndDate }
        grouped[phase.id] = []
        currentWeekOffset += phase.duration_weeks
      })

    const ungrouped: Workout[] = []

    workouts.forEach(workout => {
      const workoutDate = new Date(workout.date)
      let foundPhase = false
      for (const phaseId in phaseDates) {
        const { start, end } = phaseDates[phaseId]
        if (workoutDate >= start && workoutDate <= end) {
          grouped[phaseId].push(workout)
          foundPhase = true
          break
        }
      }
      if (!foundPhase) {
        ungrouped.push(workout)
      }
    })

    // Sort workouts within each group by date
    for (const phaseId in grouped) {
      grouped[phaseId].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }

    return { grouped, ungrouped }
  }, [trainingPlan, workouts])

  const { grouped: workoutsByPhase, ungrouped: ungroupedWorkouts } = groupWorkoutsByPhase()

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Training Plans
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete Plan'}
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Training Phases
            </h2>
            {trainingPlan.plan_phases && trainingPlan.plan_phases.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trainingPlan.plan_phases
                  .sort((a, b) => a.order - b.order)
                  .map(phase => (
                    <div
                      key={phase.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {phase.phase_name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Duration: {phase.duration_weeks} weeks
                      </p>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  No training phases defined for this plan.
                </p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Training Phases
            </h2>
            {trainingPlan.plan_phases && trainingPlan.plan_phases.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trainingPlan.plan_phases
                  .sort((a, b) => a.order - b.order)
                  .map(phase => (
                    <div
                      key={phase.id}
                      className={`border rounded-lg p-4 ${currentPhase?.id === phase.id ? 'border-blue-500 bg-blue-50 dark:border-blue-700 dark:bg-blue-900' : 'border-gray-200 dark:border-gray-700'}`}
                    >
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {phase.phase_name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Duration: {phase.duration_weeks} weeks
                      </p>
                      {currentPhase?.id === phase.id && (
                        <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                          Current Phase
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  No training phases defined for this plan.
                </p>
              </div>
            )}
          </div>

          {/* Plan Sequencing Navigation */}
          {(trainingPlan.previous_plan || trainingPlan.next_plan) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Plan Sequence
              </h2>
              <div className="flex justify-between items-center">
                {trainingPlan.previous_plan ? (
                  <Link
                    href={`/training-plans/${trainingPlan.previous_plan.id}`}
                    className="flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    {trainingPlan.previous_plan.title}
                  </Link>
                ) : (
                  <div />
                )}
                {trainingPlan.next_plan ? (
                  <Link
                    href={`/training-plans/${trainingPlan.next_plan.id}`}
                    className="flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {trainingPlan.next_plan.title}
                    <svg
                      className="w-5 h-5 ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                ) : (
                  <div />
                )}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {trainingPlan.title}
            </h1>

            {trainingPlan.description && (
              <p className="text-gray-600 dark:text-gray-300 mb-6">{trainingPlan.description}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Created</h3>
                <p className="text-blue-700 dark:text-blue-300">
                  {formatDate(trainingPlan.created_at)}
                </p>
              </div>

              {trainingPlan.race && (
                <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900 dark:text-green-100">Target Race</h3>
                  <p className="text-green-700 dark:text-green-300">{trainingPlan.race.name}</p>
                  <p className="text-green-700 dark:text-green-300 text-sm">
                    {formatDate(trainingPlan.race.date)}
                  </p>
                </div>
              )}

              {trainingPlan.goal_type && (
                <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100">Goal Type</h3>
                  <p className="text-purple-700 capitalize dark:text-purple-300">
                    {trainingPlan.goal_type.replace('_', ' ')}
                  </p>
                </div>
              )}

              {trainingPlan.plan_type && (
                <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">Plan Type</h3>
                  <p className="text-yellow-700 capitalize dark:text-yellow-300">
                    {trainingPlan.plan_type.replace('_', ' ')}
                  </p>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {session.user.role === 'coach' ? 'Runner' : 'Coach'}
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  {session.user.role === 'coach'
                    ? trainingPlan.runners?.full_name
                    : trainingPlan.coaches?.full_name}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Workouts</h2>
            {session.user.role === 'coach' && (
              <button
                onClick={() => setShowAddWorkout(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                Add Workout
              </button>
            )}
          </div>

          {workouts.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 012-2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No workouts yet
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {session.user.role === 'coach'
                  ? 'Add workouts to get started with this training plan.'
                  : 'Your coach will add workouts to this training plan.'}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {trainingPlan?.plan_phases
                ?.sort((a, b) => a.order - b.order)
                .map(phase => (
                  <div key={phase.id}>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      {phase.phase_name}
                    </h3>
                    {workoutsByPhase[phase.id] && workoutsByPhase[phase.id].length > 0 ? (
                      <div className="space-y-4">
                        {workoutsByPhase[phase.id].map(workout => (
                          <div
                            key={workout.id}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-medium text-gray-900 dark:text-white">
                                    {workout.planned_type}
                                  </h3>
                                  <span
                                    className={`px-2 py-1 text-xs rounded-full ${getWorkoutStatusColor(workout.status)}`}
                                  >
                                    {workout.status}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                  {formatDate(workout.date)}
                                </p>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">
                                      Planned:
                                    </span>
                                    <span className="ml-2 text-gray-700 dark:text-gray-200">
                                      {workout.planned_distance &&
                                        `${workout.planned_distance} miles`}
                                      {workout.planned_duration &&
                                        ` • ${workout.planned_duration} min`}
                                    </span>
                                  </div>

                                  {workout.status === 'completed' && (
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">
                                        Actual:
                                      </span>
                                      <span className="ml-2 text-gray-700 dark:text-gray-200">
                                        {workout.actual_distance &&
                                          `${workout.actual_distance} miles`}
                                        {workout.actual_duration &&
                                          ` • ${workout.actual_duration} min`}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {workout.workout_notes && (
                                  <div className="mt-2">
                                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                                      Notes:
                                    </span>
                                    <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">
                                      {workout.workout_notes}
                                    </p>
                                  </div>
                                )}

                                {workout.coach_feedback && (
                                  <div className="mt-2">
                                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                                      Coach Feedback:
                                    </span>
                                    <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">
                                      {workout.coach_feedback}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2 mt-4">
                                {session.user.role === 'runner' && workout.status === 'planned' && (
                                  <button
                                    onClick={() => handleLogWorkout(workout)}
                                    className="px-3 py-1 bg-green-600 text-white text-sm rounded-sm hover:bg-green-700 transition-colors dark:bg-green-700 dark:hover:bg-green-600"
                                  >
                                    Log Workout
                                  </button>
                                )}
                                {session.user.role === 'runner' &&
                                  workout.status === 'completed' && (
                                    <button
                                      onClick={() => handleLogWorkout(workout)}
                                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-sm hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-600"
                                    >
                                      Edit Log
                                    </button>
                                  )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400 text-sm">
                        No workouts planned for this phase.
                      </div>
                    )}
                  </div>
                ))}

              {ungroupedWorkouts.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Other Workouts
                  </h3>
                  <div className="space-y-4">
                    {ungroupedWorkouts.map(workout => (
                      <div
                        key={workout.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {workout.planned_type}
                              </h3>
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${getWorkoutStatusColor(workout.status)}`}
                              >
                                {workout.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                              {formatDate(workout.date)}
                            </p>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Planned:</span>
                                <span className="ml-2 text-gray-700 dark:text-gray-200">
                                  {workout.planned_distance && `${workout.planned_distance} miles`}
                                  {workout.planned_duration && ` • ${workout.planned_duration} min`}
                                </span>
                              </div>

                              {workout.status === 'completed' && (
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Actual:</span>
                                  <span className="ml-2 text-gray-700 dark:text-gray-200">
                                    {workout.actual_distance && `${workout.actual_distance} miles`}
                                    {workout.actual_duration && ` • ${workout.actual_duration} min`}
                                  </span>
                                </div>
                              )}
                            </div>

                            {workout.workout_notes && (
                              <div className="mt-2">
                                <span className="text-gray-500 dark:text-gray-400 text-sm">
                                  Notes:
                                </span>
                                <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">
                                  {workout.workout_notes}
                                </p>
                              </div>
                            )}

                            {workout.coach_feedback && (
                              <div className="mt-2">
                                <span className="text-gray-500 dark:text-gray-400 text-sm">
                                  Coach Feedback:
                                </span>
                                <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">
                                  {workout.coach_feedback}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 mt-4">
                            {session.user.role === 'runner' && workout.status === 'planned' && (
                              <button
                                onClick={() => handleLogWorkout(workout)}
                                className="px-3 py-1 bg-green-600 text-white text-sm rounded-sm hover:bg-green-700 transition-colors dark:bg-green-700 dark:hover:bg-green-600"
                              >
                                Log Workout
                              </button>
                            )}
                            {session.user.role === 'runner' && workout.status === 'completed' && (
                              <button
                                onClick={() => handleLogWorkout(workout)}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-sm hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-600"
                              >
                                Edit Log
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
