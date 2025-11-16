'use client'

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectItem,
  Spinner,
  Textarea,
} from '@heroui/react'
import classNames from 'classnames'
import { useAtomValue, useSetAtom } from 'jotai'
import { MountainIcon, PlayIcon, RouteIcon, TargetIcon, ZapIcon } from 'lucide-react'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import { useHydrateWorkouts } from '@/hooks/useWorkouts'
import { refreshWorkoutsAtom, workoutsAtom } from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import type { User } from '@/lib/supabase'
import { commonToasts } from '@/lib/toast'

const logger = createLogger('WeeklyPlannerCalendar')

interface DayWorkout {
  date: Date
  dayName: string
  workout?: {
    type: string
    distance?: number
    duration?: number
    notes?: string
    category?:
      | 'easy'
      | 'tempo'
      | 'interval'
      | 'long_run'
      | 'race_simulation'
      | 'recovery'
      | 'strength'
      | 'cross_training'
      | 'rest'
    intensity?: number
    terrain?: 'road' | 'trail' | 'track' | 'treadmill'
    elevationGain?: number
  }
}

interface WeeklyPlannerCalendarProps {
  runner: User
  weekStart: Date
  readOnly?: boolean
  onWeekUpdate: () => void
}

const WORKOUT_TYPES = [
  'Rest Day',
  'Easy Run',
  'Long Run',
  'Tempo Run',
  'Interval Training',
  'Fartlek',
  'Hill Training',
  'Recovery Run',
  'Cross Training',
  'Strength Training',
]

const WORKOUT_CATEGORIES = [
  { id: 'easy', name: 'Easy', color: 'success' },
  { id: 'tempo', name: 'Tempo', color: 'warning' },
  { id: 'interval', name: 'Interval', color: 'danger' },
  { id: 'long_run', name: 'Long Run', color: 'primary' },
  { id: 'race_simulation', name: 'Race Simulation', color: 'secondary' },
  { id: 'recovery', name: 'Recovery', color: 'success' },
  { id: 'strength', name: 'Strength', color: 'default' },
  { id: 'cross_training', name: 'Cross Training', color: 'default' },
  { id: 'rest', name: 'Rest', color: 'default' },
]

// Terrain union type and metadata
export type TerrainType = 'road' | 'trail' | 'track' | 'treadmill'

export const TERRAIN_OPTIONS: Record<
  TerrainType,
  {
    label: string
    icon: React.ElementType
    color: 'primary' | 'success' | 'secondary' | 'warning' | 'danger' | 'default'
  }
> = {
  road: { label: 'Road', icon: RouteIcon, color: 'primary' },
  trail: { label: 'Trail', icon: MountainIcon, color: 'success' },
  track: { label: 'Track', icon: TargetIcon, color: 'secondary' },
  treadmill: { label: 'Treadmill', icon: PlayIcon, color: 'default' },
}

// Helper for Chip color type
const getChipColor = (
  color: string | undefined
): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' => {
  if (!color) return 'default'
  if (['default', 'primary', 'secondary', 'success', 'warning', 'danger'].includes(color)) {
    return color as 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  }
  return 'default'
}

// Helper for intensity color and label
function getIntensityColor(intensity: number): 'success' | 'primary' | 'warning' | 'danger' {
  if (intensity <= 3) return 'success'
  if (intensity <= 5) return 'primary'
  if (intensity <= 7) return 'warning'
  return 'danger'
}

function getIntensityLabel(intensity: number): string {
  if (intensity <= 3) return 'Easy'
  if (intensity <= 5) return 'Moderate'
  if (intensity <= 7) return 'Hard'
  return 'Maximum'
}

function CategoryChip({
  category,
  onSelect,
}: {
  category?: string
  onSelect: (
    catId:
      | 'easy'
      | 'tempo'
      | 'interval'
      | 'long_run'
      | 'race_simulation'
      | 'recovery'
      | 'strength'
      | 'cross_training'
      | 'rest'
      | undefined
  ) => void
}) {
  const current = WORKOUT_CATEGORIES.find(c => c.id === category)
  return (
    <Popover placement="bottom-start">
      <PopoverTrigger>
        <Chip
          size="sm"
          color={getChipColor(current?.color)}
          variant="flat"
          className="cursor-pointer"
        >
          {current ? current.name : 'Set Category'}
        </Chip>
      </PopoverTrigger>
      <PopoverContent className="p-2 min-w-[160px]">
        <div className="flex flex-col gap-2">
          {WORKOUT_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={classNames(
                'flex items-center gap-2 px-2 py-1 rounded-sm hover:bg-default-100 transition',
                category === cat.id ? 'ring-2 ring-primary' : ''
              )}
              onClick={() =>
                onSelect(
                  cat.id as
                    | 'easy'
                    | 'tempo'
                    | 'interval'
                    | 'long_run'
                    | 'race_simulation'
                    | 'recovery'
                    | 'strength'
                    | 'cross_training'
                    | 'rest'
                )
              }
              type="button"
            >
              <Chip size="sm" color={getChipColor(cat.color)} variant="flat">
                {cat.name}
              </Chip>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function TerrainChip({
  terrain,
  onSelect,
}: {
  terrain?: TerrainType
  onSelect: (terrain: TerrainType) => void
}) {
  const current = terrain ? TERRAIN_OPTIONS[terrain] : undefined
  return (
    <Popover placement="bottom-start">
      <PopoverTrigger>
        <Chip
          size="sm"
          color={current ? current.color : 'default'}
          variant="flat"
          className="cursor-pointer"
        >
          {current ? (
            <span className="flex items-center gap-1">
              <current.icon className="w-4 h-4" />
              {current.label}
            </span>
          ) : (
            'Set Terrain'
          )}
        </Chip>
      </PopoverTrigger>
      <PopoverContent className="p-2 min-w-[160px]">
        <div className="flex flex-col gap-2">
          {Object.entries(TERRAIN_OPTIONS)
            .filter(([key]) => typeof key === 'string')
            .map(([key, opt]) => (
              <button
                key={key}
                className={classNames(
                  'flex items-center gap-2 px-2 py-1 rounded-sm hover:bg-default-100 transition',
                  (typeof terrain === 'string' ? terrain : '') === key ? 'ring-2 ring-primary' : ''
                )}
                onClick={() => {
                  if (typeof key === 'string') onSelect(key as TerrainType)
                }}
                type="button"
              >
                <Chip size="sm" color={opt.color} variant="flat">
                  <opt.icon className="w-4 h-4" /> {opt.label}
                </Chip>
              </button>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Mapping from workout type to default category
const WORKOUT_TYPE_TO_CATEGORY: Record<string, string> = {
  'Easy Run': 'easy',
  'Long Run': 'long_run',
  'Tempo Run': 'tempo',
  'Interval Training': 'interval',
  Fartlek: 'interval',
  'Hill Training': 'interval',
  'Recovery Run': 'recovery',
  'Cross Training': 'cross_training',
  'Strength Training': 'strength',
  'Rest Day': 'rest',
}

export default function WeeklyPlannerCalendar({
  runner,
  weekStart,
  // readOnly = false,
  onWeekUpdate,
}: WeeklyPlannerCalendarProps) {
  // CRITICAL FIX (Phase 2): Call useHydrateWorkouts() BEFORE reading workoutsAtom
  // This ensures Suspense properly waits for workout data to load before rendering
  // Fixes race condition where workouts were empty on page refresh in production
  useHydrateWorkouts()

  logger.debug('WeeklyPlannerCalendar component rendered:', {
    runnerId: runner.id,
    runnerName: runner.full_name,
    weekStart: weekStart.toISOString(),
  })

  const { data: session } = useSession()
  const [weekWorkouts, setWeekWorkouts] = useState<DayWorkout[]>([])
  // Now safe to read - hydration is guaranteed to complete first
  const allWorkouts = useAtomValue(workoutsAtom)
  const refreshWorkouts = useSetAtom(refreshWorkoutsAtom)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({})

  // Filter workouts for this week and runner
  const existingWorkouts = useMemo(() => {
    const startDate = weekStart.toISOString().split('T')[0]
    const endDate = new Date(weekStart)
    endDate.setDate(weekStart.getDate() + 6)
    const endDateStr = endDate.toISOString().split('T')[0]

    return allWorkouts.filter(w => {
      const workoutDate = w.date.split('T')[0]
      return w.user_id === runner.id && workoutDate >= startDate && workoutDate <= endDateStr
    })
  }, [allWorkouts, runner.id, weekStart])

  // Generate the 7 days of the week, always starting from Monday
  const generateWeekDays = useCallback((startDate: Date): DayWorkout[] => {
    // Force startDate to Monday of the week
    const monday = new Date(startDate)
    const day = monday.getDay()
    // getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
    const diff = day === 0 ? -6 : 1 - day // if Sunday, go back 6 days; else, back to Monday
    monday.setDate(monday.getDate() + diff)

    const days: DayWorkout[] = []
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      days.push({
        date,
        dayName: dayNames[i],
      })
    }
    return days
  }, [])

  // Trigger refresh of workouts when component mounts or key props change
  useEffect(() => {
    if (session?.user?.id && runner.id) {
      logger.debug('Triggering workout refresh for week planner')
      refreshWorkouts()
    }
  }, [session?.user?.id, runner.id, refreshWorkouts])

  // Initialize week days
  useEffect(() => {
    logger.debug('useEffect triggered - initializing week days:', {
      weekStart: weekStart.toISOString(),
      hasSession: !!session?.user?.id,
      runnerId: runner.id,
    })

    const days = generateWeekDays(weekStart)
    setWeekWorkouts(days)
    setHasChanges(false)
  }, [weekStart, generateWeekDays, runner.id, session?.user?.id])

  // Merge existing workouts with week structure
  useEffect(() => {
    logger.debug('Merging existing workouts with week structure:', {
      existingWorkoutsCount: existingWorkouts.length,
      existingWorkouts: existingWorkouts.map(w => ({
        id: w.id,
        date: w.date,
        planned_type: w.planned_type,
        training_plan_id: w.training_plan_id,
      })),
      weekStart: weekStart.toISOString(),
      weekWorkoutsCount: weekWorkouts.length,
    })
    // Sort workouts by date ascending (ISO string)
    const sortedWorkouts = [...existingWorkouts].sort((a, b) => {
      const aDate =
        typeof a.date === 'string' ? a.date : new Date(a.date).toISOString().split('T')[0]
      const bDate =
        typeof b.date === 'string' ? b.date : new Date(b.date).toISOString().split('T')[0]
      return aDate.localeCompare(bDate)
    })
    // Map and then sort weekWorkouts by date
    const mapped = (prevDays: DayWorkout[]) =>
      prevDays.map(day => {
        const dayIso = day.date.toISOString().split('T')[0]
        const existingWorkout = sortedWorkouts.find(w => {
          // Handle both string and Date objects for workout dates
          const workoutDate = new Date(w.date).toISOString()
          const workoutIso = workoutDate.split('T')[0]

          logger.debug(
            `Comparing dates: day=${dayIso} vs workout=${workoutIso} (original: ${w.date})`
          )
          return workoutIso === dayIso
        })
        if (existingWorkout) {
          logger.debug(`Matched workout for ${dayIso}:`, existingWorkout)
        }
        if (existingWorkout) {
          return {
            ...day,
            workout: {
              type: existingWorkout.planned_type,
              distance: existingWorkout.planned_distance || undefined,
              duration: existingWorkout.planned_duration || undefined,
              notes: existingWorkout.workout_notes || undefined,
              category: existingWorkout.category || undefined,
              intensity: existingWorkout.intensity || undefined,
              terrain: existingWorkout.terrain || undefined,
              elevationGain: existingWorkout.elevation_gain || undefined,
            },
          }
        }
        return day
      })
    // Now sort mapped weekWorkouts by date
    setWeekWorkouts(prevDays => {
      const mappedDays = mapped(prevDays)
      const sortedDays = [...mappedDays].sort((a, b) => a.date.getTime() - b.date.getTime())

      logger.debug('Final weekWorkouts after merge:', {
        count: sortedDays.length,
        days: sortedDays.map(day => ({
          date: day.date.toISOString().split('T')[0],
          dayName: day.dayName,
          hasWorkout: !!day.workout,
          workoutType: day.workout?.type,
          workoutDistance: day.workout?.distance,
          workoutDuration: day.workout?.duration,
        })),
      })

      return sortedDays
    })
  }, [existingWorkouts, weekStart, weekWorkouts.length])

  const updateDayWorkout = (
    dayIndex: number,
    field: string,
    value: string | number | undefined
  ) => {
    setWeekWorkouts(prev => {
      const updated = [...prev]
      const originalDay = updated[dayIndex]

      // CRITICAL FIX: Create new day object AND new workout object to avoid mutation
      // React won't detect changes if we mutate the existing objects
      const day = {
        ...originalDay,
        workout: originalDay.workout ? { ...originalDay.workout } : { type: 'Easy Run' },
      }

      if (field === 'type') {
        day.workout.type = value as string
        // Set category to default for this type
        day.workout.category = WORKOUT_TYPE_TO_CATEGORY[value as string] as
          | 'easy'
          | 'tempo'
          | 'interval'
          | 'long_run'
          | 'race_simulation'
          | 'recovery'
          | 'strength'
          | 'cross_training'
          | 'rest'
          | undefined
        // Clear distance/duration for rest days
        if (value === 'Rest Day') {
          day.workout.distance = undefined
          day.workout.duration = undefined
          day.workout.category = 'rest'
          day.workout.intensity = undefined
        }
      } else if (field === 'category') {
        day.workout.category = value as
          | 'easy'
          | 'tempo'
          | 'interval'
          | 'long_run'
          | 'race_simulation'
          | 'recovery'
          | 'strength'
          | 'cross_training'
          | 'rest'
          | undefined
      } else if (field === 'distance') {
        day.workout.distance = value ? Number(value) : undefined
      } else if (field === 'duration') {
        day.workout.duration = value ? Number(value) : undefined
      } else if (field === 'notes') {
        day.workout.notes = value as string
      } else if (field === 'intensity') {
        day.workout.intensity = value ? Number(value) : undefined
      } else if (field === 'terrain') {
        if (typeof value === 'string') {
          day.workout.terrain = value as TerrainType
        }
      } else if (field === 'elevationGain') {
        day.workout.elevationGain = value ? Number(value) : undefined
      }

      // Replace with new day object so React detects the change
      updated[dayIndex] = day
      return updated
    })
    setHasChanges(true)
  }

  const clearDayWorkout = (dayIndex: number) => {
    setWeekWorkouts(prev => {
      const updated = [...prev]
      updated[dayIndex].workout = undefined
      return updated
    })
    setHasChanges(true)
  }

  const saveWeekPlan = async () => {
    if (!session?.user?.id || !runner.id) return

    setSaving(true)
    try {
      // Find the runner's training plan
      const baseUrl =
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'
      const plansResponse = await fetch(`${baseUrl}/api/training-plans?runnerId=${runner.id}`, {
        credentials: 'same-origin',
      })
      if (!plansResponse.ok) {
        throw new Error('Failed to find training plan')
      }

      const plansData = await plansResponse.json()
      const trainingPlan = plansData.trainingPlans?.[0]

      if (!trainingPlan) {
        throw new Error('No training plan found for this runner')
      }

      // Prepare workouts for bulk creation
      const workoutsToCreate = weekWorkouts
        .filter(day => day.workout && day.workout.type !== 'Rest Day')
        .map(day => ({
          trainingPlanId: trainingPlan.id,
          date: day.date.toISOString().split('T')[0],
          plannedType: day.workout!.type,
          plannedDistance: day.workout!.distance || null,
          plannedDuration: day.workout!.duration || null,
          notes: day.workout!.notes || '',
          category: day.workout!.category || null,
          intensity: day.workout!.intensity || null,
          terrain: day.workout!.terrain || null,
          elevationGain: day.workout!.elevationGain || null,
        }))

      // Bulk create workouts
      const response = await fetch(`${baseUrl}/api/workouts/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          workouts: workoutsToCreate,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save workouts')
      }

      setHasChanges(false)
      onWeekUpdate()

      // Show success toast with mountain theme
      commonToasts.workoutSaved()

      // Refresh existing workouts
      refreshWorkouts()
    } catch (error) {
      logger.error('Error saving week plan:', error)
      commonToasts.workoutError(
        error instanceof Error ? error.message : 'Failed to save expedition plan'
      )
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  return (
    <Card className="bg-background border-l-4 border-l-primary shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            <RouteIcon className="w-6 h-6 text-primary" />
            <div>
              <h3 className="text-xl font-semibold text-foreground">
                Weekly Summit Plan for {runner.full_name}
              </h3>
              <p className="text-foreground/70 text-sm">
                Strategic weekly training expedition - architect your ascent
              </p>
            </div>
          </div>

          {hasChanges && (
            <Button
              color="success"
              variant="solid"
              onClick={saveWeekPlan}
              disabled={saving}
              startContent={saving ? <Spinner size="sm" /> : <ZapIcon className="w-4 h-4" />}
              className="bg-success hover:bg-success/90"
            >
              {saving ? 'Saving Expedition...' : 'Save Week Plan'}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardBody className="p-6">
        {/* Horizontal Scrolling Container for Mobile */}
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-3 min-w-[700px] lg:min-w-0">
            {weekWorkouts.map((day, index) => {
              const isExpanded = expandedDays[index] || false
              const toggleExpanded = () => {
                setExpandedDays(prev => ({ ...prev, [index]: !isExpanded }))
              }

              return (
                <Card
                  key={day.date.toISOString()}
                  className={classNames(
                    'transition-all duration-300 hover:shadow-lg hover:-translate-y-1',
                    isToday(day.date)
                      ? 'ring-2 ring-primary bg-primary/10 border-l-4 border-l-primary'
                      : 'hover:bg-secondary/5 border-l-4 border-l-transparent',
                    isExpanded ? 'row-span-2' : ''
                  )}
                >
                  <CardHeader className="pb-2 px-3 pt-3">
                    <div className="flex flex-col w-full space-y-2">
                      {/* Day Header */}
                      <div className="text-center">
                        <h4
                          className={classNames(
                            'font-semibold text-xs',
                            isToday(day.date) ? 'text-primary' : 'text-foreground'
                          )}
                        >
                          {day.dayName.slice(0, 3)}
                        </h4>
                        <p
                          className={classNames(
                            'text-xs',
                            isToday(day.date) ? 'text-primary/70' : 'text-foreground/70'
                          )}
                        >
                          {formatDate(day.date)}
                        </p>
                        {isToday(day.date) && (
                          <Chip size="sm" color="primary" variant="flat" className="mt-1">
                            Today
                          </Chip>
                        )}
                      </div>

                      {/* Quick Category and Terrain */}
                      {day.workout && (
                        <div className="flex flex-col gap-1">
                          <CategoryChip
                            category={day.workout?.category}
                            onSelect={catId => updateDayWorkout(index, 'category', catId)}
                          />
                          <TerrainChip
                            terrain={day.workout?.terrain}
                            onSelect={terrain => updateDayWorkout(index, 'terrain', terrain)}
                          />
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardBody
                    className={classNames('px-3 pb-3 pt-1', isExpanded ? 'space-y-3' : 'space-y-2')}
                  >
                    {/* Compact Workout Type */}
                    <Select
                      label={isExpanded ? 'Workout Type' : 'Type'}
                      classNames={{ label: 'text-xs font-medium mb-1' }}
                      size="sm"
                      fullWidth
                      selectedKeys={day.workout?.type ? [day.workout.type] : []}
                      onSelectionChange={keys => {
                        const selectedType = Array.from(keys).join('')
                        updateDayWorkout(index, 'type', selectedType)
                      }}
                      placeholder="Rest"
                      items={WORKOUT_TYPES.map(type => ({ id: type, name: type }))}
                      className="text-xs"
                    >
                      {item => <SelectItem key={item.id}>{item.name}</SelectItem>}
                    </Select>

                    {/* Compact view - just essential fields */}
                    {day.workout && day.workout.type && day.workout.type !== 'Rest Day' && (
                      <>
                        {/* Essential fields - always visible */}
                        <div className="grid grid-cols-1 gap-2">
                          <Input
                            type="number"
                            label="Distance (mi)"
                            classNames={{ label: 'text-xs mb-1' }}
                            size="sm"
                            step="0.1"
                            min="0"
                            value={day.workout.distance?.toString() || ''}
                            onChange={e => updateDayWorkout(index, 'distance', e.target.value)}
                            placeholder="5.5"
                            className="text-xs"
                          />
                          <Input
                            type="number"
                            label="Duration (min)"
                            classNames={{ label: 'text-xs mb-1' }}
                            size="sm"
                            min="0"
                            value={day.workout.duration?.toString() || ''}
                            onChange={e => updateDayWorkout(index, 'duration', e.target.value)}
                            placeholder="60"
                            className="text-xs"
                          />
                        </div>

                        {/* Expandable section */}
                        {isExpanded && (
                          <>
                            <Input
                              type="number"
                              label="Intensity (1-10)"
                              classNames={{ label: 'text-xs mb-1' }}
                              size="sm"
                              min="1"
                              max="10"
                              value={day.workout.intensity?.toString() || ''}
                              onChange={e => updateDayWorkout(index, 'intensity', e.target.value)}
                              placeholder="7"
                              className="text-xs"
                            />

                            <Input
                              type="number"
                              label="Elevation (ft)"
                              classNames={{ label: 'text-xs mb-1' }}
                              size="sm"
                              min="0"
                              value={day.workout.elevationGain?.toString() || ''}
                              onChange={e =>
                                updateDayWorkout(index, 'elevationGain', e.target.value)
                              }
                              placeholder="500"
                              className="text-xs"
                            />

                            <Textarea
                              label="Notes"
                              classNames={{ label: 'text-xs mb-1' }}
                              size="sm"
                              rows={2}
                              value={day.workout.notes || ''}
                              onChange={e => updateDayWorkout(index, 'notes', e.target.value)}
                              placeholder="Training notes..."
                              className="text-xs"
                            />

                            {/* Intensity Indicator */}
                            {day.workout.intensity && (
                              <div className="pt-1">
                                <div className="flex items-center gap-1 mb-1">
                                  <span className="text-xs text-foreground/70">Zone:</span>
                                  <Chip
                                    size="sm"
                                    color={getIntensityColor(day.workout.intensity)}
                                    variant="flat"
                                    className="text-xs h-4"
                                  >
                                    {getIntensityLabel(day.workout.intensity)}
                                  </Chip>
                                </div>
                                <div className="w-full bg-default-200 rounded-full h-1">
                                  <div
                                    className={classNames(
                                      'h-1 rounded-full transition-all duration-300',
                                      day.workout.intensity <= 3
                                        ? 'bg-success'
                                        : day.workout.intensity <= 5
                                          ? 'bg-primary'
                                          : day.workout.intensity <= 7
                                            ? 'bg-warning'
                                            : 'bg-danger'
                                    )}
                                    style={{ width: `${day.workout.intensity * 10}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-1 pt-1">
                          <Button
                            variant="light"
                            color={isExpanded ? 'primary' : 'default'}
                            size="sm"
                            className="text-xs px-2 py-1 h-6 min-h-6 flex-1"
                            onClick={toggleExpanded}
                          >
                            {isExpanded ? 'Less' : 'More'}
                          </Button>
                          {isExpanded && (
                            <Button
                              variant="light"
                              color="danger"
                              size="sm"
                              className="text-xs px-2 py-1 h-6 min-h-6 flex-1"
                              onClick={() => clearDayWorkout(index)}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </CardBody>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Mobile Instructions */}
        <div className="lg:hidden mt-4">
          <div className="text-center text-sm text-foreground/60">
            💡 Swipe horizontally to view all days • Tap &quot;More&quot; for detailed editing
          </div>
        </div>

        {hasChanges && (
          <Card className="mt-6 bg-warning/10 border-l-4 border-l-warning">
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <ZapIcon className="w-5 h-5 text-warning shrink-0" />
                <div>
                  <p className="text-sm text-foreground font-medium">
                    Summit Plan Changes Detected
                  </p>
                  <p className="text-xs text-foreground/70">
                    Click &quot;Save Week Plan&quot; to commit your expedition strategy.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </CardBody>
    </Card>
  )
}
