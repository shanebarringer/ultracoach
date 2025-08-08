'use client'

import { Button, Card, CardBody, Input, Select, SelectItem } from '@heroui/react'
import { useAtom } from 'jotai'
import { Calendar, Filter, Search, SortAsc, SortDesc } from 'lucide-react'

import { memo, useMemo } from 'react'

import {
  filteredWorkoutsAtom,
  workoutSearchTermAtom,
  workoutSortByAtom,
  workoutStatusFilterAtom,
  workoutTypeFilterAtom,
} from '@/lib/atoms'
import type { Workout } from '@/lib/supabase'

import EnhancedWorkoutCard from './EnhancedWorkoutCard'

interface EnhancedWorkoutsListProps {
  userRole: 'runner' | 'coach'
  onEditWorkout?: (workout: Workout) => void
  onLogWorkout?: (workout: Workout) => void
  variant?: 'default' | 'compact' | 'detailed'
}

type SortOption = 'date-desc' | 'date-asc' | 'type' | 'status' | 'distance'

const EnhancedWorkoutsList = memo(
  ({ userRole, onEditWorkout, onLogWorkout, variant = 'default' }: EnhancedWorkoutsListProps) => {
    const [workouts] = useAtom(filteredWorkoutsAtom)

    // Centralized filtering and sorting state using atoms
    const [searchTerm, setSearchTerm] = useAtom(workoutSearchTermAtom)
    const [sortBy, setSortBy] = useAtom(workoutSortByAtom)
    const [typeFilter, setTypeFilter] = useAtom(workoutTypeFilterAtom)
    const [statusFilter, setStatusFilter] = useAtom(workoutStatusFilterAtom)
    // Note: viewMode functionality removed for simplicity - could be added back later

    // Filter and sort workouts
    const processedWorkouts = useMemo(() => {
      let filtered = workouts

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        filtered = filtered.filter(
          workout =>
            (workout.planned_type || '').toLowerCase().includes(searchLower) ||
            (workout.workout_notes || '').toLowerCase().includes(searchLower)
        )
      }

      // Apply type filter
      if (typeFilter !== 'all') {
        filtered = filtered.filter(workout => workout.planned_type === typeFilter)
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(workout => (workout.status || 'planned') === statusFilter)
      }

      // Apply sorting
      const sorted = [...filtered].sort((a, b) => {
        switch (sortBy) {
          case 'date-desc':
            return new Date(b.date || '').getTime() - new Date(a.date || '').getTime()
          case 'date-asc':
            return new Date(a.date || '').getTime() - new Date(b.date || '').getTime()
          case 'type':
            return (a.planned_type || '').localeCompare(b.planned_type || '')
          case 'status':
            return (a.status || 'planned').localeCompare(b.status || 'planned')
          case 'distance':
            const aDistance = a.actual_distance || a.planned_distance || 0
            const bDistance = b.actual_distance || b.planned_distance || 0
            return bDistance - aDistance
          default:
            return 0
        }
      })

      return sorted
    }, [workouts, searchTerm, sortBy, typeFilter, statusFilter])

    // Clear all filters
    const clearFilters = () => {
      setSearchTerm('')
      setTypeFilter('all')
      setStatusFilter('all')
      setSortBy('date-desc')
    }

    const hasActiveFilters =
      searchTerm || typeFilter !== 'all' || statusFilter !== 'all' || sortBy !== 'date-desc'

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
        {/* Enhanced Filters and Search */}
        <Card>
          <CardBody className="space-y-4">
            {/* Search Bar */}
            <Input
              placeholder="Search workouts by type or notes..."
              value={searchTerm}
              onValueChange={setSearchTerm}
              startContent={<Search className="h-4 w-4 text-foreground-400" />}
              isClearable
              className="w-full"
            />

            {/* Filter Controls */}
            <div className="flex flex-wrap gap-3">
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
                  <div className="flex items-center gap-2">
                    <SortDesc className="h-4 w-4" />
                    Latest First
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

              {hasActiveFilters && (
                <Button
                  variant="flat"
                  size="sm"
                  onPress={clearFilters}
                  startContent={<Filter className="h-4 w-4" />}
                >
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Results Summary */}
            <div className="flex justify-between items-center text-sm text-foreground-600">
              <span>
                Showing {processedWorkouts.length} of {workouts.length} workouts
              </span>
              {hasActiveFilters && <span className="text-primary">Filters active</span>}
            </div>
          </CardBody>
        </Card>

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
          <div className={`grid ${gridColumns} gap-6`}>
            {processedWorkouts.map(workout => (
              <EnhancedWorkoutCard
                key={workout.id}
                workoutId={workout.id}
                userRole={userRole}
                onEdit={onEditWorkout}
                onLog={onLogWorkout}
                variant={variant}
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
