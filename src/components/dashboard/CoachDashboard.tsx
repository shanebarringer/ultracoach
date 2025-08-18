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

import { useDashboardData } from '@/hooks/useDashboardData'
import { createLogger } from '@/lib/logger'
import type { TrainingPlan, User } from '@/lib/supabase'

import RecentActivity from './RecentActivity'

const logger = createLogger('CoachDashboard')

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
    <Card className="border-t-4 border-t-primary/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
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
  const typedTrainingPlans = useMemo(() => {
    const plans = trainingPlans as TrainingPlanWithRunner[]
    logger.debug('Dashboard data updated:', {
      plansCount: plans.length,
      runnersCount: runners.length,
      recentWorkoutsCount: recentWorkouts.length,
      loading,
    })
    return plans
  }, [trainingPlans, runners.length, recentWorkouts.length, loading])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-foreground-600">Loading your summit dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Summit Dashboard</h1>
          <p className="text-foreground-600">
            Track your athletes&apos; ascent to peak performance
          </p>
        </div>

        <Card className="bg-linear-to-br from-warning/10 to-warning/5 border border-warning/20 p-4">
          <div className="text-center">
            <p className="text-xs text-warning font-medium mb-1">CURRENT ALTITUDE</p>
            <p className="text-2xl font-bold text-foreground">8,847m</p>
            <p className="text-sm text-foreground-600">Peak Performance</p>
          </div>
        </Card>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div data-testid="active-plans-count">
          <MetricCard
            title="Active Training Plans"
            value={trainingPlans.length}
            subtitle="expeditions"
            icon={CalendarDaysIcon}
            trend={{ value: 12, direction: 'up' }}
            color="primary"
          />
        </div>

        <div data-testid="total-runners-count">
          <MetricCard
            title="Runners"
            value={runners.length}
            subtitle="athletes"
            icon={UsersIcon}
            trend={{ value: 8, direction: 'up' }}
            color="success"
          />
        </div>

        <div data-testid="upcoming-workouts-count">
          <MetricCard
            title="Recent Workouts"
            value={recentWorkouts.length}
            subtitle="completed"
            icon={ChartBarIcon}
            color="warning"
          />
        </div>

        <div data-testid="this-week-count">
          <MetricCard
            title="This Week"
            value="127"
            subtitle="km total"
            icon={ArrowTrendingUpIcon}
            trend={{ value: 15, direction: 'up' }}
            color="secondary"
          />
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Training Expeditions */}
        <Card
          className="hover:shadow-lg transition-shadow duration-300"
          data-testid="training-plans-section"
        >
          <CardHeader className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Training Expeditions</h3>
              <p className="text-sm text-foreground-600">Active summit challenges</p>
            </div>
            <Button
              as={Link}
              href="/training-plans"
              color="primary"
              className="bg-linear-to-r from-primary to-secondary text-white font-medium"
            >
              ⛰️ Manage Plans
            </Button>
          </CardHeader>
          <CardBody>
            {typedTrainingPlans.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-16 w-16 bg-default-100 rounded-full flex items-center justify-center mb-4">
                  <CalendarDaysIcon className="h-8 w-8 text-default-400" />
                </div>
                <p className="text-foreground font-medium mb-2">No expeditions yet</p>
                <p className="text-sm text-foreground-500">
                  Create your first training expedition to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {typedTrainingPlans.map(plan => (
                  <div
                    key={plan.id}
                    className="border border-divider rounded-lg p-4 hover:shadow-md transition-shadow bg-content1"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">{plan.title}</h4>
                        <p className="text-sm text-foreground-600">{plan.description}</p>
                      </div>
                      <Chip color="primary" variant="flat" size="sm" className="capitalize">
                        Active
                      </Chip>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {plan.runners && (
                        <div className="flex items-center gap-1 text-sm text-foreground-600">
                          <UsersIcon className="w-4 h-4" />
                          <span>{plan.runners.full_name}</span>
                        </div>
                      )}
                      {plan.target_race_date && (
                        <div className="flex items-center gap-1 text-sm text-foreground-600">
                          <CalendarDaysIcon className="w-4 h-4" />
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

        {/* Recent Peaks Conquered - Using Suspense-enabled component */}
        <RecentActivity
          title="Recent Peaks Conquered"
          subtitle="Latest summit achievements"
          limit={5}
          userRole="coach"
          useSuspense={true}
        />
      </div>

      {/* Your Athletes */}
      <Card
        className="hover:shadow-lg transition-shadow duration-300"
        data-testid="runners-section"
      >
        <CardHeader className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Your Athletes</h3>
            <p className="text-sm text-foreground-600">
              Runners on their summit journey ({runners.length} connected)
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              as={Link}
              href="/relationships"
              size="sm"
              variant="flat"
              color="primary"
              className="hidden sm:flex"
            >
              Find Athletes
            </Button>
            <Button
              as={Link}
              href="/relationships"
              size="sm"
              color="primary"
              className="bg-linear-to-r from-primary to-secondary text-white font-medium"
            >
              🏃‍♂️ Connect
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {runners.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-16 w-16 bg-default-100 rounded-full flex items-center justify-center mb-4">
                <UsersIcon className="h-8 w-8 text-default-400" />
              </div>
              <p className="text-foreground font-medium mb-2">No athletes connected yet</p>
              <p className="text-sm text-foreground-500 mb-4">
                Connect with runners to start their journey to peak performance.
              </p>
              <Button
                as={Link}
                href="/relationships"
                color="primary"
                className="bg-linear-to-r from-primary to-secondary text-white font-medium"
              >
                Find Athletes to Coach
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {runners.map((runner: User) => {
                  // Find the relationship for this runner to show status
                  const relationship = relationships.find(
                    (rel: { other_party: { id: string } }) => rel.other_party.id === runner.id
                  )

                  return (
                    <div
                      key={runner.id}
                      className="border border-divider rounded-lg p-4 bg-content1 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-linear-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-semibold">
                          {(runner.full_name || 'U').charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-foreground">
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
                          <p className="text-sm text-foreground-600">{runner.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          className="flex-1"
                          onPress={() => handleViewProgress(runner.id)}
                        >
                          View Progress
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          color="success"
                          className="flex-1"
                          onPress={() => handleSendMessage(runner.id)}
                        >
                          Send Message
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Show connection actions */}
              <div className="pt-4 border-t border-divider">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-foreground-600">Want to coach more athletes?</p>
                  <Button
                    as={Link}
                    href="/relationships"
                    size="sm"
                    variant="bordered"
                    color="primary"
                  >
                    Browse Available Runners
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export default memo(CoachDashboard)
