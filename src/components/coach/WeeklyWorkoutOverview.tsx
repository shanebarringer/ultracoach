'use client'

import { Button, Card, CardBody, CardHeader, Select, SelectItem, Spinner } from '@heroui/react'
import { useAtomValue } from 'jotai'
import { loadable } from 'jotai/utils'
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon, FilterIcon, UsersIcon } from 'lucide-react'

import { useEffect, useMemo, useState } from 'react'

import { connectedRunnersAtom } from '@/lib/atoms'
import type { User } from '@/lib/better-auth'
import { createLogger } from '@/lib/logger'
import type { Workout } from '@/lib/supabase'

import AthleteWeeklySection from './AthleteWeeklySection'
import WeeklyMetrics from './WeeklyMetrics'

const logger = createLogger('WeeklyWorkoutOverview')

// Create loadable atom for better UX
const connectedRunnersLoadableAtom = loadable(connectedRunnersAtom)

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

export default function WeeklyWorkoutOverview({
  coach,
  currentWeek,
  onWeekChange,
}: WeeklyWorkoutOverviewProps) {
  const runnersLoadable = useAtomValue(connectedRunnersLoadableAtom)
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set())
  const [weeklyWorkouts, setWeeklyWorkouts] = useState<Workout[]>([])
  const [workoutsLoading, setWorkoutsLoading] = useState(false)

  // Handle loading and error states from Jotai loadable
  const runnersLoading = runnersLoadable.state === 'loading'
  const runnersError = runnersLoadable.state === 'hasError' ? runnersLoadable.error : null

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
          credentials: 'include',
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

  // Memoize runners data to prevent unnecessary re-renders
  const runnersData = useMemo(() => {
    return runnersLoadable.state === 'hasData' ? runnersLoadable.data : []
  }, [runnersLoadable])

  // Filter athletes based on selection
  const filteredRunners = useMemo(() => {
    if (selectedAthletes.size === 0) {
      return runnersData
    }
    return runnersData.filter((runner: User) => selectedAthletes.has(runner.id))
  }, [runnersData, selectedAthletes])

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
      totalAthletes: runnersData.length,
    })
  }

  if (runnersError) {
    return (
      <Card className="border-danger-200 bg-danger-50">
        <CardBody className="text-center py-12">
          <div className="text-danger-600 mb-4">Failed to load athletes</div>
          <Button color="primary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Week Navigation and Filters */}
      <Card className="bg-linear-to-br from-warning/10 to-primary/10 border-t-4 border-t-warning">
        <CardHeader>
          <div className="flex items-center justify-between w-full flex-wrap gap-4">
            {/* Week Navigation */}
            <div className="flex items-center gap-3">
              <ClockIcon className="w-6 h-6 text-warning" />
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Training Week: {formatWeekRange(currentWeek)}
                </h2>
                <p className="text-foreground/70 text-sm">Strategic expedition planning</p>
              </div>
            </div>

            {/* Week Navigation Controls */}
            <div className="flex items-center gap-2">
              <Button
                isIconOnly
                variant="ghost"
                size="sm"
                onClick={() => navigateWeek('prev')}
                className="text-foreground/70 hover:text-foreground hover:bg-warning/20"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </Button>

              <Button
                variant="flat"
                size="sm"
                onClick={goToCurrentWeek}
                className="bg-warning/20 text-warning hover:bg-warning/30"
              >
                Current Week
              </Button>

              <Button
                isIconOnly
                variant="ghost"
                size="sm"
                onClick={() => navigateWeek('next')}
                className="text-foreground/70 hover:text-foreground hover:bg-warning/20"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Athlete Filter */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <FilterIcon className="w-4 h-4 text-foreground/70" />
              <span className="text-sm font-medium text-foreground/70">Filter Athletes:</span>
            </div>

            <Select
              placeholder="All Athletes"
              variant="bordered"
              selectionMode="multiple"
              className="max-w-xs"
              selectedKeys={selectedAthletes}
              onSelectionChange={handleAthleteSelection}
              isLoading={runnersLoading}
              startContent={<UsersIcon className="w-4 h-4" />}
            >
              {runnersData.map((runner: User) => (
                <SelectItem key={runner.id}>{runner.name || runner.email}</SelectItem>
              ))}
            </Select>

            <div className="text-sm text-foreground/60">
              {selectedAthletes.size === 0
                ? `Showing all ${runnersData.length} athletes`
                : `Showing ${selectedAthletes.size} of ${runnersData.length} athletes`}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Weekly Metrics Summary */}
      <WeeklyMetrics
        workouts={filteredWorkouts}
        athletes={filteredRunners}
        loading={workoutsLoading}
      />

      {/* Athletes Weekly Sections */}
      {workoutsLoading ? (
        <Card>
          <CardBody className="flex justify-center items-center py-12">
            <Spinner size="lg" color="primary" label="Loading weekly workout data..." />
          </CardBody>
        </Card>
      ) : filteredRunners.length === 0 ? (
        <Card className="border-warning-200 bg-warning-50">
          <CardBody className="text-center py-12">
            <div className="text-warning-600 mb-4">
              {runnersLoading ? 'Loading athletes...' : 'No athletes found'}
            </div>
            {!runnersLoading && (
              <p className="text-sm text-foreground/60">
                Connect with athletes to start viewing their weekly progress.
              </p>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredRunners.map((athlete: User) => {
            // Filter workouts for this specific athlete
            const athleteWorkouts = filteredWorkouts.filter(workout => {
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
      )}
    </div>
  )
}
