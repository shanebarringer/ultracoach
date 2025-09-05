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

  return (
    <div className="space-y-8">
      {/* Enhanced Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Base Camp Dashboard</h1>
          <p className="text-foreground-600">
            Welcome back, {(session?.user?.fullName || session?.user?.name || 'Athlete') as string}! Track your journey to peak performance
          </p>
        </div>

        <div className="flex gap-3">
          <Card className="bg-linear-to-br from-success/10 to-success/5 border border-success/20 p-4">
            <div className="text-center">
              <p className="text-xs text-success font-medium mb-1">OVERALL PROGRESS</p>
              <p className="text-2xl font-bold text-foreground">
                {dashboardMetrics.completionRate}%
              </p>
              <p className="text-sm text-foreground-600">All Time</p>
            </div>
          </Card>

          <Card className="bg-linear-to-br from-primary/10 to-primary/5 border border-primary/20 p-4">
            <div className="text-center">
              <p className="text-xs text-primary font-medium mb-1">THIS WEEK</p>
              <p className="text-2xl font-bold text-foreground">
                {dashboardMetrics.weeklyCompletionRate}%
              </p>
              <p className="text-sm text-foreground-600">Weekly Rate</p>
            </div>
          </Card>

          <Card className="bg-linear-to-br from-warning/10 to-warning/5 border border-warning/20 p-4">
            <div className="text-center">
              <p className="text-xs text-warning font-medium mb-1">THIS MONTH</p>
              <div className="flex items-center justify-center gap-1">
                <p className="text-2xl font-bold text-foreground">
                  {dashboardMetrics.monthlyStats.thisMonthRate}%
                </p>
                {dashboardMetrics.monthlyStats.trend !== 0 && (
                  <span
                    className={`text-sm font-medium ${dashboardMetrics.monthlyStats.trend > 0 ? 'text-success' : 'text-danger'}`}
                  >
                    {dashboardMetrics.monthlyStats.trend > 0 ? '↗' : '↘'}
                  </span>
                )}
              </div>
              <p className="text-sm text-foreground-600">
                {dashboardMetrics.monthlyStats.thisMonthCompleted}/
                {dashboardMetrics.monthlyStats.thisMonthTotal} completed
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Advanced Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Active Training Plans"
          value={trainingPlans.length}
          subtitle="expeditions"
          icon={MapPinIcon}
          trend={{ value: 12, direction: 'up' }}
          color="primary"
          testId="active-plans-count"
        />

        <MetricCard
          title="Upcoming Ascents"
          value={upcomingWorkouts.length}
          subtitle="workouts"
          icon={TrendingUpIcon}
          trend={{ value: 8, direction: 'up' }}
          color="success"
          testId="upcoming-workouts-count"
        />

        <MetricCard
          title="Completion Rate"
          value={dashboardMetrics.completionRate}
          subtitle="%"
          icon={CheckCircleIcon}
          trend={{
            value: dashboardMetrics.monthlyStats.trend,
            direction:
              dashboardMetrics.monthlyStats.trend > 0
                ? 'up'
                : dashboardMetrics.monthlyStats.trend < 0
                  ? 'down'
                  : 'neutral',
          }}
          color="warning"
          testId="completion-rate"
        />

        <MetricCard
          title="Weekly Distance"
          value={dashboardMetrics.weeklyDistance}
          subtitle="miles"
          icon={ActivityIcon}
          trend={{ value: 15, direction: 'up' }}
          color="secondary"
          testId="weekly-distance"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* My Coaches Section */}
        <Card className="h-fit" data-testid="coaches-section">
          <CardHeader className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MountainSnowIcon className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">My Guides</h2>
            </div>
            <Button
              as={Link}
              href="/relationships"
              size="sm"
              color="primary"
              variant="flat"
              className="text-xs"
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
                <h3 className="text-lg font-semibold text-foreground mb-2">No guide assigned</h3>
                <p className="text-foreground-600 mb-4">
                  Connect with an experienced coach to guide your summit journey
                </p>
                <Button
                  as={Link}
                  href="/relationships"
                  color="primary"
                  size="sm"
                  className="bg-primary text-white font-medium"
                >
                  Find Your Guide
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
                          <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-white font-semibold">
                            {(relationship.other_party.full_name || 'C').charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground">
                                {relationship.other_party.full_name}
                              </h3>
                              <Chip
                                size="sm"
                                color={relationship.status === 'active' ? 'success' : 'warning'}
                                variant="flat"
                                className="capitalize"
                              >
                                {relationship.status}
                              </Chip>
                            </div>
                            <p className="text-sm text-foreground-600">
                              {relationship.other_party.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="flat" color="primary" className="flex-1">
                            View Profile
                          </Button>
                          <Button
                            as={Link}
                            href={`/chat/${relationship.other_party.id}`}
                            size="sm"
                            variant="flat"
                            color="success"
                            className="flex-1"
                            startContent={<MessageSquareIcon className="w-4 h-4" />}
                          >
                            Message
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
              </div>
            )}
          </CardBody>
        </Card>
        {/* Training Plans */}
        <Card className="h-fit" data-testid="training-plans-section">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPinIcon className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Expedition Plans</h2>
            </div>
          </CardHeader>
          <CardBody>
            {trainingPlans.length === 0 ? (
              <div className="text-center py-8">
                <MountainSnowIcon className="mx-auto h-12 w-12 text-foreground-400 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No expeditions planned
                </h3>
                <p className="text-foreground-600 mb-4">
                  Connect with your guide to plan your next summit
                </p>
                <Button color="primary" variant="bordered" size="sm">
                  Find a Guide
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {trainingPlans.map(plan => {
                  const progress = getTrainingPlanProgress(plan)
                  return (
                    <Card
                      key={plan.id}
                      className="border border-divider hover:shadow-md transition-shadow"
                    >
                      <CardBody className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-foreground">{plan.title}</h3>
                          <Chip size="sm" color="primary" variant="bordered">
                            Active
                          </Chip>
                        </div>
                        <p className="text-sm text-foreground-600 mb-3">{plan.description}</p>
                        {plan.target_race_date && (
                          <div className="flex items-center gap-2 mb-3">
                            <FlagIcon className="w-4 h-4 text-danger" />
                            <span className="text-sm font-medium text-foreground-700">
                              Summit Target: {new Date(plan.target_race_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-foreground-600">Progress to summit</span>
                            <span className="text-xs text-foreground-600">
                              {Math.round(progress)}%
                            </span>
                          </div>
                          <Progress
                            value={progress}
                            color="primary"
                            size="sm"
                            className="w-full"
                            showValueLabel={false}
                          />
                        </div>
                      </CardBody>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Upcoming Workouts */}
        <Card className="h-fit" data-testid="upcoming-workouts-section">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUpIcon className="w-5 h-5 text-success" />
              <h2 className="text-xl font-bold text-foreground">Upcoming Ascents</h2>
            </div>
          </CardHeader>
          <CardBody>
            {upcomingWorkouts.length === 0 ? (
              <div className="text-center py-8">
                <ClockIcon className="mx-auto h-12 w-12 text-foreground-400 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No ascents scheduled</h3>
                <p className="text-foreground-600">Your next training session awaits planning</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardMetrics.thisWeekWorkouts.slice(0, 5).map(workout => (
                  <Card
                    key={workout.id}
                    className="border border-divider hover:shadow-md transition-shadow"
                  >
                    <CardBody className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            {getWorkoutTypeIcon(workout.planned_type)}
                            <div>
                              <h3 className="font-semibold text-foreground capitalize">
                                {workout.planned_type?.replace('_', ' ')}
                              </h3>
                              <div className="flex items-center gap-4 mt-1">
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="w-3 h-3 text-foreground-600" />
                                  <span className="text-sm text-foreground-600">
                                    {new Date(workout.date).toLocaleDateString()}
                                  </span>
                                </div>
                                {workout.planned_distance && (
                                  <div className="flex items-center gap-1">
                                    <MapPinIcon className="w-3 h-3 text-foreground-600" />
                                    <span className="text-sm text-foreground-600">
                                      {workout.planned_distance} miles
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <Chip
                            size="sm"
                            color={workout.status === 'completed' ? 'success' : 'warning'}
                            variant="flat"
                            startContent={
                              workout.status === 'completed' ? (
                                <CheckCircleIcon className="w-3 h-3" />
                              ) : undefined
                            }
                          >
                            {workout.status === 'completed' ? 'Completed' : 'Planned'}
                          </Chip>
                        </div>

                        {workout.status === 'planned' && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="flat"
                              color="success"
                              className="flex-1"
                              startContent={<CheckCircleIcon className="w-4 h-4" />}
                              onClick={() => handleMarkComplete(workout)}
                            >
                              Mark Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="bordered"
                              className="flex-1"
                              onClick={() => handleLogDetails(workout)}
                            >
                              Log Details
                            </Button>
                          </div>
                        )}
                      </div>
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
