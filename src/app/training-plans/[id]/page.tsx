'use client'

import { Button, Card, CardBody, CardHeader, Chip } from '@heroui/react'
import { isAxiosError } from 'axios'
import {
  addDays,
  addWeeks,
  endOfDay,
  format as formatDateFns,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  ArrowLeftIcon,
  CalendarIcon,
  FlagIcon,
  MapPinIcon,
  Target,
  Trash2Icon,
  UserIcon,
} from 'lucide-react'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'

import Layout from '@/components/layout/Layout'
import AddWorkoutModal from '@/components/workouts/AddWorkoutModal'
import WorkoutLogModal from '@/components/workouts/WorkoutLogModal'
import { useSession } from '@/hooks/useBetterSession'
import { api } from '@/lib/api-client'
import { refreshWorkoutsAtom, refreshableTrainingPlansAtom, workoutsAtom } from '@/lib/atoms/index'
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

export default function TrainingPlanDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const planId = params.id as string

  // Use Jotai atoms for centralized state management
  const [allTrainingPlans, refreshTrainingPlans] = useAtom(refreshableTrainingPlansAtom)
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
  const [showLogWorkout, setShowLogWorkout] = useState(false)
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [extendedPlanData, setExtendedPlanData] = useState<{
    plan_phases?: PlanPhase[]
    race?: Race
    previous_plan?: TrainingPlan
    next_plan?: TrainingPlan
  }>({})

  // Derive loading state
  const loading = allTrainingPlans.length === 0 || (planId && !trainingPlan)

  // Create extended training plan object by combining base plan with extended data
  const extendedTrainingPlan = useMemo(() => {
    if (!trainingPlan) return null
    return {
      ...trainingPlan,
      ...extendedPlanData,
    } as TrainingPlanWithUsers
  }, [trainingPlan, extendedPlanData])

  const fetchExtendedPlanData = useCallback(async () => {
    if (!session?.user?.id || !planId || !trainingPlan) return

    try {
      // Fetch plan phases
      try {
        const { data: phasesData } = await api.get<{ plan_phases?: PlanPhase[] }>(
          `/api/training-plans/${planId}/phases`
        )
        setExtendedPlanData(prev => ({
          ...prev,
          plan_phases: phasesData.plan_phases || [],
        }))
      } catch (error) {
        logger.error('Failed to fetch plan phases', { error })
      }

      // Fetch previous and next plans if they exist
      if (trainingPlan.previous_plan_id) {
        try {
          const { data: prevPlanData } = await api.get<{ trainingPlan: TrainingPlan }>(
            `/api/training-plans/${trainingPlan.previous_plan_id}`
          )
          setExtendedPlanData(prev => ({
            ...prev,
            previous_plan: prevPlanData.trainingPlan,
          }))
        } catch (error) {
          logger.error('Failed to fetch previous plan', { error })
        }
      }

      if (trainingPlan.next_plan_id) {
        try {
          const { data: nextPlanData } = await api.get<{ trainingPlan: TrainingPlan }>(
            `/api/training-plans/${trainingPlan.next_plan_id}`
          )
          setExtendedPlanData(prev => ({
            ...prev,
            next_plan: nextPlanData.trainingPlan,
          }))
        } catch (error) {
          logger.error('Failed to fetch next plan', { error })
        }
      }
    } catch (error) {
      logger.error('Error fetching extended plan data', { error })
    }
  }, [session?.user?.id, planId, trainingPlan])

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Trigger workout refresh when component mounts
    refreshWorkouts()

    // If plan is found but extended data hasn't been fetched, fetch it
    if (trainingPlan && Object.keys(extendedPlanData).length === 0) {
      fetchExtendedPlanData()
    }

    // If plan ID is provided but plan not found in atom, it might not exist
    if (planId && allTrainingPlans.length > 0 && !trainingPlan) {
      router.push('/training-plans')
    }
  }, [
    status,
    session,
    router,
    trainingPlan,
    extendedPlanData,
    fetchExtendedPlanData,
    planId,
    allTrainingPlans.length,
    refreshWorkouts,
  ])

  const handleAddWorkoutSuccess = () => {
    // Refresh both atoms to get updated data
    refreshTrainingPlans()
    refreshWorkouts()
  }

  const handleLogWorkoutSuccess = () => {
    // Refresh atoms and clear selected workout
    refreshTrainingPlans()
    refreshWorkouts()
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
      await api.delete(`/api/training-plans/${planId}`)
      commonToasts.trainingPlanDeleted()
      // Refresh both training plans and workouts cache after deletion
      refreshTrainingPlans()
      await refreshWorkouts()
      router.push('/training-plans')
    } catch (error) {
      logger.error('Error deleting training plan', { error })
      if (isAxiosError(error) && error.response?.data?.error) {
        commonToasts.trainingPlanError(error.response.data.error)
      } else {
        commonToasts.trainingPlanError('Failed to delete training plan')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    // Validate input
    if (!dateString || typeof dateString !== 'string') {
      return '—'
    }

    try {
      const parsedDate = parseISO(dateString)
      if (!isValid(parsedDate)) {
        return '—'
      }
      return formatDateFns(parsedDate, 'MMM d, yyyy')
    } catch {
      return '—'
    }
  }

  const calculateCurrentPhase = useCallback(() => {
    if (
      !extendedTrainingPlan?.start_date ||
      !extendedTrainingPlan.plan_phases ||
      extendedTrainingPlan.plan_phases.length === 0
    ) {
      return null
    }

    const planStartDate = startOfDay(parseISO(extendedTrainingPlan.start_date))
    const today = startOfDay(new Date())
    let totalWeeks = 0

    for (const phase of [...extendedTrainingPlan.plan_phases].sort((a, b) => a.order - b.order)) {
      const phaseStartDate = addWeeks(planStartDate, totalWeeks)
      const phaseEndDate = endOfDay(addDays(phaseStartDate, phase.duration_weeks * 7 - 1))

      if (today >= phaseStartDate && today <= phaseEndDate) {
        return phase
      }
      totalWeeks += phase.duration_weeks
    }
    return null
  }, [extendedTrainingPlan])

  const currentPhase = calculateCurrentPhase()

  const groupWorkoutsByPhase = useCallback((): {
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
    const planStartDate = startOfDay(parseISO(extendedTrainingPlan.start_date))
    let currentWeekOffset = 0

    ;[...extendedTrainingPlan.plan_phases]
      .sort((a, b) => a.order - b.order)
      .forEach(phase => {
        const phaseStartDate = addWeeks(planStartDate, currentWeekOffset)
        const phaseEndDate = endOfDay(addDays(phaseStartDate, phase.duration_weeks * 7 - 1))

        phaseDates[phase.id] = { start: phaseStartDate, end: phaseEndDate }
        grouped[phase.id] = []
        currentWeekOffset += phase.duration_weeks
      })

    const ungrouped: Workout[] = []

    workouts.forEach((workout: Workout) => {
      const workoutDate = startOfDay(parseISO(workout.date))
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
      grouped[phaseId].sort(
        (a, b) => startOfDay(parseISO(a.date)).getTime() - startOfDay(parseISO(b.date)).getTime()
      )
    }

    return { grouped, ungrouped }
  }, [extendedTrainingPlan, workouts])

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardBody className="flex justify-center items-center py-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <CalendarIcon className="w-8 h-8 text-primary" />
                </div>
                <p className="text-foreground/70">Loading training plan...</p>
              </div>
            </CardBody>
          </Card>
        </div>
      </Layout>
    )
  }

  if (!session || !extendedTrainingPlan) {
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
            <CardBody data-testid="phase-timeline">
              {extendedTrainingPlan.plan_phases && extendedTrainingPlan.plan_phases.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                            <Chip
                              size="sm"
                              color="primary"
                              variant="flat"
                              className="mt-1"
                              data-testid="current-phase"
                            >
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
                    onPress={handleDelete}
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
                        {session.user.userType === 'coach' ? 'Runner' : 'Coach'}
                      </h3>
                    </div>
                    <p className="text-foreground font-medium">
                      {session.user.userType === 'coach'
                        ? extendedTrainingPlan.runners?.full_name || 'Runner not found'
                        : extendedTrainingPlan.coaches?.full_name || 'Coach not found'}
                    </p>
                    {(session.user.userType === 'coach'
                      ? extendedTrainingPlan.runners?.email
                      : extendedTrainingPlan.coaches?.email) && (
                      <p className="text-foreground/70 text-sm">
                        {session.user.userType === 'coach'
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
                        {extendedTrainingPlan.goal_type.replace('_', ' ')}
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
                        {extendedTrainingPlan.plan_type.replace('_', ' ')}
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
              {session.user.userType === 'coach' && (
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
                  {session.user.userType === 'coach'
                    ? 'Add workouts to get started with this training plan.'
                    : 'Your coach will add workouts to this training plan.'}
                </p>
                {session.user.userType === 'coach' && (
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
                {[...(extendedTrainingPlan?.plan_phases || [])]
                  .sort((a, b) => a.order - b.order)
                  .map(phase => (
                    <div key={phase.id}>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {phase.phase_name}
                      </h3>
                      {workoutsByPhase[phase.id] && workoutsByPhase[phase.id]?.length > 0 ? (
                        <div className="space-y-4" data-testid="phase-workouts">
                          {workoutsByPhase[phase.id]?.map((workout: Workout) => (
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
                                      <span
                                        className="text-gray-500 dark:text-gray-400 text-sm"
                                        data-testid="feedback-badge"
                                      >
                                        Coach Feedback:
                                      </span>
                                      <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">
                                        {workout.coach_feedback}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                <div className="flex gap-2 mt-4">
                                  {session.user.userType === 'runner' &&
                                    workout.status === 'planned' && (
                                      <button
                                        onClick={() => handleLogWorkout(workout)}
                                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-sm hover:bg-green-700 transition-colors dark:bg-green-700 dark:hover:bg-green-600"
                                      >
                                        Log Workout
                                      </button>
                                    )}
                                  {session.user.userType === 'runner' &&
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
                      {ungroupedWorkouts.map((workout: Workout) => (
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
                              {session.user.userType === 'runner' &&
                                workout.status === 'planned' && (
                                  <button
                                    onClick={() => handleLogWorkout(workout)}
                                    className="px-3 py-1 bg-green-600 text-white text-sm rounded-sm hover:bg-green-700 transition-colors dark:bg-green-700 dark:hover:bg-green-600"
                                  >
                                    Log Workout
                                  </button>
                                )}
                              {session.user.userType === 'runner' &&
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
