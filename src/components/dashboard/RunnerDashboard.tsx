'use client'

import { Button, Card, CardBody, CardHeader, Chip, Progress } from '@heroui/react'
import classNames from 'classnames'
import { useAtom } from 'jotai'
import {
  ActivityIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  FlagIcon,
  MapPinIcon,
  MessageSquareIcon,
  MountainSnowIcon,
  RouteIcon,
  TrendingUpIcon,
} from 'lucide-react'

import { memo, useMemo } from 'react'

import Link from 'next/link'

import StravaDashboardWidget from '@/components/strava/StravaDashboardWidget'
import { RunnerDashboardSkeleton } from '@/components/ui/LoadingSkeletons'
import WorkoutLogModal from '@/components/workouts/WorkoutLogModal'
import { useSession } from '@/hooks/useBetterSession'
import { useDashboardData } from '@/hooks/useDashboardData'
import { uiStateAtom } from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import type { TrainingPlan, Workout } from '@/lib/supabase'
import type { RelationshipData } from '@/types/relationships'

const logger = createLogger('RunnerDashboard')

// Advanced metric card component for runner dashboard
interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
  }
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'default'
  testId?: string
}

const MetricCard = memo(function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'primary',
  testId,
}: MetricCardProps) {
  if (!Icon) {
    logger.error('MetricCard: Icon is undefined for title:', title)
    return (
      <Card className="border-t-4 border-t-primary/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
        <CardBody className="p-6">
          <div className="text-red-500">Icon undefined for: {title}</div>
        </CardBody>
      </Card>
    )
  }

  const getTrendColor = () => {
    switch (trend?.direction) {
      case 'up':
        return 'text-success'
      case 'down':
        return 'text-danger'
      default:
        return 'text-default-500'
    }
  }

  const TrendIcon =
    trend?.direction === 'up' ? ArrowUpIcon : trend?.direction === 'down' ? ArrowDownIcon : null

  return (
    <Card className="border-t-4 border-t-primary/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      <CardBody className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground-600 uppercase tracking-wider">
              {title}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-foreground" data-testid={testId}>
                {value}
              </span>
              {subtitle && <span className="text-lg text-foreground-500">{subtitle}</span>}
            </div>
          </div>
          <div
            className={classNames('p-3 rounded-lg', {
              'bg-primary/10': color === 'primary',
              'bg-secondary/10': color === 'secondary',
              'bg-success/10': color === 'success',
              'bg-warning/10': color === 'warning',
              'bg-danger/10': color === 'danger',
              'bg-default/10': !color || color === 'default',
            })}
          >
            <Icon
              className={classNames('w-6 h-6', {
                'text-primary': color === 'primary',
                'text-secondary': color === 'secondary',
                'text-success': color === 'success',
                'text-warning': color === 'warning',
                'text-danger': color === 'danger',
                'text-default': !color || color === 'default',
              })}
            />
          </div>
        </div>

        {trend && (
          <div className="flex items-center gap-1">
            {TrendIcon && <TrendIcon className={`w-4 h-4 ${getTrendColor()}`} />}
            <span className={`text-sm font-medium ${getTrendColor()}`}>
              {trend.value > 0 ? '+' : ''}
              {trend.value}%
            </span>
            <span className="text-sm text-foreground-500">from last week</span>
          </div>
        )}
      </CardBody>
    </Card>
  )
})

// Helper functions moved outside component for better performance
const getTrainingPlanProgress = (plan: TrainingPlan) => {
  // Calculate progress based on current date vs target race date
  if (!plan.target_race_date) return 0
  const today = new Date()
  const raceDate = new Date(plan.target_race_date)
  const createdDate = new Date(plan.created_at)
  const totalDays = Math.max(
    1,
    Math.ceil((raceDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
  )
  const daysPassed = Math.ceil((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
  return Math.min(100, Math.max(0, (daysPassed / totalDays) * 100))
}

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
    return workoutDate >= weekAgo && workoutDate <= today
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
    return workoutDate >= monthAgo && workoutDate <= today
  })

  const lastMonth = workouts.filter(w => {
    const workoutDate = new Date(w.date)
    return workoutDate >= twoMonthsAgo && workoutDate < monthAgo
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
      return workoutDate >= weekAgo && workoutDate <= today && w.status === 'completed'
    })
    .reduce(
      (total, workout) => total + (workout.actual_distance || workout.planned_distance || 0),
      0
    )
}

const calculateRecentActivity = (workouts: Workout[]) => {
  const today = new Date()
  const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)

  return workouts.filter(w => {
    const workoutDate = new Date(w.date)
    return workoutDate >= twoWeeksAgo && w.status === 'completed'
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
    const today = new Date()
    const weekFromToday = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const thisWeekWorkouts = upcomingWorkouts.filter(w => {
      const workoutDate = new Date(w.date)
      return workoutDate >= today && workoutDate <= weekFromToday
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

  if (loading) {
    return <RunnerDashboardSkeleton />
  }

  // Get today's workout
  const todaysWorkout = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return upcomingWorkouts.find(w => {
      const workoutDate = new Date(w.date)
      workoutDate.setHours(0, 0, 0, 0)
      return workoutDate.getTime() === today.getTime()
    })
  }, [upcomingWorkouts])

  return (
    <div className="space-y-8" data-testid="runner-dashboard-content">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Base Camp Dashboard</h1>
        <p className="text-foreground-600">
          Welcome back, {(session?.user?.name || 'Athlete') as string}! Ready for today's training?
        </p>
      </div>

      {/* Today's Workout - Hero Section */}
      {todaysWorkout ? (
        <Card className="border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10">
          <CardBody className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-lg bg-primary/20">
                <ActivityIcon className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Today's Workout</h2>
                <p className="text-foreground-600">
                  {new Date(todaysWorkout.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Workout Details */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-foreground capitalize mb-2">
                    {todaysWorkout.planned_type?.replace('_', ' ')}
                  </h3>
                  {todaysWorkout.description && (
                    <p className="text-foreground-600">{todaysWorkout.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {todaysWorkout.planned_distance && (
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-foreground-600">Distance</p>
                        <p className="text-lg font-semibold text-foreground">
                          {todaysWorkout.planned_distance} miles
                        </p>
                      </div>
                    </div>
                  )}
                  {todaysWorkout.planned_duration && (
                    <div className="flex items-center gap-2">
                      <ClockIcon className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-foreground-600">Duration</p>
                        <p className="text-lg font-semibold text-foreground">
                          {todaysWorkout.planned_duration} min
                        </p>
                      </div>
                    </div>
                  )}
                  {todaysWorkout.planned_pace && (
                    <div className="flex items-center gap-2">
                      <TrendingUpIcon className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-foreground-600">Pace</p>
                        <p className="text-lg font-semibold text-foreground">
                          {todaysWorkout.planned_pace}
                        </p>
                      </div>
                    </div>
                  )}
                  {todaysWorkout.planned_elevation_gain && (
                    <div className="flex items-center gap-2">
                      <MountainSnowIcon className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-foreground-600">Elevation</p>
                        <p className="text-lg font-semibold text-foreground">
                          {todaysWorkout.planned_elevation_gain} ft
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-3">
                <div className="bg-background/50 rounded-lg p-4 border border-divider">
                  <p className="text-sm text-foreground-600 mb-1">This Week</p>
                  <p className="text-2xl font-bold text-foreground">
                    {dashboardMetrics.weeklyCompletionRate}%
                  </p>
                  <p className="text-xs text-foreground-500">completion rate</p>
                </div>
                <div className="bg-background/50 rounded-lg p-4 border border-divider">
                  <p className="text-sm text-foreground-600 mb-1">Weekly Distance</p>
                  <p className="text-2xl font-bold text-foreground">
                    {dashboardMetrics.weeklyDistance}
                  </p>
                  <p className="text-xs text-foreground-500">miles logged</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {todaysWorkout.status === 'planned' && (
              <div className="flex gap-3">
                <Button
                  size="lg"
                  color="success"
                  className="flex-1 font-semibold"
                  startContent={<CheckCircleIcon className="w-5 h-5" />}
                  onClick={() => handleMarkComplete(todaysWorkout)}
                >
                  Mark Complete
                </Button>
                <Button
                  size="lg"
                  variant="bordered"
                  className="flex-1 font-semibold"
                  onClick={() => handleLogDetails(todaysWorkout)}
                >
                  Log Details
                </Button>
              </div>
            )}
            {todaysWorkout.status === 'completed' && (
              <div className="flex items-center justify-center gap-2 p-4 bg-success/10 rounded-lg border border-success/20">
                <CheckCircleIcon className="w-6 h-6 text-success" />
                <span className="text-lg font-semibold text-success">Workout Completed!</span>
              </div>
            )}
          </CardBody>
        </Card>
      ) : (
        <Card className="border-2 border-dashed border-divider">
          <CardBody className="p-8 text-center">
            <CalendarIcon className="w-12 h-12 text-foreground-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No workout scheduled today</h2>
            <p className="text-foreground-600 mb-4">Enjoy your rest day or check upcoming workouts</p>
            <Button as={Link} href="/workouts" color="primary" variant="bordered">
              View All Workouts
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Quick Actions & Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-t-4 border-t-success">
          <CardBody className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircleIcon className="w-6 h-6 text-success" />
              <h3 className="font-semibold text-foreground">This Week</h3>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {dashboardMetrics.weeklyCompletionRate}%
            </p>
            <p className="text-sm text-foreground-600">completion rate</p>
          </CardBody>
        </Card>

        <Card className="border-t-4 border-t-primary">
          <CardBody className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <ActivityIcon className="w-6 h-6 text-primary" />
              <h3 className="font-semibold text-foreground">Weekly Miles</h3>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {dashboardMetrics.weeklyDistance}
            </p>
            <p className="text-sm text-foreground-600">miles completed</p>
          </CardBody>
        </Card>

        <Card className="border-t-4 border-t-warning">
          <CardBody className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUpIcon className="w-6 h-6 text-warning" />
              <h3 className="font-semibold text-foreground">Upcoming</h3>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {dashboardMetrics.thisWeekWorkouts.length}
            </p>
            <p className="text-sm text-foreground-600">workouts this week</p>
          </CardBody>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* This Week's Workouts */}
        <Card className="h-fit" data-testid="upcoming-workouts-section">
          <CardHeader className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">This Week's Workouts</h2>
            </div>
            <Button as={Link} href="/workouts" size="sm" color="primary" variant="flat">
              View All
            </Button>
          </CardHeader>
          <CardBody>
            {dashboardMetrics.thisWeekWorkouts.length === 0 ? (
              <div className="text-center py-8">
                <ClockIcon className="mx-auto h-12 w-12 text-foreground-400 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No workouts scheduled</h3>
                <p className="text-foreground-600">Check your training plan or contact your coach</p>
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
                              {workout.planned_type?.replace('_', ' ')}
                            </h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm text-foreground-600">
                                {new Date(workout.date).toLocaleDateString('en-US', {
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
            {relationships.filter(
              (rel: { other_party: { role: string } }) => rel.other_party.role === 'coach'
            ).length === 0 ? (
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
                  data-testid="find-your-guide-button"
                >
                  Find a Coach
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {relationships
                  .filter((rel: RelationshipData) => rel.other_party.role === 'coach')
                  .map((relationship: RelationshipData) => (
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
                              {relationship.other_party.full_name}
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

        {/* Strava Integration Widget */}
        <StravaDashboardWidget />
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
