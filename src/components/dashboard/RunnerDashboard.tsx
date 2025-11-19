'use client'

import { Button, Card, CardBody, CardHeader, Chip } from '@heroui/react'
import { addDays, endOfDay, isValid, isWithinInterval, startOfDay } from 'date-fns'
import { useAtom } from 'jotai'
import {
  ActivityIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  MessageSquareIcon,
  MountainSnowIcon,
  RouteIcon,
  TrendingUpIcon,
} from 'lucide-react'

import { memo, useMemo } from 'react'

import Link from 'next/link'

import GarminDashboardWidget from '@/components/garmin/GarminDashboardWidget'
import StravaDashboardWidget from '@/components/strava/StravaDashboardWidget'
import { RunnerDashboardSkeleton } from '@/components/ui/LoadingSkeletons'
import WorkoutLogModal from '@/components/workouts/WorkoutLogModal'
import { useSession } from '@/hooks/useBetterSession'
import { useDashboardData } from '@/hooks/useDashboardData'
import { uiStateAtom } from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import type { Workout } from '@/lib/supabase'
import type { RelationshipData } from '@/types/relationships'
import { formatLabel, getUserLocale } from '@/utils/formatting'

const logger = createLogger('RunnerDashboard')

// Helper functions moved outside component for better performance

const calculateCompletionRate = (workouts: Workout[]) => {
  if (!workouts.length) return 0
  const completedWorkouts = workouts.filter(w => w.status === 'completed').length
  return Math.round((completedWorkouts / workouts.length) * 100)
}

const calculateWeeklyCompletionRate = (workouts: Workout[]) => {
  const today = new Date()
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  const weeklyWorkouts = workouts.filter(w => {
    const workoutDate = new Date(w.date)
    return isValid(workoutDate) && workoutDate >= weekAgo && workoutDate <= today
  })

  if (!weeklyWorkouts.length) return 0
  const completedWeekly = weeklyWorkouts.filter(w => w.status === 'completed').length
  return Math.round((completedWeekly / weeklyWorkouts.length) * 100)
}

const calculateMonthlyStats = (workouts: Workout[]) => {
  const today = new Date()
  const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
  const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, today.getDate())

  const thisMonth = workouts.filter(w => {
    const workoutDate = new Date(w.date)
    return isValid(workoutDate) && workoutDate >= monthAgo && workoutDate <= today
  })

  const lastMonth = workouts.filter(w => {
    const workoutDate = new Date(w.date)
    return isValid(workoutDate) && workoutDate >= twoMonthsAgo && workoutDate < monthAgo
  })

  const thisMonthCompleted = thisMonth.filter(w => w.status === 'completed').length
  const lastMonthCompleted = lastMonth.filter(w => w.status === 'completed').length

  const thisMonthRate =
    thisMonth.length > 0 ? Math.round((thisMonthCompleted / thisMonth.length) * 100) : 0
  const lastMonthRate =
    lastMonth.length > 0 ? Math.round((lastMonthCompleted / lastMonth.length) * 100) : 0

  const trend = thisMonthRate - lastMonthRate

  return {
    thisMonthRate,
    lastMonthRate,
    trend,
    thisMonthCompleted,
    thisMonthTotal: thisMonth.length,
  }
}

const calculateWeeklyDistance = (workouts: Workout[]) => {
  const today = new Date()
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  return workouts
    .filter(w => {
      const workoutDate = new Date(w.date)
      return (
        isValid(workoutDate) &&
        workoutDate >= weekAgo &&
        workoutDate <= today &&
        w.status === 'completed'
      )
    })
    .reduce((total, workout) => {
      const rawDistance = workout.actual_distance ?? workout.planned_distance ?? 0
      const distance = typeof rawDistance === 'string' ? parseFloat(rawDistance) : rawDistance
      return total + (Number.isFinite(distance) ? distance : 0)
    }, 0)
}

const calculateRecentActivity = (workouts: Workout[]) => {
  const today = new Date()
  const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)

  return workouts.filter(w => {
    const workoutDate = new Date(w.date)
    return isValid(workoutDate) && workoutDate >= twoWeeksAgo && w.status === 'completed'
  }).length
}

const getWorkoutTypeIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'long_run':
      return <MountainSnowIcon className="w-4 h-4" />
    case 'interval':
      return <TrendingUpIcon className="w-4 h-4" />
    case 'tempo':
      return <ClockIcon className="w-4 h-4" />
    default:
      return <RouteIcon className="w-4 h-4" />
  }
}

function RunnerDashboard() {
  const { data: session } = useSession()
  const { trainingPlans, upcomingWorkouts, loading, relationships, recentWorkouts } =
    useDashboardData()

  // Jotai atoms for UI state
  const [uiState, setUiState] = useAtom(uiStateAtom)

  // Workout action handlers
  const handleMarkComplete = (workout: Workout) => {
    setUiState(prev => ({
      ...prev,
      selectedWorkout: workout,
      defaultToComplete: true,
      showLogWorkout: true,
    }))
  }

  const handleLogDetails = (workout: Workout) => {
    setUiState(prev => ({
      ...prev,
      selectedWorkout: workout,
      defaultToComplete: false,
      showLogWorkout: true,
    }))
  }

  const handleWorkoutModalClose = () => {
    setUiState(prev => ({
      ...prev,
      showLogWorkout: false,
      selectedWorkout: null,
      defaultToComplete: false,
    }))
  }

  const handleWorkoutSuccess = () => {
    handleWorkoutModalClose()
    // The dashboard data should refresh automatically via Jotai atoms
  }

  // Memoize expensive computations and add logging
  const dashboardMetrics = useMemo(() => {
    const today = startOfDay(new Date())
    const weekFromToday = endOfDay(addDays(today, 6)) // 7-day window (today + 6 more days)
    const thisWeekWorkouts = upcomingWorkouts.filter(w => {
      const workoutDate = new Date(w.date)
      return (
        isValid(workoutDate) &&
        isWithinInterval(startOfDay(workoutDate), { start: today, end: weekFromToday })
      )
    })

    // Calculate advanced metrics
    const allWorkouts = [...upcomingWorkouts, ...(recentWorkouts || [])]
    const completionRate = calculateCompletionRate(allWorkouts)
    const weeklyCompletionRate = calculateWeeklyCompletionRate(allWorkouts)
    const monthlyStats = calculateMonthlyStats(allWorkouts)
    const weeklyDistance = calculateWeeklyDistance(allWorkouts)
    const recentActivity = calculateRecentActivity(allWorkouts)

    logger.debug('Dashboard metrics calculated:', {
      trainingPlansCount: trainingPlans.length,
      upcomingWorkoutsCount: upcomingWorkouts.length,
      thisWeekWorkoutsCount: thisWeekWorkouts.length,
      completionRate,
      weeklyCompletionRate,
      monthlyStats,
      weeklyDistance,
      recentActivity,
      loading,
    })

    return {
      thisWeekWorkouts,
      completionRate,
      weeklyCompletionRate,
      monthlyStats,
      weeklyDistance: Math.round(weeklyDistance * 10) / 10, // Round to 1 decimal
      recentActivity,
    }
  }, [upcomingWorkouts, trainingPlans.length, recentWorkouts, loading])

  // Get today's workout
  // Note: Returns only the first workout for today if multiple exist.
  // UX currently assumes single workout per day. If doubles are needed,
  // update to filter all workouts and select primary based on priority rules.
  const todaysWorkout = useMemo(() => {
    const today = startOfDay(new Date())
    return upcomingWorkouts.find(w => {
      const workoutDate = new Date(w.date)
      return isValid(workoutDate) && startOfDay(workoutDate).getTime() === today.getTime()
    })
  }, [upcomingWorkouts])

  if (loading) {
    return <RunnerDashboardSkeleton />
  }

  // Extract coach relationships once to avoid duplicate filtering
  const coachRelationships: RelationshipData[] = relationships.filter(
    (rel: RelationshipData) => rel.other_party.role === 'coach'
  )

  // Get user locale for date formatting
  const userLocale = getUserLocale()

  return (
    <div className="space-y-8" data-testid="runner-dashboard-content">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Base Camp Dashboard</h1>
        <p className="text-foreground-600">
          Welcome back, {session?.user?.name || 'Athlete'}! Ready for today&apos;s training?
        </p>
      </div>

      {/* Today's Workout & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Workout - Hero Section */}
        {todaysWorkout ? (
          <Card className="border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10">
            <CardBody className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-primary/20">
                  <ActivityIcon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Today&apos;s Workout</h2>
                  <p className="text-sm text-foreground-600">
                    {new Date(todaysWorkout.date).toLocaleDateString(userLocale, {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground capitalize mb-1">
                    {formatLabel(todaysWorkout.planned_type)}
                  </h3>
                  {todaysWorkout.workout_notes && (
                    <p className="text-sm text-foreground-600">{todaysWorkout.workout_notes}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {todaysWorkout.planned_distance && (
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-xs text-foreground-600">Distance</p>
                        <p className="text-base font-semibold text-foreground">
                          {todaysWorkout.planned_distance} mi
                        </p>
                      </div>
                    </div>
                  )}
                  {todaysWorkout.planned_duration && (
                    <div className="flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-xs text-foreground-600">Duration</p>
                        <p className="text-base font-semibold text-foreground">
                          {todaysWorkout.planned_duration} min
                        </p>
                      </div>
                    </div>
                  )}
                  {todaysWorkout.category && (
                    <div className="flex items-center gap-2">
                      <TrendingUpIcon className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-xs text-foreground-600">Type</p>
                        <p className="text-base font-semibold text-foreground capitalize">
                          {formatLabel(todaysWorkout.category)}
                        </p>
                      </div>
                    </div>
                  )}
                  {todaysWorkout.elevation_gain && (
                    <div className="flex items-center gap-2">
                      <MountainSnowIcon className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-xs text-foreground-600">Elevation</p>
                        <p className="text-base font-semibold text-foreground">
                          {todaysWorkout.elevation_gain} ft
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {todaysWorkout.status === 'planned' && (
                <div className="flex gap-2 mt-4">
                  <Button
                    size="md"
                    color="success"
                    className="flex-1 font-semibold"
                    startContent={<CheckCircleIcon className="w-4 h-4" aria-hidden="true" />}
                    onClick={() => handleMarkComplete(todaysWorkout)}
                    aria-label={`Mark ${formatLabel(todaysWorkout.planned_type)} as complete`}
                  >
                    Mark Complete
                  </Button>
                  <Button
                    size="md"
                    variant="bordered"
                    className="flex-1 font-semibold"
                    onClick={() => handleLogDetails(todaysWorkout)}
                    aria-label="Log details for today's workout"
                  >
                    Log Details
                  </Button>
                </div>
              )}
              {todaysWorkout.status === 'completed' && (
                <div className="flex items-center justify-center gap-2 p-3 bg-success/10 rounded-lg border border-success/20 mt-4">
                  <CheckCircleIcon className="w-5 h-5 text-success" />
                  <span className="text-base font-semibold text-success">Workout Completed!</span>
                </div>
              )}
            </CardBody>
          </Card>
        ) : (
          <Card className="border-2 border-dashed border-divider">
            <CardBody className="p-6 text-center">
              <CalendarIcon className="w-10 h-10 text-foreground-400 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-foreground mb-2">
                No workout scheduled today
              </h2>
              <p className="text-sm text-foreground-600 mb-3">
                Enjoy your rest day or check upcoming workouts
              </p>
              <Button
                as={Link}
                href="/workouts"
                color="primary"
                variant="bordered"
                size="sm"
                aria-label="View all scheduled workouts"
              >
                View All Workouts
              </Button>
            </CardBody>
          </Card>
        )}

        {/* Quick Stats - Stacked Vertically */}
        <div className="space-y-4">
          <Card className="border-t-4 border-t-success">
            <CardBody className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircleIcon className="w-5 h-5 text-success" />
                <h3 className="font-semibold text-foreground">This Week</h3>
              </div>
              <p className="text-2xl font-bold text-foreground mb-0.5">
                {dashboardMetrics.weeklyCompletionRate}%
              </p>
              <p className="text-xs text-foreground-600">completion rate</p>
            </CardBody>
          </Card>

          <Card className="border-t-4 border-t-primary">
            <CardBody className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <ActivityIcon className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Weekly Miles</h3>
              </div>
              <p className="text-2xl font-bold text-foreground mb-0.5">
                {dashboardMetrics.weeklyDistance}
              </p>
              <p className="text-xs text-foreground-600">miles completed</p>
            </CardBody>
          </Card>

          <Card className="border-t-4 border-t-warning">
            <CardBody className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUpIcon className="w-5 h-5 text-warning" />
                <h3 className="font-semibold text-foreground">Upcoming</h3>
              </div>
              <p className="text-2xl font-bold text-foreground mb-0.5">
                {dashboardMetrics.thisWeekWorkouts.length}
              </p>
              <p className="text-xs text-foreground-600">workouts this week</p>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* This Week's Workouts */}
        <Card className="h-fit" data-testid="upcoming-workouts-section">
          <CardHeader className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">This Week&apos;s Workouts</h2>
            </div>
            <Button as={Link} href="/workouts" size="sm" color="primary" variant="flat">
              View All
            </Button>
          </CardHeader>
          <CardBody>
            {dashboardMetrics.thisWeekWorkouts.length === 0 ? (
              <div className="text-center py-8">
                <ClockIcon className="mx-auto h-12 w-12 text-foreground-400 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No workouts scheduled
                </h3>
                <p className="text-foreground-600">
                  Check your training plan or contact your coach
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardMetrics.thisWeekWorkouts.slice(0, 5).map(workout => (
                  <Card
                    key={workout.id}
                    className="border border-divider hover:shadow-md transition-shadow"
                  >
                    <CardBody className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          {getWorkoutTypeIcon(workout.planned_type)}
                          <div>
                            <h3 className="font-semibold text-foreground capitalize">
                              {formatLabel(workout.planned_type)}
                            </h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm text-foreground-600">
                                {new Date(workout.date).toLocaleDateString(userLocale, {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                              {workout.planned_distance && (
                                <span className="text-sm text-foreground-600">
                                  {workout.planned_distance} mi
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Chip
                          size="sm"
                          color={workout.status === 'completed' ? 'success' : 'default'}
                          variant="flat"
                        >
                          {workout.status === 'completed' ? 'Done' : 'Planned'}
                        </Chip>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Right Column - Coach & Integrations */}
        <div className="space-y-8">
          {/* My Coach */}
          <Card className="h-fit" data-testid="coaches-section">
            <CardHeader className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MountainSnowIcon className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">My Coach</h2>
              </div>
              <Button
                as={Link}
                href="/relationships"
                size="sm"
                color="primary"
                variant="flat"
                data-testid="find-coach-button"
              >
                Find Coach
              </Button>
            </CardHeader>
            <CardBody>
              {coachRelationships.length === 0 ? (
                <div className="text-center py-8">
                  <MountainSnowIcon className="mx-auto h-12 w-12 text-foreground-400 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No coach assigned</h3>
                  <p className="text-foreground-600 mb-4">
                    Connect with an experienced coach to guide your training
                  </p>
                  <Button
                    as={Link}
                    href="/relationships"
                    color="primary"
                    size="sm"
                    data-testid="find-coach-cta-button"
                  >
                    Find a Coach
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {coachRelationships.map(relationship => (
                    <Card
                      key={relationship.id}
                      className="border border-divider hover:shadow-md transition-shadow"
                    >
                      <CardBody className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-white font-semibold text-lg">
                            {(relationship.other_party.full_name || 'C').charAt(0)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground text-lg">
                              {relationship.other_party.full_name || relationship.other_party.name}
                            </h3>
                            <p className="text-sm text-foreground-600">
                              {relationship.other_party.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          as={Link}
                          href={`/chat/${relationship.other_party.id}`}
                          color="primary"
                          className="w-full"
                          startContent={<MessageSquareIcon className="w-4 h-4" />}
                        >
                          Send Message
                        </Button>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Integration Widgets */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <StravaDashboardWidget />
            <GarminDashboardWidget />
          </div>
        </div>
      </div>

      {/* Workout Log Modal */}
      {uiState.selectedWorkout && (
        <WorkoutLogModal
          isOpen={uiState.showLogWorkout}
          onClose={handleWorkoutModalClose}
          onSuccess={handleWorkoutSuccess}
          workout={uiState.selectedWorkout}
          defaultToComplete={uiState.defaultToComplete}
        />
      )}
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export default memo(RunnerDashboard)
