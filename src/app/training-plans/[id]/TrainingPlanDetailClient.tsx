'use client'

import { Button, Card, CardBody, CardHeader, Chip } from '@heroui/react'
import { useAtomValue, useSetAtom } from 'jotai'
import {
  ArrowLeftIcon,
  CalendarIcon,
  FlagIcon,
  MapPinIcon,
  Target,
  Trash2Icon,
  UserIcon,
} from 'lucide-react'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Layout from '@/components/layout/Layout'
import ConfirmModal from '@/components/ui/ConfirmModal'
import AddWorkoutModal from '@/components/workouts/AddWorkoutModal'
import WorkoutLogModal from '@/components/workouts/WorkoutLogModal'
import { refreshWorkoutsAtom, workoutsAtom } from '@/lib/atoms/index'
import { asyncTrainingPlansAtom } from '@/lib/atoms/training-plans'
import { createLogger } from '@/lib/logger'
import type { PlanPhase, Race, TrainingPlan, User, Workout } from '@/lib/supabase'
import { commonToasts } from '@/lib/toast'

const logger = createLogger('TrainingPlanDetail')

type TrainingPlanWithUsers = TrainingPlan & {
  runners?: User
  coaches?: User
  race?: Race
  plan_phases?: PlanPhase[]
  previous_plan?: TrainingPlan
  next_plan?: TrainingPlan
}

interface TrainingPlanDetailClientProps {
  user: {
    id: string
    email: string
    name: string | null
    userType: 'runner' | 'coach'
  }
  planId: string
}

// Local component to render individual workout cards (reduces duplication)
interface WorkoutCardItemProps {
  workout: Workout
  userType: 'runner' | 'coach'
  onLogWorkout: (workout: Workout) => void
  formatDate: (dateString: string) => string
  getWorkoutStatusColor: (status: string) => string
}

function WorkoutCardItem({
  workout,
  userType,
  onLogWorkout,
  formatDate,
  getWorkoutStatusColor,
}: WorkoutCardItemProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-gray-900 dark:text-white">{workout.planned_type}</h3>
            <span
              className={`px-2 py-1 text-xs rounded-full ${getWorkoutStatusColor(workout.status)}`}
            >
              {workout.status}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{formatDate(workout.date)}</p>

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
              <span className="text-gray-500 dark:text-gray-400 text-sm">Notes:</span>
              <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">{workout.workout_notes}</p>
            </div>
          )}

          {workout.coach_feedback && (
            <div className="mt-2">
              <span className="text-gray-500 dark:text-gray-400 text-sm">Coach Feedback:</span>
              <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">
                {workout.coach_feedback}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          {userType === 'runner' && workout.status === 'planned' && (
            <button
              type="button"
              onClick={() => onLogWorkout(workout)}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded-sm hover:bg-green-700 transition-colors dark:bg-green-700 dark:hover:bg-green-600"
            >
              Log Workout
            </button>
          )}
          {userType === 'runner' && workout.status === 'completed' && (
            <button
              type="button"
              onClick={() => onLogWorkout(workout)}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-sm hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              Edit Log
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TrainingPlanDetailClient({ user, planId }: TrainingPlanDetailClientProps) {
  const router = useRouter()

  // Use Jotai atoms for centralized state management
  const allTrainingPlans = useAtomValue(asyncTrainingPlansAtom)
  const allWorkouts = useAtomValue(workoutsAtom)
  const refreshWorkouts = useSetAtom(refreshWorkoutsAtom)

  // Derive the specific training plan from the centralized atom
  const trainingPlan = useMemo(() => {
    return allTrainingPlans.find((plan: TrainingPlan) => plan.id === planId) || null
  }, [allTrainingPlans, planId])

  // Filter workouts for this specific training plan
  const workouts = useMemo(() => {
    return allWorkouts.filter((workout: Workout) => workout.training_plan_id === planId)
  }, [allWorkouts, planId])

  // Local UI state (keep these as useState since they're UI-specific)
  const [showAddWorkout, setShowAddWorkout] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [extendedPlanData, setExtendedPlanData] = useState<{
    plan_phases?: PlanPhase[]
    race?: Race
    previous_plan?: TrainingPlan
    next_plan?: TrainingPlan
  }>({})

  // Track active planId to prevent stale responses from overwriting state
  const activePlanRef = useRef(planId)

  // Create extended training plan object by combining base plan with extended data
  const extendedTrainingPlan = useMemo(() => {
    if (!trainingPlan) return null
    return {
      ...trainingPlan,
      ...extendedPlanData,
    } as TrainingPlanWithUsers
  }, [trainingPlan, extendedPlanData])

  const fetchExtendedPlanData = useCallback(async () => {
    if (!user?.id || !planId || !trainingPlan) return

    // Capture the planId at the start of this fetch to check against later
    const fetchPlanId = planId

    try {
      // Fetch plan phases
      const phasesResponse = await fetch(`/api/training-plans/${planId}/phases`, {
        credentials: 'same-origin',
      })

      // Guard: Don't update state if user navigated to a different plan
      if (activePlanRef.current !== fetchPlanId) return

      if (phasesResponse.ok) {
        const phasesData = await phasesResponse.json()
        if (activePlanRef.current !== fetchPlanId) return
        setExtendedPlanData(prev => ({
          ...prev,
          plan_phases: phasesData.plan_phases || [],
        }))
      } else {
        logger.error('Failed to fetch plan phases', { status: phasesResponse.statusText })
        if (activePlanRef.current !== fetchPlanId) return
        // Set empty array to avoid stale data and show user-facing error
        setExtendedPlanData(prev => ({
          ...prev,
          plan_phases: [],
        }))
        commonToasts.trainingPlanError(
          'Failed to load training phases. Please try refreshing the page.'
        )
      }

      // Fetch previous and next plans if they exist
      if (trainingPlan.previous_plan_id) {
        const prevPlanResponse = await fetch(
          `/api/training-plans/${trainingPlan.previous_plan_id}`,
          { credentials: 'same-origin' }
        )
        if (activePlanRef.current !== fetchPlanId) return
        if (prevPlanResponse.ok) {
          const prevPlanData = await prevPlanResponse.json()
          if (activePlanRef.current !== fetchPlanId) return
          setExtendedPlanData(prev => ({
            ...prev,
            previous_plan: prevPlanData.trainingPlan,
          }))
        } else {
          logger.error('Failed to fetch previous plan', { status: prevPlanResponse.statusText })
          // Silent failure for linked plans - not critical for main view
        }
      }

      if (trainingPlan.next_plan_id) {
        const nextPlanResponse = await fetch(`/api/training-plans/${trainingPlan.next_plan_id}`, {
          credentials: 'same-origin',
        })
        if (activePlanRef.current !== fetchPlanId) return
        if (nextPlanResponse.ok) {
          const nextPlanData = await nextPlanResponse.json()
          if (activePlanRef.current !== fetchPlanId) return
          setExtendedPlanData(prev => ({
            ...prev,
            next_plan: nextPlanData.trainingPlan,
          }))
        } else {
          logger.error('Failed to fetch next plan', { status: nextPlanResponse.statusText })
          // Silent failure for linked plans - not critical for main view
        }
      }
    } catch (error) {
      // Guard: Don't show toast if user navigated away
      if (activePlanRef.current !== fetchPlanId) return
      logger.error('Error fetching extended plan data', { error })
      commonToasts.trainingPlanError('Failed to load plan details. Please try refreshing the page.')
    }
  }, [user?.id, planId, trainingPlan])

  // Reset extended plan data when navigating to a different plan
  // Prevents stale data (phases, race, adjacent plans) from previous plan
  useEffect(() => {
    activePlanRef.current = planId
    setExtendedPlanData({})
  }, [planId])

  // Track if initial operations have been performed
  const hasRefreshedWorkouts = useRef(false)
  const hasRedirected = useRef(false)

  // Effect 1: Refresh workouts once on mount
  useEffect(() => {
    if (!hasRefreshedWorkouts.current) {
      hasRefreshedWorkouts.current = true
      refreshWorkouts()
    }
  }, [refreshWorkouts])

  // Effect 2: Fetch extended plan data when training plan exists but data hasn't been fetched
  useEffect(() => {
    if (trainingPlan && Object.keys(extendedPlanData).length === 0) {
      fetchExtendedPlanData()
    }
  }, [trainingPlan, extendedPlanData, fetchExtendedPlanData])

  // Effect 3: Redirect if plan ID is provided but plan not found (after Suspense resolves)
  useEffect(() => {
    if (planId && !trainingPlan && !hasRedirected.current) {
      hasRedirected.current = true
      router.push('/training-plans')
    }
  }, [planId, trainingPlan, router])

  const handleAddWorkoutSuccess = () => {
    // NO refreshWorkouts() call - AddWorkoutModal uses optimistic updates!
    // Workouts will appear immediately via atom reactivity
  }

  const handleLogWorkoutSuccess = () => {
    // NO refreshWorkouts() call - WorkoutLogModal uses optimistic updates!
    // Clear selected workout for UI cleanup
    setSelectedWorkout(null)
  }

  const handleLogWorkout = (workout: Workout) => {
    setSelectedWorkout(workout)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/training-plans/${planId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (response.ok) {
        commonToasts.trainingPlanDeleted()
        router.push('/training-plans')
      } else {
        const errorData = await response.json()
        commonToasts.trainingPlanError(errorData.error || 'Failed to delete training plan')
      }
    } catch (error) {
      logger.error('Error deleting training plan', { error })
      commonToasts.trainingPlanError('Failed to delete training plan')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
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
      !extendedTrainingPlan?.start_date ||
      !extendedTrainingPlan.plan_phases ||
      extendedTrainingPlan.plan_phases.length === 0
    ) {
      return null
    }

    const planStartDate = new Date(extendedTrainingPlan.start_date)
    const today = new Date()
    let cumulativeWeeks = 0

    // Use same date calculation as workout grouping for consistency
    // Clone array before sorting to avoid mutating original
    for (const phase of [...extendedTrainingPlan.plan_phases].sort((a, b) => a.order - b.order)) {
      const phaseStartDate = new Date(planStartDate)
      phaseStartDate.setDate(planStartDate.getDate() + cumulativeWeeks * 7)

      const phaseEndDate = new Date(phaseStartDate)
      phaseEndDate.setDate(phaseStartDate.getDate() + phase.duration_weeks * 7 - 1) // -1 for inclusive boundary

      if (today >= phaseStartDate && today <= phaseEndDate) {
        return phase
      }
      cumulativeWeeks += phase.duration_weeks
    }
    return null
  }, [extendedTrainingPlan])

  const currentPhase = calculateCurrentPhase()

  // Memoize workout grouping to avoid recalculating on every render
  const { grouped: workoutsByPhase, ungrouped: ungroupedWorkouts } = useMemo((): {
    grouped: Record<string, Workout[]>
    ungrouped: Workout[]
  } => {
    if (
      !extendedTrainingPlan?.plan_phases ||
      extendedTrainingPlan.plan_phases.length === 0 ||
      !extendedTrainingPlan.start_date
    ) {
      return { grouped: {}, ungrouped: workouts }
    }

    const grouped: Record<string, Workout[]> = {}
    const phaseDates: Record<string, { start: Date; end: Date }> = {}
    const planStartDate = new Date(extendedTrainingPlan.start_date)
    let currentWeekOffset = 0

    // Clone array before sorting to avoid mutating original
    const sortedPhases = [...extendedTrainingPlan.plan_phases].sort((a, b) => a.order - b.order)
    sortedPhases.forEach(phase => {
        const phaseStartDate = new Date(planStartDate)
        phaseStartDate.setDate(planStartDate.getDate() + currentWeekOffset * 7)
        const phaseEndDate = new Date(phaseStartDate)
        phaseEndDate.setDate(phaseStartDate.getDate() + phase.duration_weeks * 7 - 1) // -1 to keep it within the week

        phaseDates[phase.id] = { start: phaseStartDate, end: phaseEndDate }
        grouped[phase.id] = []
        currentWeekOffset += phase.duration_weeks
      })

    const ungrouped: Workout[] = []

    workouts.forEach((workout: Workout) => {
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
  }, [extendedTrainingPlan, workouts])

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

  if (!extendedTrainingPlan) {
    return null
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Training Phases */}
          <Card className="mb-8 bg-content1 border-l-4 border-l-primary">
            <CardHeader>
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <FlagIcon className="w-5 h-5 text-primary" />
                Training Phases
              </h2>
            </CardHeader>
            <CardBody>
              {extendedTrainingPlan.plan_phases && extendedTrainingPlan.plan_phases.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Clone array before sorting to avoid mutating original */}
                  {[...extendedTrainingPlan.plan_phases]
                    .sort((a, b) => a.order - b.order)
                    .map(phase => (
                      <Card
                        key={phase.id}
                        className={`border ${currentPhase?.id === phase.id ? 'border-primary bg-primary/5' : 'border-default-200'}`}
                      >
                        <CardBody className="p-4">
                          <h3 className="font-semibold text-foreground mb-1">{phase.phase_name}</h3>
                          <p className="text-sm text-foreground/70 mb-2">
                            Duration: {phase.duration_weeks} weeks
                          </p>
                          {currentPhase?.id === phase.id && (
                            <Chip size="sm" color="primary" variant="flat" className="mt-1">
                              Current Phase
                            </Chip>
                          )}
                        </CardBody>
                      </Card>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-default-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FlagIcon className="w-8 h-8 text-default-400" />
                  </div>
                  <p className="text-foreground/70">No training phases defined for this plan.</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Plan Sequencing Navigation */}
          {(extendedTrainingPlan.previous_plan || extendedTrainingPlan.next_plan) && (
            <Card className="mb-8 bg-content1 border-t-4 border-t-secondary">
              <CardHeader>
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Target className="w-5 h-5 text-secondary" />
                  Plan Sequence
                </h2>
              </CardHeader>
              <CardBody>
                <div className="flex justify-between items-center">
                  {extendedTrainingPlan.previous_plan ? (
                    <Button
                      as={Link}
                      href={`/training-plans/${extendedTrainingPlan.previous_plan.id}`}
                      variant="flat"
                      color="secondary"
                      startContent={<ArrowLeftIcon className="w-4 h-4" />}
                    >
                      {extendedTrainingPlan.previous_plan.title}
                    </Button>
                  ) : (
                    <div />
                  )}
                  {extendedTrainingPlan.next_plan ? (
                    <Button
                      as={Link}
                      href={`/training-plans/${extendedTrainingPlan.next_plan.id}`}
                      variant="flat"
                      color="secondary"
                      endContent={<ArrowLeftIcon className="w-4 h-4 rotate-180" />}
                    >
                      {extendedTrainingPlan.next_plan.title}
                    </Button>
                  ) : (
                    <div />
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Main Plan Information */}
          <Card className="mb-8 bg-content1 border-l-4 border-l-warning">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between w-full">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-foreground mb-2">
                    🏔️ {extendedTrainingPlan.title}
                  </h1>
                  {extendedTrainingPlan.description && (
                    <p className="text-foreground/70 text-base">
                      {extendedTrainingPlan.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="flat"
                    color="default"
                    onPress={() => router.back()}
                    startContent={<ArrowLeftIcon className="w-4 h-4" />}
                    size="sm"
                  >
                    Back
                  </Button>
                  <Button
                    variant="flat"
                    color="danger"
                    onPress={() => setShowDeleteConfirm(true)}
                    isLoading={isDeleting}
                    startContent={<Trash2Icon className="w-4 h-4" />}
                    size="sm"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Creation Date */}
                <Card className="border border-primary/20 bg-primary/5">
                  <CardBody className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarIcon className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-primary">Created</h3>
                    </div>
                    <p className="text-foreground">{formatDate(extendedTrainingPlan.created_at)}</p>
                  </CardBody>
                </Card>

                {/* Target Race */}
                {extendedTrainingPlan.race ? (
                  <Card className="border border-success/20 bg-success/5">
                    <CardBody className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FlagIcon className="w-4 h-4 text-success" />
                        <h3 className="font-semibold text-success">Target Race</h3>
                      </div>
                      <p className="text-foreground font-medium">
                        {extendedTrainingPlan.race.name}
                      </p>
                      <p className="text-foreground/70 text-sm">
                        {formatDate(extendedTrainingPlan.race.date)}
                      </p>
                      {extendedTrainingPlan.race.location && (
                        <div className="flex items-center gap-1 mt-1">
                          <MapPinIcon className="w-3 h-3 text-foreground/50" />
                          <p className="text-xs text-foreground/70">
                            {extendedTrainingPlan.race.location}
                          </p>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                ) : (
                  <Card className="border border-default-200 bg-default-50">
                    <CardBody className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FlagIcon className="w-4 h-4 text-default-400" />
                        <h3 className="font-semibold text-default-400">No Race Linked</h3>
                      </div>
                      <p className="text-foreground/50 text-sm">
                        No target race specified for this plan
                      </p>
                    </CardBody>
                  </Card>
                )}

                {/* Runner/Coach Information */}
                <Card className="border border-secondary/20 bg-secondary/5">
                  <CardBody className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <UserIcon className="w-4 h-4 text-secondary" />
                      <h3 className="font-semibold text-secondary">
                        {user.userType === 'coach' ? 'Runner' : 'Coach'}
                      </h3>
                    </div>
                    <p className="text-foreground font-medium">
                      {user.userType === 'coach'
                        ? extendedTrainingPlan.runners?.full_name || 'Runner not found'
                        : extendedTrainingPlan.coaches?.full_name || 'Coach not found'}
                    </p>
                    {(user.userType === 'coach'
                      ? extendedTrainingPlan.runners?.email
                      : extendedTrainingPlan.coaches?.email) && (
                      <p className="text-foreground/70 text-sm">
                        {user.userType === 'coach'
                          ? extendedTrainingPlan.runners?.email
                          : extendedTrainingPlan.coaches?.email}
                      </p>
                    )}
                  </CardBody>
                </Card>

                {/* Goal Type */}
                {extendedTrainingPlan.goal_type && (
                  <Card className="border border-warning/20 bg-warning/5">
                    <CardBody className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-warning" />
                        <h3 className="font-semibold text-warning">Goal Type</h3>
                      </div>
                      <Chip size="sm" color="warning" variant="flat">
                        {extendedTrainingPlan.goal_type.replace(/_/g, ' ')}
                      </Chip>
                    </CardBody>
                  </Card>
                )}

                {/* Plan Type */}
                {extendedTrainingPlan.plan_type && (
                  <Card className="border border-default/20 bg-default/5">
                    <CardBody className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CalendarIcon className="w-4 h-4 text-default-600" />
                        <h3 className="font-semibold text-default-600">Plan Type</h3>
                      </div>
                      <Chip size="sm" color="default" variant="flat">
                        {extendedTrainingPlan.plan_type.replace(/_/g, ' ')}
                      </Chip>
                    </CardBody>
                  </Card>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Workouts Section */}
        <Card className="bg-content1 border-t-4 border-t-success">
          <CardHeader>
            <div className="flex justify-between items-center w-full">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-success" />
                Workouts
              </h2>
              {user.userType === 'coach' && (
                <Button
                  color="success"
                  onPress={() => setShowAddWorkout(true)}
                  startContent={<CalendarIcon className="w-4 h-4" />}
                >
                  Add Workout
                </Button>
              )}
            </div>
          </CardHeader>
          <CardBody>
            {workouts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarIcon className="w-8 h-8 text-success/50" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No workouts yet</h3>
                <p className="text-foreground/70 mb-4">
                  {user.userType === 'coach'
                    ? 'Add workouts to get started with this training plan.'
                    : 'Your coach will add workouts to this training plan.'}
                </p>
                {user.userType === 'coach' && (
                  <Button
                    color="success"
                    onPress={() => setShowAddWorkout(true)}
                    startContent={<CalendarIcon className="w-4 h-4" />}
                  >
                    Add First Workout
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {/* Clone array before sorting to avoid mutating original */}
                {[...(extendedTrainingPlan?.plan_phases ?? [])]
                  .sort((a, b) => a.order - b.order)
                  .map(phase => (
                    <div key={phase.id}>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {phase.phase_name}
                      </h3>
                      {workoutsByPhase[phase.id] && workoutsByPhase[phase.id]?.length > 0 ? (
                        <div className="space-y-4">
                          {workoutsByPhase[phase.id]?.map((workout: Workout) => (
                            <WorkoutCardItem
                              key={workout.id}
                              workout={workout}
                              userType={user.userType}
                              onLogWorkout={handleLogWorkout}
                              formatDate={formatDate}
                              getWorkoutStatusColor={getWorkoutStatusColor}
                            />
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
                      {ungroupedWorkouts.map((workout: Workout) => (
                        <WorkoutCardItem
                          key={workout.id}
                          workout={workout}
                          userType={user.userType}
                          onLogWorkout={handleLogWorkout}
                          formatDate={formatDate}
                          getWorkoutStatusColor={getWorkoutStatusColor}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {extendedTrainingPlan && (
          <AddWorkoutModal
            isOpen={showAddWorkout}
            onClose={() => setShowAddWorkout(false)}
            onSuccess={handleAddWorkoutSuccess}
            trainingPlanId={extendedTrainingPlan.id}
          />
        )}

        {/* Modal visibility derived from selectedWorkout - single source of truth */}
        {selectedWorkout && (
          <WorkoutLogModal
            isOpen={true}
            onClose={() => setSelectedWorkout(null)}
            onSuccess={handleLogWorkoutSuccess}
            workout={selectedWorkout}
          />
        )}

        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="Delete Training Plan"
          message="Are you sure you want to delete this training plan? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          confirmColor="danger"
          isLoading={isDeleting}
        />
      </div>
    </Layout>
  )
}
