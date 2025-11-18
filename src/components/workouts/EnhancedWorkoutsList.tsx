'use client'

import { Button, Card, CardBody, Chip, Input, Select, SelectItem, Switch } from '@heroui/react'
import { endOfDay, isSameDay, isWithinInterval, startOfDay } from 'date-fns'
import { useAtom, useAtomValue } from 'jotai'
import { Calendar, Grid3X3, List, Search, SortAsc, SortDesc, X } from 'lucide-react'

import { memo, useEffect, useMemo, useState } from 'react'

import { useSearchParams } from 'next/navigation'

import {
  filteredWorkoutsAtom,
  workoutQuickFilterAtom,
  workoutSearchTermAtom,
  workoutShowAdvancedFiltersAtom,
  workoutSortByAtom,
  workoutStatusFilterAtom,
  workoutTypeFilterAtom,
  workoutViewModeAtom,
} from '@/lib/atoms/index'
import type { Workout } from '@/lib/supabase'
import { getWeekRange, parseWorkoutDate, toLocalYMD } from '@/lib/utils/date'

import EnhancedWorkoutCard from './EnhancedWorkoutCard'

interface EnhancedWorkoutsListProps {
  userRole: 'runner' | 'coach'
  onEditWorkout?: (workout: Workout) => void
  onLogWorkout?: (workout: Workout) => void
  variant?: 'default' | 'compact' | 'detailed'
}

type QuickFilter = 'all' | 'today' | 'this-week' | 'completed' | 'planned'

type SortOption = 'date-desc' | 'date-asc' | 'type' | 'status' | 'distance'

const EnhancedWorkoutsList = memo(
  ({ userRole, onEditWorkout, onLogWorkout, variant = 'default' }: EnhancedWorkoutsListProps) => {
    const workouts = useAtomValue(filteredWorkoutsAtom)
    const searchParams = useSearchParams()

    // Centralized filtering and sorting state using atoms
    const [searchTerm, setSearchTerm] = useAtom(workoutSearchTermAtom)
    const [sortBy, setSortBy] = useAtom(workoutSortByAtom)
    const [typeFilter, setTypeFilter] = useAtom(workoutTypeFilterAtom)
    const [statusFilter, setStatusFilter] = useAtom(workoutStatusFilterAtom)
    const [viewMode, setViewMode] = useAtom(workoutViewModeAtom)
    const [quickFilter, setQuickFilter] = useAtom(workoutQuickFilterAtom)
    const [showAdvancedFilters, setShowAdvancedFilters] = useAtom(workoutShowAdvancedFiltersAtom)

    // Handle URL query parameters from k-bar commands
    useEffect(() => {
      const filter = searchParams.get('filter')
      const status = searchParams.get('status')
      const timeframe = searchParams.get('timeframe')

      if (filter === 'today') {
        setQuickFilter('today')
      } else if (timeframe === 'this-week') {
        setQuickFilter('this-week')
      } else if (status === 'completed') {
        setStatusFilter('completed')
        setQuickFilter('completed')
      } else if (status === 'planned') {
        setStatusFilter('planned')
        setQuickFilter('planned')
      }
    }, [searchParams, setStatusFilter, setQuickFilter])

    // Recompute on local day change to keep "today/this-week" accurate
    const [dayKey, setDayKey] = useState(() => toLocalYMD(new Date()))

    useEffect(() => {
      let timeoutId: ReturnType<typeof setTimeout>

      const scheduleNextMidnight = () => {
        const now = new Date()
        const nextMidnight = new Date(now)
        nextMidnight.setHours(24, 0, 0, 0)
        const ms = nextMidnight.getTime() - now.getTime()

        timeoutId = setTimeout(() => {
          setDayKey(toLocalYMD(new Date()))
          scheduleNextMidnight() // Reschedule for the next day
        }, ms)
      }

      scheduleNextMidnight()

      return () => clearTimeout(timeoutId)
    }, [])
    // Filter and sort workouts
    const processedWorkouts = useMemo(() => {
      let filtered = workouts

      // Apply quick filter first
      if (quickFilter !== 'all') {
        const today = new Date()
        const { start: weekStart, end: weekEnd } = getWeekRange(0) // Sunday start

        switch (quickFilter) {
          case 'today':
            filtered = filtered.filter(workout => {
              const d = parseWorkoutDate(workout.date)
              return d ? isSameDay(d, today) : false
            })
            break
          case 'this-week':
            filtered = filtered.filter(workout => {
              const d = parseWorkoutDate(workout.date)
              return d ? isWithinInterval(d, { start: weekStart, end: weekEnd }) : false
            })
            break
          case 'completed':
            filtered = filtered.filter(workout => workout.status === 'completed')
            break
          case 'planned':
            filtered = filtered.filter(workout => (workout.status || 'planned') === 'planned')
            break
        }
      }

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        filtered = filtered.filter(
          workout =>
            (workout.planned_type || '').toLowerCase().includes(searchLower) ||
            (workout.workout_notes || '').toLowerCase().includes(searchLower)
        )
      }

      // Apply type filter (only if advanced filters are shown)
      if (showAdvancedFilters && typeFilter !== 'all') {
        filtered = filtered.filter(workout => workout.planned_type === typeFilter)
      }

      // Apply status filter (only if advanced filters are shown and no quick filter)
      if (showAdvancedFilters && quickFilter === 'all' && statusFilter !== 'all') {
        filtered = filtered.filter(workout => (workout.status || 'planned') === statusFilter)
      }

      // Pre-compute date boundaries for smart sort (calculated once per useMemo)
      const today = new Date()
      const todayStart = startOfDay(today).getTime()
      const todayEnd = endOfDay(today).getTime()
      const tomorrowEnd = endOfDay(new Date(today.getTime() + 24 * 60 * 60 * 1000)).getTime()

      // Categorize workouts helper (hoisted out of comparator)
      const getCategory = (dateTime: number): number => {
        if (dateTime >= todayStart && dateTime <= todayEnd) return 0 // Today
        if (dateTime > todayEnd && dateTime <= tomorrowEnd) return 1 // Tomorrow
        if (dateTime > tomorrowEnd) return 2 // Upcoming
        return 3 // Past
      }

      // Apply sorting with pre-computed timestamps for performance
      const withParsedDates = filtered.map(workout => ({
        workout,
        dateTime: (parseWorkoutDate(workout.date) || new Date(0)).getTime(),
        createdTime: (parseWorkoutDate(workout.created_at) || new Date(0)).getTime(),
      }))

      const sorted = withParsedDates
        .sort((a, b) => {
          switch (sortBy) {
            case 'date-desc': {
              // Smart sort: Today -> Tomorrow -> Upcoming -> Past
              const aCat = getCategory(a.dateTime)
              const bCat = getCategory(b.dateTime)

              // Sort by category first
              if (aCat !== bCat) return aCat - bCat

              // Within category, sort by date
              if (aCat === 3) {
                // Past workouts: most recent first
                const primary = b.dateTime - a.dateTime
                if (primary !== 0) return primary
              } else {
                // Today, Tomorrow, Upcoming: chronological order
                const primary = a.dateTime - b.dateTime
                if (primary !== 0) return primary
              }

              const secondary = b.createdTime - a.createdTime
              if (secondary !== 0) return secondary
              return (b.workout.id || '').localeCompare(a.workout.id || '')
            }
            case 'date-asc': {
              const primary = a.dateTime - b.dateTime
              if (primary !== 0) return primary
              const secondary = a.createdTime - b.createdTime
              if (secondary !== 0) return secondary
              // Final deterministic tie-breaker
              return (a.workout.id || '').localeCompare(b.workout.id || '')
            }
            case 'type': {
              const r = (a.workout.planned_type || '').localeCompare(b.workout.planned_type || '')
              if (r !== 0) return r
              const s = b.dateTime - a.dateTime || b.createdTime - a.createdTime
              if (s !== 0) return s
              return (a.workout.id || '').localeCompare(b.workout.id || '')
            }
            case 'status': {
              const r = (a.workout.status || 'planned').localeCompare(b.workout.status || 'planned')
              if (r !== 0) return r
              const s = b.dateTime - a.dateTime || b.createdTime - a.createdTime
              if (s !== 0) return s
              return (a.workout.id || '').localeCompare(b.workout.id || '')
            }
            case 'distance': {
              const rawA = a.workout.actual_distance ?? a.workout.planned_distance ?? 0
              const rawB = b.workout.actual_distance ?? b.workout.planned_distance ?? 0

              const aNum =
                typeof rawA === 'number' ? rawA : Number.isFinite(Number(rawA)) ? Number(rawA) : 0
              const bNum =
                typeof rawB === 'number' ? rawB : Number.isFinite(Number(rawB)) ? Number(rawB) : 0

              const r = bNum - aNum
              if (r !== 0) return r
              const s = b.dateTime - a.dateTime || b.createdTime - a.createdTime
              if (s !== 0) return s
              return (b.workout.id || '').localeCompare(a.workout.id || '')
            }
            default:
              return 0
          }
        })
        .map(({ workout }) => workout)

      return sorted
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      workouts,
      searchTerm,
      sortBy,
      typeFilter,
      statusFilter,
      quickFilter,
      showAdvancedFilters,
      dayKey, // Required for "today"/"this-week" filters to update on day boundary
    ])

    // Clear all filters
    const clearFilters = () => {
      setSearchTerm('')
      setTypeFilter('all')
      setStatusFilter('all')
      setSortBy('date-desc')
      setQuickFilter('all')
      setShowAdvancedFilters(false)
    }

    const hasActiveFilters = useMemo(() => {
      return (
        searchTerm ||
        quickFilter !== 'all' ||
        typeFilter !== 'all' ||
        statusFilter !== 'all' ||
        sortBy !== 'date-desc'
      )
    }, [searchTerm, quickFilter, typeFilter, statusFilter, sortBy])

    // Quick filter handlers
    const handleQuickFilter = (filter: QuickFilter) => {
      if (filter === quickFilter) {
        setQuickFilter('all')
        if (filter === 'completed' || filter === 'planned') {
          setStatusFilter('all')
        }
      } else {
        setQuickFilter(filter)
        if (filter === 'completed') {
          setStatusFilter('completed')
        } else if (filter === 'planned') {
          setStatusFilter('planned')
        } else {
          // For today/this-week, don't change status filter
          if (showAdvancedFilters) {
            setStatusFilter('all')
          }
        }
      }
    }

    if (workouts.length === 0) {
      return (
        <Card className="py-12">
          <CardBody className="text-center">
            <Calendar className="mx-auto h-12 w-12 text-foreground-400 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No training sessions found
            </h3>
            <p className="text-foreground-600">
              {userRole === 'coach'
                ? 'Create workouts for your runners to get started.'
                : 'Your coach will create workouts for you.'}
            </p>
          </CardBody>
        </Card>
      )
    }

    const gridColumns =
      variant === 'compact'
        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'

    return (
      <div className="space-y-6">
        {/* Streamlined Toolbar */}
        <div className="bg-content1 rounded-xl border border-divider p-4 space-y-4">
          {/* Top Row: Search and View Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            {/* Search Bar */}
            <div className="flex-1">
              <Input
                placeholder="Search workouts by type or notes..."
                value={searchTerm}
                onValueChange={setSearchTerm}
                startContent={<Search className="h-4 w-4 text-foreground-400" />}
                isClearable
                variant="bordered"
                className="w-full"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <Button
                isIconOnly
                variant={viewMode === 'grid' ? 'solid' : 'light'}
                color={viewMode === 'grid' ? 'primary' : 'default'}
                size="sm"
                onPress={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                isIconOnly
                variant={viewMode === 'list' ? 'solid' : 'light'}
                color={viewMode === 'list' ? 'primary' : 'default'}
                size="sm"
                onPress={() => setViewMode('list')}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex flex-wrap gap-2">
            <Chip
              variant={quickFilter === 'today' ? 'solid' : 'bordered'}
              color={quickFilter === 'today' ? 'primary' : 'default'}
              className="cursor-pointer transition-all hover:scale-105"
              onClick={() => handleQuickFilter('today')}
            >
              Today
            </Chip>
            <Chip
              variant={quickFilter === 'this-week' ? 'solid' : 'bordered'}
              color={quickFilter === 'this-week' ? 'primary' : 'default'}
              className="cursor-pointer transition-all hover:scale-105"
              onClick={() => handleQuickFilter('this-week')}
            >
              This Week
            </Chip>
            <Chip
              variant={quickFilter === 'completed' ? 'solid' : 'bordered'}
              color={quickFilter === 'completed' ? 'success' : 'default'}
              className="cursor-pointer transition-all hover:scale-105"
              onClick={() => handleQuickFilter('completed')}
            >
              Completed
            </Chip>
            <Chip
              variant={quickFilter === 'planned' ? 'solid' : 'bordered'}
              color={quickFilter === 'planned' ? 'warning' : 'default'}
              className="cursor-pointer transition-all hover:scale-105"
              onClick={() => handleQuickFilter('planned')}
            >
              Planned
            </Chip>

            {/* Advanced Filters Toggle */}
            <div className="flex items-center gap-2 ml-auto">
              <Switch
                size="sm"
                isSelected={showAdvancedFilters}
                onValueChange={setShowAdvancedFilters}
                color="primary"
              >
                <span className="text-sm text-foreground-600">Advanced</span>
              </Switch>
            </div>
          </div>

          {/* Advanced Filters (Collapsible) */}
          {showAdvancedFilters && (
            <div className="flex flex-wrap gap-3 pt-2 border-t border-divider">
              <Select
                placeholder="Workout Type"
                selectedKeys={typeFilter === 'all' ? [] : [typeFilter]}
                onSelectionChange={keys => setTypeFilter((Array.from(keys)[0] as string) || 'all')}
                className="min-w-[150px]"
              >
                <SelectItem key="all">All Types</SelectItem>
                <SelectItem key="Long Run">Long Run</SelectItem>
                <SelectItem key="Easy Run">Easy Run</SelectItem>
                <SelectItem key="Tempo Run">Tempo Run</SelectItem>
                <SelectItem key="Interval Training">Interval Training</SelectItem>
                <SelectItem key="Recovery Run">Recovery Run</SelectItem>
                <SelectItem key="Cross Training">Cross Training</SelectItem>
                <SelectItem key="Rest">Rest</SelectItem>
              </Select>

              <Select
                placeholder="Status"
                selectedKeys={statusFilter === 'all' ? [] : [statusFilter]}
                onSelectionChange={keys =>
                  setStatusFilter((Array.from(keys)[0] as string) || 'all')
                }
                className="min-w-[120px]"
              >
                <SelectItem key="all">All Status</SelectItem>
                <SelectItem key="planned">Planned</SelectItem>
                <SelectItem key="completed">Completed</SelectItem>
                <SelectItem key="skipped">Skipped</SelectItem>
              </Select>

              <Select
                placeholder="Sort By"
                selectedKeys={[sortBy]}
                onSelectionChange={keys => setSortBy(Array.from(keys)[0] as SortOption)}
                className="min-w-[130px]"
              >
                <SelectItem key="date-desc">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <SortDesc className="h-4 w-4" />
                      Smart Sort
                    </div>
                    <span className="text-xs text-foreground-500 ml-6">
                      Today → Tomorrow → Upcoming → Past
                    </span>
                  </div>
                </SelectItem>
                <SelectItem key="date-asc">
                  <div className="flex items-center gap-2">
                    <SortAsc className="h-4 w-4" />
                    Oldest First
                  </div>
                </SelectItem>
                <SelectItem key="type">Type</SelectItem>
                <SelectItem key="status">Status</SelectItem>
                <SelectItem key="distance">Distance</SelectItem>
              </Select>
            </div>
          )}

          {/* Status Bar */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-foreground-600">
              Showing {processedWorkouts.length} of {workouts.length} workouts
            </span>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <>
                  <Chip size="sm" color="primary" variant="dot" className="text-xs">
                    Filters active
                  </Chip>
                  <Button
                    variant="light"
                    size="sm"
                    onPress={clearFilters}
                    startContent={<X className="h-3 w-3" />}
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Workouts Grid/List */}
        {processedWorkouts.length === 0 ? (
          <Card className="py-12">
            <CardBody className="text-center">
              <Search className="mx-auto h-12 w-12 text-foreground-400 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No workouts match your filters
              </h3>
              <p className="text-foreground-600 mb-4">
                Try adjusting your search or filter criteria.
              </p>
              <Button variant="flat" onPress={clearFilters}>
                Clear All Filters
              </Button>
            </CardBody>
          </Card>
        ) : (
          <div
            className={viewMode === 'grid' ? `grid ${gridColumns} gap-6` : 'flex flex-col gap-4'}
          >
            {processedWorkouts.map(workout => (
              <EnhancedWorkoutCard
                key={workout.id}
                workoutId={workout.id}
                userRole={userRole}
                onEdit={onEditWorkout}
                onLog={onLogWorkout}
                variant={viewMode === 'list' ? 'compact' : variant}
              />
            ))}
          </div>
        )}
      </div>
    )
  }
)

EnhancedWorkoutsList.displayName = 'EnhancedWorkoutsList'

export default EnhancedWorkoutsList
