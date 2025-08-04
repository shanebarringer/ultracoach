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
import { ClockIcon, MountainIcon, PlayIcon, RouteIcon, TargetIcon, ZapIcon } from 'lucide-react'

import { useCallback, useEffect, useState } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import type { User, Workout } from '@/lib/supabase'

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
  onWeekUpdate,
}: WeeklyPlannerCalendarProps) {
  const { data: session } = useSession()
  const [weekWorkouts, setWeekWorkouts] = useState<DayWorkout[]>([])
  const [existingWorkouts, setExistingWorkouts] = useState<Workout[]>([])
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

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

  // Fetch existing workouts for the week
  const fetchExistingWorkouts = useCallback(async () => {
    if (!session?.user?.id || !runner.id) return

    try {
      const startDate = weekStart.toISOString().split('T')[0]
      const endDate = new Date(weekStart)
      endDate.setDate(weekStart.getDate() + 6)
      const endDateStr = endDate.toISOString().split('T')[0]

      const response = await fetch(
        `/api/workouts?runnerId=${runner.id}&startDate=${startDate}&endDate=${endDateStr}`
      )

      if (response.ok) {
        const data = await response.json()
        setExistingWorkouts(data.workouts || [])
      }
    } catch (error) {
      console.error('Error fetching existing workouts:', error)
    }
  }, [session?.user?.id, runner.id, weekStart])

  // Initialize week days and fetch existing workouts
  useEffect(() => {
    const days = generateWeekDays(weekStart)
    setWeekWorkouts(days)
    setHasChanges(false)
    fetchExistingWorkouts()
  }, [weekStart]) // Remove generateWeekDays and fetchExistingWorkouts from dependencies since they're memoized with stable deps

  // Merge existing workouts with week structure
  useEffect(() => {
    // Debug log: print all workout dates and week days
    console.log(
      'existingWorkouts:',
      existingWorkouts.map(w => w.date)
    )
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
          const workoutIso =
            typeof w.date === 'string' ? w.date : new Date(w.date).toISOString().split('T')[0]
          return workoutIso === dayIso
        })
        if (existingWorkout) {
          console.log(`Matched workout for ${dayIso}:`, existingWorkout)
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
      return [...mappedDays].sort((a, b) => a.date.getTime() - b.date.getTime())
    })
  }, [existingWorkouts])

  const updateDayWorkout = (
    dayIndex: number,
    field: string,
    value: string | number | undefined
  ) => {
    setWeekWorkouts(prev => {
      const updated = [...prev]
      const day = updated[dayIndex]

      if (!day.workout) {
        day.workout = { type: 'Easy Run' }
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
      const plansResponse = await fetch(`/api/training-plans?runnerId=${runner.id}`)
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
      const response = await fetch('/api/workouts/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      // Show success message - using alert for now but should integrate with notification system
      alert(
        `⛰️ Successfully planned ${workoutsToCreate.length} summit ascents for ${runner.full_name}!`
      )

      // Refresh existing workouts
      fetchExistingWorkouts()
    } catch (error) {
      console.error('Error saving week plan:', error)
      alert(error instanceof Error ? error.message : 'Failed to save expedition plan')
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
    <Card className="bg-linear-to-br from-background to-secondary/5 border-l-4 border-l-primary shadow-xl">
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
              className="bg-linear-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70"
            >
              {saving ? 'Saving Expedition...' : 'Save Week Plan'}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardBody className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {weekWorkouts.map((day, index) => (
            <Card
              key={day.date.toISOString()}
              className={classNames(
                'transition-all duration-300 hover:shadow-lg hover:-translate-y-1',
                isToday(day.date)
                  ? 'ring-2 ring-primary bg-linear-to-br from-primary/10 to-secondary/10 border-l-4 border-l-primary'
                  : 'hover:bg-linear-to-br hover:from-secondary/5 hover:to-primary/5 border-l-4 border-l-transparent'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between w-full">
                  <div>
                    <h4
                      className={classNames(
                        'font-semibold text-sm',
                        isToday(day.date) ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {day.dayName}
                    </h4>
                    <p
                      className={classNames(
                        'text-xs',
                        isToday(day.date) ? 'text-primary/70' : 'text-foreground/70'
                      )}
                    >
                      {formatDate(day.date)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isToday(day.date) && (
                      <Chip size="sm" color="primary" variant="flat">
                        Today
                      </Chip>
                    )}
                    {/* Category Chip */}
                    <CategoryChip
                      category={day.workout?.category}
                      onSelect={catId => updateDayWorkout(index, 'category', catId)}
                    />
                    {/* Terrain Chip */}
                    <TerrainChip
                      terrain={day.workout?.terrain}
                      onSelect={terrain => updateDayWorkout(index, 'terrain', terrain)}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardBody className="space-y-6 pt-0 min-h-[540px] p-6">
                <Select
                  label="Workout Type"
                  classNames={{ label: 'mb-2 text-base font-semibold' }}
                  size="sm"
                  fullWidth
                  selectedKeys={day.workout?.type ? [day.workout.type] : []}
                  onSelectionChange={keys => {
                    const selectedType = Array.from(keys).join('')
                    updateDayWorkout(index, 'type', selectedType)
                  }}
                  placeholder="No workout"
                  items={WORKOUT_TYPES.map(type => ({ id: type, name: type }))}
                  className="text-xs"
                >
                  {item => <SelectItem key={item.id}>{item.name}</SelectItem>}
                </Select>

                {day.workout && day.workout.type && day.workout.type !== 'Rest Day' && (
                  <>
                    <Input
                      type="number"
                      label="Distance"
                      classNames={{ label: 'mb-2 text-base font-semibold' }}
                      size="sm"
                      fullWidth
                      step="0.1"
                      min="0"
                      value={day.workout.distance?.toString() || ''}
                      onChange={e => updateDayWorkout(index, 'distance', e.target.value)}
                      placeholder="5.5"
                      startContent={<RouteIcon className="w-3 h-3 text-default-400" />}
                      endContent={<span className="text-xs text-gray-500">mi</span>}
                    />

                    <Input
                      type="number"
                      label="Duration"
                      classNames={{ label: 'mb-2 text-base font-semibold' }}
                      size="sm"
                      fullWidth
                      min="0"
                      value={day.workout.duration?.toString() || ''}
                      onChange={e => updateDayWorkout(index, 'duration', e.target.value)}
                      placeholder="60"
                      startContent={<ClockIcon className="w-3 h-3 text-default-400" />}
                      endContent={<span className="text-xs text-gray-500">min</span>}
                    />

                    <Input
                      type="number"
                      label="Intensity"
                      classNames={{ label: 'mb-2 text-base font-semibold' }}
                      size="sm"
                      fullWidth
                      min="1"
                      max="10"
                      value={day.workout.intensity?.toString() || ''}
                      onChange={e => updateDayWorkout(index, 'intensity', e.target.value)}
                      placeholder="7"
                      startContent={<ZapIcon className="w-3 h-3 text-default-400" />}
                      endContent={<span className="text-xs text-gray-500">1-10</span>}
                    />

                    <Input
                      type="number"
                      label="Elevation"
                      classNames={{ label: 'mb-2 text-base font-semibold' }}
                      size="sm"
                      fullWidth
                      min="0"
                      value={day.workout.elevationGain?.toString() || ''}
                      onChange={e => updateDayWorkout(index, 'elevationGain', e.target.value)}
                      placeholder="500"
                      startContent={<MountainIcon className="w-3 h-3 text-default-400" />}
                      endContent={<span className="text-xs text-gray-500">ft</span>}
                    />

                    <Textarea
                      label="Training Notes"
                      classNames={{ label: 'mb-2 text-base font-semibold' }}
                      size="sm"
                      fullWidth
                      rows={2}
                      value={day.workout.notes || ''}
                      onChange={e => updateDayWorkout(index, 'notes', e.target.value)}
                      placeholder="Summit strategy & instructions..."
                      className="text-xs"
                    />

                    {/* Intensity Indicator */}
                    {day.workout.intensity && (
                      <div className="pt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-foreground/70">Intensity Zone:</span>
                          <Chip
                            size="sm"
                            color={getIntensityColor(day.workout.intensity)}
                            variant="flat"
                          >
                            {getIntensityLabel(day.workout.intensity)}
                          </Chip>
                        </div>
                        <div className="w-full bg-default-200 rounded-full h-1.5">
                          <div
                            className={classNames(
                              'h-1.5 rounded-full transition-all duration-300',
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

                {day.workout && (
                  <Button
                    variant="light"
                    color="danger"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => clearDayWorkout(index)}
                  >
                    Clear
                  </Button>
                )}
              </CardBody>
            </Card>
          ))}
        </div>

        {hasChanges && (
          <Card className="mt-6 bg-linear-to-r from-warning/10 to-primary/10 border-l-4 border-l-warning">
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
