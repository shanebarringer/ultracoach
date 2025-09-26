'use client'

import { Button, Card, CardBody, CardHeader, Select, SelectItem, Spinner } from '@heroui/react'
import { useAtomValue } from 'jotai'
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon, UsersIcon } from 'lucide-react'

import { memo, useEffect, useMemo, useState } from 'react'
import { Fragment, Suspense } from 'react'

import { connectedRunnersAtom } from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import type { User, Workout } from '@/lib/supabase'

import AthleteWeeklySection from './AthleteWeeklySection'
import WeeklyMetrics from './WeeklyMetrics'

const logger = createLogger('WeeklyWorkoutOverview')

interface WeeklyWorkoutOverviewProps {
  coach: {
    id: string
    email: string
    name: string | null
    role: 'coach' | 'runner'
  }
  currentWeek: Date
  onWeekChange: (newWeek: Date) => void
}

function WeeklyWorkoutOverview({ coach, currentWeek, onWeekChange }: WeeklyWorkoutOverviewProps) {
  // Runners will be read inside Suspense-wrapped child components
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set())
  const [weeklyWorkouts, setWeeklyWorkouts] = useState<Workout[]>([])
  const [workoutsLoading, setWorkoutsLoading] = useState(false)

  // Format week range for display
  const formatWeekRange = (monday: Date) => {
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    return `${monday.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} - ${sunday.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`
  }

  // Week navigation functions
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7))
    onWeekChange(newWeek)
  }

  const goToCurrentWeek = () => {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    onWeekChange(monday)
  }

  // Fetch weekly workouts when week or selected athletes change
  useEffect(() => {
    const fetchWeeklyWorkouts = async () => {
      setWorkoutsLoading(true)
      try {
        const weekStart = new Date(currentWeek)
        const weekEnd = new Date(currentWeek)
        weekEnd.setDate(weekEnd.getDate() + 6)

        const params = new URLSearchParams({
          startDate: weekStart.toISOString().split('T')[0],
          endDate: weekEnd.toISOString().split('T')[0],
        })

        const response = await fetch(`/api/workouts?${params}`, {
          credentials: 'same-origin',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch workouts')
        }

        const data = await response.json()
        setWeeklyWorkouts(data.workouts || [])

        logger.debug('Fetched weekly workouts', {
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          workoutsCount: data.workouts?.length || 0,
        })
      } catch (error) {
        logger.error('Failed to fetch weekly workouts', error)
        setWeeklyWorkouts([])
      } finally {
        setWorkoutsLoading(false)
      }
    }

    fetchWeeklyWorkouts()
  }, [currentWeek])


  // Filter workouts for the filtered athletes
  const filteredWorkouts = useMemo(() => {
    if (selectedAthletes.size === 0) {
      return weeklyWorkouts
    }

    // Get workout user IDs from training plans
    // Since workouts contain training_plan_id and we need to match with runners
    // For now, we'll use the user_id field if available
    return weeklyWorkouts.filter(workout => {
      // Check if workout has user_id that matches selected athletes
      const workoutUserId = (workout as Workout & { user_id?: string }).user_id
      return selectedAthletes.has(workoutUserId || '')
    })
  }, [weeklyWorkouts, selectedAthletes])

  const handleAthleteSelection = (keys: 'all' | Set<React.Key>) => {
    const keySet =
      keys === 'all' ? new Set<string>() : new Set(Array.from(keys, key => String(key)))
    setSelectedAthletes(keySet)

    logger.debug('Athlete selection changed', {
      selectedCount: keySet.size,
    })
  }

  return (
    <div className="space-y-6">
      {/* Consolidated Navigation and Filters */}
      <Card className="bg-content1 border-l-4 border-l-primary">
        <CardHeader>
          {/* Main Header Row */}
          <div className="flex items-center justify-between w-full mb-4">
            <div className="flex items-center gap-3">
              <ClockIcon className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Weekly Expedition Overview
                </h2>
                <p className="text-foreground/70 text-sm">
                  {formatWeekRange(currentWeek)} • Strategic expedition planning
                </p>
              </div>
            </div>

            {/* Week Navigation Controls */}
            <div className="flex items-center gap-2">
              <Button
                isIconOnly
                variant="ghost"
                size="sm"
                onClick={() => navigateWeek('prev')}
                className="text-foreground/70 hover:text-foreground"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </Button>
              <Button
                variant="flat"
                size="sm"
                onClick={goToCurrentWeek}
                className="text-warning px-3"
              >
                Today
              </Button>
              <Button
                isIconOnly
                variant="ghost"
                size="sm"
                onClick={() => navigateWeek('next')}
                className="text-foreground/70 hover:text-foreground"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Filters and Metrics Row */}
          <div className="flex items-center justify-between w-full gap-4">
            {/* Athlete Filter */}
            <div className="flex items-center gap-3">
              <Suspense
                fallback={
                  <Fragment>
                    <Select
                      placeholder="All Athletes"
                      variant="bordered"
                      selectionMode="multiple"
                      className="max-w-xs"
                      selectedKeys={selectedAthletes}
                      isLoading
                      startContent={<UsersIcon className="w-4 h-4" />}
                      size="sm"
                    >
                      <SelectItem key="loading" isDisabled>
                        Loading…
                      </SelectItem>
                    </Select>
                    <span className="text-xs text-foreground/60">Loading…</span>
                  </Fragment>
                }
              >
                <RunnerMultiSelect
                  selectedAthletes={selectedAthletes}
                  onSelectionChange={handleAthleteSelection}
                />
              </Suspense>
            </div>

            {/* Compact Metrics */}
            <Suspense fallback={<div className="text-xs text-foreground/60">Loading…</div>}>
              <RunnerMetrics
                selectedAthletes={selectedAthletes}
                workouts={filteredWorkouts}
                loading={workoutsLoading}
              />
            </Suspense>
          </div>
        </CardHeader>
      </Card>

      {/* Athletes Weekly Sections */}
      {workoutsLoading ? (
        <Card>
          <CardBody className="flex justify-center items-center py-12">
            <Spinner size="lg" color="primary" label="Loading weekly workout data..." />
          </CardBody>
        </Card>
      ) : (
        <Suspense
          fallback={
            <Card>
              <CardBody className="text-center py-12">Loading athletes…</CardBody>
            </Card>
          }
        >
          <RunnerWeeklySections
            selectedAthletes={selectedAthletes}
            weeklyWorkouts={weeklyWorkouts}
            currentWeek={currentWeek}
            coach={coach}
          />
        </Suspense>
      )}
    </div>
  )
}

export default memo(WeeklyWorkoutOverview)

function RunnerMultiSelect({
  selectedAthletes,
  onSelectionChange,
}: {
  selectedAthletes: Set<string>
  onSelectionChange: (keys: 'all' | Set<React.Key>) => void
}) {
  const runners = useAtomValue(connectedRunnersAtom)
  return (
    <>
      <Select
        placeholder="All Athletes"
        variant="bordered"
        selectionMode="multiple"
        className="max-w-xs"
        selectedKeys={selectedAthletes}
        onSelectionChange={onSelectionChange}
        startContent={<UsersIcon className="w-4 h-4" />}
        size="sm"
      >
        {runners.map((runner: User) => (
          <SelectItem key={runner.id}>{runner.full_name || runner.email}</SelectItem>
        ))}
      </Select>
      <span className="text-xs text-foreground/60">
        {selectedAthletes.size === 0
          ? `${runners.length} total`
          : `${selectedAthletes.size}/${runners.length} selected`}
      </span>
    </>
  )
}

function RunnerWeeklySections({
  selectedAthletes,
  weeklyWorkouts,
  currentWeek,
  coach,
}: {
  selectedAthletes: Set<string>
  weeklyWorkouts: Workout[]
  currentWeek: Date
  coach: { id: string; email: string; name: string | null; role: 'coach' | 'runner' }
}) {
  const runners = useAtomValue(connectedRunnersAtom)
  const visibleRunners = useMemo(() => {
    if (selectedAthletes.size === 0) return runners
    return runners.filter(r => selectedAthletes.has(r.id))
  }, [runners, selectedAthletes])

  if (visibleRunners.length === 0) {
    return (
      <Card className="border-warning-200 bg-warning-50">
        <CardBody className="text-center py-12">
          <div className="text-warning-600 mb-4">No athletes found</div>
          <p className="text-sm text-foreground/60">
            Connect with athletes to start viewing their weekly progress.
          </p>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {visibleRunners.map((athlete: User) => {
        const athleteWorkouts = weeklyWorkouts.filter(workout => {
          const workoutUserId = (workout as Workout & { user_id?: string }).user_id
          return workoutUserId === athlete.id
        })

        return (
          <AthleteWeeklySection
            key={athlete.id}
            athlete={athlete}
            workouts={athleteWorkouts}
            weekStart={currentWeek}
            coach={coach}
          />
        )
      })}
    </div>
  )
}

function RunnerMetrics({
  selectedAthletes,
  workouts,
  loading,
}: {
  selectedAthletes: Set<string>
  workouts: Workout[]
  loading: boolean
}) {
  const runners = useAtomValue(connectedRunnersAtom)
  const athletes = useMemo(() => {
    if (selectedAthletes.size === 0) return runners
    return runners.filter(r => selectedAthletes.has(r.id))
  }, [runners, selectedAthletes])

  return <WeeklyMetrics workouts={workouts} athletes={athletes} loading={loading} />
}
