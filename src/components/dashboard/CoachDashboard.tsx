'use client'

import {
  ArrowDownIcon,
  ArrowTrendingUpIcon,
  ArrowUpIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { Button, Card, CardBody, CardHeader, Chip } from '@heroui/react'
import classNames from 'classnames'

import { memo, useMemo } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import GarminDashboardWidget from '@/components/garmin/GarminDashboardWidget'
import StravaDashboardWidget from '@/components/strava/StravaDashboardWidget'
import { CoachDashboardSkeleton } from '@/components/ui/LoadingSkeletons'
import { useDashboardData } from '@/hooks/useDashboardData'
import { createLogger } from '@/lib/logger'
import type { TrainingPlan, User } from '@/lib/supabase'

import RecentActivity from './RecentActivity'

const logger = createLogger('CoachDashboard')

// Helper functions for calculating coach-specific metrics
const calculateOverallCompletionRate = (workouts: Array<{ status: string }>) => {
  if (!workouts.length) return 0
  const completedWorkouts = workouts.filter(w => w.status === 'completed').length
  return Math.round((completedWorkouts / workouts.length) * 100)
}

const calculateWeeklyAthletesActive = (
  workouts: Array<{ date: string; status: string; user_id: string }>
) => {
  const today = new Date()
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  const activeAthletes = new Set<string>()
  workouts.forEach(w => {
    const workoutDate = new Date(w.date)
    if (workoutDate >= weekAgo && workoutDate <= today && w.status === 'completed') {
      activeAthletes.add(w.user_id)
    }
  })

  return activeAthletes.size
}

const calculateCoachStats = (
  workouts: Array<{ date: string; status: string; user_id: string }>
) => {
  const today = new Date()
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())

  // This week's workouts
  const thisWeek = workouts.filter(w => {
    const workoutDate = new Date(w.date)
    return workoutDate >= weekAgo && workoutDate <= today
  })

  // This month's workouts
  const thisMonth = workouts.filter(w => {
    const workoutDate = new Date(w.date)
    return workoutDate >= monthAgo && workoutDate <= today
  })

  const weeklyCompleted = thisWeek.filter(w => w.status === 'completed').length
  const monthlyCompleted = thisMonth.filter(w => w.status === 'completed').length

  const weeklyCompletionRate =
    thisWeek.length > 0 ? Math.round((weeklyCompleted / thisWeek.length) * 100) : 0
  const monthlyCompletionRate =
    thisMonth.length > 0 ? Math.round((monthlyCompleted / thisMonth.length) * 100) : 0

  return {
    overallRate: calculateOverallCompletionRate(workouts),
    weeklyRate: weeklyCompletionRate,
    monthlyRate: monthlyCompletionRate,
    activeAthletesThisWeek: calculateWeeklyAthletesActive(workouts),
    totalWorkoutsThisWeek: thisWeek.length,
    completedThisWeek: weeklyCompleted,
    totalWorkoutsThisMonth: thisMonth.length,
    completedThisMonth: monthlyCompleted,
  }
}

type TrainingPlanWithRunner = TrainingPlan & { runners: User }

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
}

const MetricCard = memo(function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'primary',
}: MetricCardProps) {
  // Debug: Check if Icon is undefined
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
    <Card className="border-none" shadow="sm" isHoverable>
      <CardBody className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground-600 uppercase tracking-wider">
              {title}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-foreground">{value}</span>
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

function CoachDashboard() {
  const { trainingPlans, runners, recentWorkouts, loading, relationships } = useDashboardData()
  const router = useRouter()

  // Handler for viewing runner progress
  const handleViewProgress = (runnerId: string) => {
    router.push(`/weekly-planner/${runnerId}`)
  }

  // Handler for sending messages to runners
  const handleSendMessage = (runnerId: string) => {
    router.push(`/chat/${runnerId}`)
  }

  // Memoize expensive computations and add logging
  const { typedTrainingPlans, coachStats } = useMemo(() => {
    const plans = trainingPlans as TrainingPlanWithRunner[]
    const stats = calculateCoachStats(recentWorkouts)

    logger.debug('Coach dashboard data updated:', {
      plansCount: plans.length,
      runnersCount: runners.length,
      recentWorkoutsCount: recentWorkouts.length,
      coachStats: stats,
      loading,
    })

    return {
      typedTrainingPlans: plans,
      coachStats: stats,
    }
  }, [trainingPlans, runners.length, recentWorkouts, loading])

  if (loading) {
    return <CoachDashboardSkeleton />
  }

  return (
    <div className="space-y-6" data-testid="coach-dashboard-content">
      {/* Page Header with Quick Stats */}
      <div className="flex flex-col lg:flex-row justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Summit Dashboard</h1>
          <p className="text-foreground-600 text-lg">
            Track your athletes&apos; ascent to peak performance
          </p>
        </div>

        {/* Completion Statistics Cards */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-success/10 text-success px-4 py-3 rounded-lg flex flex-col items-center border border-success/20 min-w-[120px]">
            <div className="text-2xl font-bold">{coachStats.overallRate}%</div>
            <div className="text-xs font-medium">Overall Rate</div>
          </div>
          <div className="bg-primary/10 text-primary px-4 py-3 rounded-lg flex flex-col items-center border border-primary/20 min-w-[120px]">
            <div className="text-2xl font-bold">{coachStats.weeklyRate}%</div>
            <div className="text-xs font-medium">This Week</div>
          </div>
          <div className="bg-warning/10 text-warning px-4 py-3 rounded-lg flex flex-col items-center border border-warning/20 min-w-[120px]">
            <div className="text-2xl font-bold">{coachStats.activeAthletesThisWeek}</div>
            <div className="text-xs font-medium">Active Athletes</div>
          </div>
        </div>
      </div>

      {/* Main Content - Better organized hierarchy */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Primary Column - Athletes (Most Important) */}
        <div className="xl:col-span-2 space-y-6">
          {/* Your Athletes - Moved to top for priority */}
          <Card shadow="sm" data-testid="runners-section">
            <CardHeader className="flex justify-between items-center pb-4">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Your Athletes</h3>
                <p className="text-sm text-foreground-600">
                  {runners.length} runners on their summit journey
                </p>
              </div>
              <Button
                as={Link}
                href="/relationships"
                size="sm"
                color="primary"
                className="bg-primary text-white font-medium"
                data-testid="connect-athletes-button"
              >
                🏃‍♂️ Connect
              </Button>
            </CardHeader>
            <CardBody>
              {runners.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mx-auto h-12 w-12 bg-default-100 rounded-full flex items-center justify-center mb-3">
                    <UsersIcon className="h-6 w-6 text-default-400" />
                  </div>
                  <p className="text-foreground font-medium mb-1">No athletes connected</p>
                  <p className="text-sm text-foreground-500 mb-4">
                    Connect with runners to start coaching.
                  </p>
                  <Button
                    as={Link}
                    href="/relationships"
                    color="primary"
                    size="sm"
                    data-testid="find-athletes-button"
                  >
                    Find Athletes to Coach
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {runners.slice(0, 4).map((runner: User) => {
                      const relationship = relationships.find(
                        (rel: { other_party: { id: string } }) => rel.other_party.id === runner.id
                      )

                      return (
                        <div
                          key={runner.id}
                          className="border border-divider rounded-lg p-3 bg-content2/50 hover:bg-content2 transition-colors"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {(runner.full_name || 'U').charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-foreground text-sm truncate">
                                  {runner.full_name || 'User'}
                                </h4>
                                {relationship && (
                                  <Chip
                                    size="sm"
                                    color={relationship.status === 'active' ? 'success' : 'warning'}
                                    variant="flat"
                                    className="capitalize"
                                  >
                                    {relationship.status}
                                  </Chip>
                                )}
                              </div>
                              <p className="text-xs text-foreground-500 truncate">{runner.email}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="flat"
                              color="primary"
                              className="flex-1 text-xs h-7"
                              onPress={() => handleViewProgress(runner.id)}
                            >
                              Progress
                            </Button>
                            <Button
                              size="sm"
                              variant="flat"
                              color="success"
                              className="flex-1 text-xs h-7"
                              onPress={() => handleSendMessage(runner.id)}
                            >
                              Message
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Show more link if there are more runners */}
                  {runners.length > 4 && (
                    <div className="pt-3 border-t border-divider text-center">
                      <Button
                        as={Link}
                        href="/relationships"
                        size="sm"
                        variant="flat"
                        color="primary"
                      >
                        View All {runners.length} Athletes
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Training Expeditions - Secondary priority */}
          <Card shadow="sm" data-testid="training-plans-section">
            <CardHeader className="flex justify-between items-center pb-4">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Training Expeditions</h3>
                <p className="text-sm text-foreground-600">
                  Active summit challenges
                  <span data-testid="total-plans-count" className="ml-1">
                    ({typedTrainingPlans.length})
                  </span>
                </p>
              </div>
              <Button
                as={Link}
                href="/training-plans"
                color="primary"
                size="sm"
                className="bg-primary text-white font-medium"
              >
                ⛰️ Manage Plans
              </Button>
            </CardHeader>
            <CardBody>
              {typedTrainingPlans.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mx-auto h-12 w-12 bg-default-100 rounded-full flex items-center justify-center mb-3">
                    <CalendarDaysIcon className="h-6 w-6 text-default-400" />
                  </div>
                  <p className="text-foreground font-medium mb-1">No expeditions yet</p>
                  <p className="text-sm text-foreground-500">
                    Create your first training expedition.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {typedTrainingPlans.map(plan => (
                    <div
                      key={plan.id}
                      className="border border-divider rounded-lg p-4 hover:shadow-sm transition-shadow bg-content2/30"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground mb-1">{plan.title}</h4>
                          <p className="text-sm text-foreground-600 line-clamp-1">
                            {plan.description}
                          </p>
                        </div>
                        <Chip color="primary" variant="flat" size="sm">
                          Active
                        </Chip>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-foreground-600">
                        {plan.runners && (
                          <div className="flex items-center gap-1">
                            <UsersIcon className="w-3 h-3" />
                            <span>{plan.runners.full_name}</span>
                          </div>
                        )}
                        {plan.target_race_date && (
                          <div className="flex items-center gap-1">
                            <CalendarDaysIcon className="w-3 h-3" />
                            <span>{new Date(plan.target_race_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Secondary Column - Analytics & Tools */}
        <div className="xl:col-span-2 space-y-6">
          {/* Key Metrics - Compact grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-2 gap-3">
            <MetricCard
              title="Active Plans"
              value={trainingPlans.length}
              subtitle="expeditions"
              icon={CalendarDaysIcon}
              trend={{ value: 12, direction: 'up' }}
              color="primary"
            />
            <MetricCard
              title="Athletes"
              value={runners.length}
              subtitle="connected"
              icon={UsersIcon}
              trend={{ value: 8, direction: 'up' }}
              color="success"
            />
            <MetricCard
              title="This Week"
              value={`${coachStats.completedThisWeek}/${coachStats.totalWorkoutsThisWeek}`}
              subtitle="completed"
              icon={ArrowTrendingUpIcon}
              trend={{
                value: coachStats.weeklyRate - coachStats.monthlyRate,
                direction: coachStats.weeklyRate > coachStats.monthlyRate ? 'up' : 'down',
              }}
              color="warning"
            />
            <MetricCard
              title="Monthly Rate"
              value={coachStats.monthlyRate}
              subtitle="% completed"
              icon={ChartBarIcon}
              color="secondary"
            />
          </div>

          {/* Integration Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StravaDashboardWidget />
            <GarminDashboardWidget />
          </div>

          {/* Recent Activity */}
          <RecentActivity
            title="Recent Peaks Conquered"
            subtitle="Latest summit achievements"
            limit={5}
            userRole="coach"
            useSuspense={true}
          />
        </div>
      </div>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export default memo(CoachDashboard)
