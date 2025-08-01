'use client'

import { Button, Card, CardBody, CardHeader, Chip, Progress, Spinner } from '@heroui/react'
import {
  CalendarIcon,
  ClockIcon,
  FlagIcon,
  MapPinIcon,
  MountainSnowIcon,
  RouteIcon,
  TrendingUpIcon,
} from 'lucide-react'

import { memo, useMemo } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import { useDashboardData } from '@/hooks/useDashboardData'
import { createLogger } from '@/lib/logger'
import type { TrainingPlan } from '@/lib/supabase'

const logger = createLogger('RunnerDashboard')

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
  const { trainingPlans, upcomingWorkouts, loading } = useDashboardData()

  // Memoize expensive computations and add logging
  const thisWeekWorkouts = useMemo(() => {
    const today = new Date()
    const weekFromToday = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const filtered = upcomingWorkouts.filter(w => {
      const workoutDate = new Date(w.date)
      return workoutDate >= today && workoutDate <= weekFromToday
    })

    logger.debug('Dashboard data updated:', {
      trainingPlansCount: trainingPlans.length,
      upcomingWorkoutsCount: upcomingWorkouts.length,
      thisWeekWorkoutsCount: filtered.length,
      loading,
    })

    return filtered
  }, [upcomingWorkouts, trainingPlans.length, loading])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" color="primary" label="Loading your base camp..." />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <Card className="bg-linear-to-br from-primary/10 via-secondary/5 to-primary/10 border-l-4 border-l-primary">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <MountainSnowIcon className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                Base Camp Dashboard
              </h1>
              <p className="text-foreground-600 text-lg mt-1">
                Welcome back, {session?.user?.name as string}! Ready to conquer your peaks?
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPinIcon className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground-700">Active Expeditions</h3>
                </div>
                <p className="text-3xl font-bold text-primary" data-testid="active-plans-count">
                  {trainingPlans.length}
                </p>
              </div>
              <div className="text-right">
                <Chip size="sm" color="primary" variant="flat">
                  Training Plans
                </Chip>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUpIcon className="w-5 h-5 text-success" />
                  <h3 className="text-sm font-semibold text-foreground-700">Upcoming Ascents</h3>
                </div>
                <p
                  className="text-3xl font-bold text-success"
                  data-testid="upcoming-workouts-count"
                >
                  {upcomingWorkouts.length}
                </p>
              </div>
              <div className="text-right">
                <Chip size="sm" color="success" variant="flat">
                  Workouts
                </Chip>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="w-5 h-5 text-warning" />
                  <h3 className="text-sm font-semibold text-foreground-700">This Week</h3>
                </div>
                <p className="text-3xl font-bold text-warning" data-testid="this-week-count">
                  {thisWeekWorkouts.length}
                </p>
              </div>
              <div className="text-right">
                <Chip size="sm" color="warning" variant="flat">
                  Sessions
                </Chip>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                {upcomingWorkouts.map(workout => (
                  <Card
                    key={workout.id}
                    className="border border-divider hover:shadow-md transition-shadow"
                  >
                    <CardBody className="p-4">
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
                        <Chip size="sm" color="warning" variant="flat">
                          Planned
                        </Chip>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export default memo(RunnerDashboard)
