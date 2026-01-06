/**
 * Coach Dashboard state management atoms
 *
 * This module manages dashboard-specific state including athlete filtering,
 * view preferences, pagination, and derived metrics for athlete cards.
 *
 * @module atoms/dashboard
 */
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import type { RelationshipData } from '@/types/relationships'

import { relationshipsAtom } from './relationships'
import { withDebugLabel } from './utils'
import { workoutsAtom } from './workouts'

// ============================================================================
// Dashboard State Atom (persisted to localStorage)
// ============================================================================

export type AthleteStatusFilter = 'all' | 'active' | 'pending' | 'needs-attention'
export type AthleteViewMode = 'grid' | 'list'

export interface CoachDashboardState {
  athleteSearchTerm: string
  athleteStatusFilter: AthleteStatusFilter
  athleteViewMode: AthleteViewMode
  athletesPerPage: number
  currentAthletePage: number
}

const defaultDashboardState: CoachDashboardState = {
  athleteSearchTerm: '',
  athleteStatusFilter: 'all',
  athleteViewMode: 'grid',
  athletesPerPage: 8,
  currentAthletePage: 1,
}

export const coachDashboardStateAtom = atomWithStorage<CoachDashboardState>(
  'coachDashboardState',
  defaultDashboardState
)

// ============================================================================
// Individual state atoms for granular updates
// ============================================================================

export const athleteSearchTermAtom = atom(
  get => get(coachDashboardStateAtom).athleteSearchTerm,
  (get, set, newValue: string) => {
    const current = get(coachDashboardStateAtom)
    set(coachDashboardStateAtom, {
      ...current,
      athleteSearchTerm: newValue,
      currentAthletePage: 1, // Reset to page 1 on search
    })
  }
)

export const athleteStatusFilterAtom = atom(
  get => get(coachDashboardStateAtom).athleteStatusFilter,
  (get, set, newValue: AthleteStatusFilter) => {
    const current = get(coachDashboardStateAtom)
    set(coachDashboardStateAtom, {
      ...current,
      athleteStatusFilter: newValue,
      currentAthletePage: 1, // Reset to page 1 on filter change
    })
  }
)

export const athleteViewModeAtom = atom(
  get => get(coachDashboardStateAtom).athleteViewMode,
  (get, set, newValue: AthleteViewMode) => {
    const current = get(coachDashboardStateAtom)
    set(coachDashboardStateAtom, { ...current, athleteViewMode: newValue })
  }
)

export const athleteCurrentPageAtom = atom(
  get => get(coachDashboardStateAtom).currentAthletePage,
  (get, set, newValue: number) => {
    const current = get(coachDashboardStateAtom)
    set(coachDashboardStateAtom, { ...current, currentAthletePage: newValue })
  }
)

// ============================================================================
// Athlete Metrics Types
// ============================================================================

export interface AthleteMetrics {
  weeklyMileage: number
  completionRate: number
  trend: number // percentage change from previous week
  totalWorkoutsThisWeek: number
  completedWorkoutsThisWeek: number
  lastActivityDate: string | null
  daysSinceLastActivity: number | null
  needsAttention: boolean
}

export interface AthleteWithMetrics {
  relationship: RelationshipData
  metrics: AthleteMetrics
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Week boundary dates for metric calculations.
 * Memoized at module level to avoid recalculating for each athlete.
 */
interface WeekBoundaries {
  now: Date
  startOfWeek: Date
  startOfLastWeek: Date
  timestamp: number
}

let cachedBoundaries: WeekBoundaries | null = null
const CACHE_TTL_MS = 60000 // 1 minute cache

function getWeekBoundaries(): WeekBoundaries {
  const now = Date.now()
  if (cachedBoundaries && now - cachedBoundaries.timestamp < CACHE_TTL_MS) {
    return cachedBoundaries
  }

  const nowDate = new Date()
  const startOfWeek = new Date(nowDate)
  startOfWeek.setDate(nowDate.getDate() - nowDate.getDay()) // Start of current week (Sunday)
  startOfWeek.setHours(0, 0, 0, 0)

  const startOfLastWeek = new Date(startOfWeek)
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)

  cachedBoundaries = {
    now: nowDate,
    startOfWeek,
    startOfLastWeek,
    timestamp: now,
  }

  return cachedBoundaries
}

/**
 * Calculate athlete metrics based on their workout data
 */
function calculateAthleteMetrics(
  athleteId: string,
  workouts: Array<{
    id: string
    user_id: string
    status: string
    date: string
    distance?: number | null
    actual_distance?: number | null
  }>
): AthleteMetrics {
  const { now, startOfWeek, startOfLastWeek } = getWeekBoundaries()

  // Filter workouts for this athlete
  const athleteWorkouts = workouts.filter(w => w.user_id === athleteId)

  // This week's workouts
  const thisWeekWorkouts = athleteWorkouts.filter(w => {
    const workoutDate = new Date(w.date)
    return workoutDate >= startOfWeek && workoutDate <= now
  })

  // Last week's workouts (for trend calculation)
  const lastWeekWorkouts = athleteWorkouts.filter(w => {
    const workoutDate = new Date(w.date)
    return workoutDate >= startOfLastWeek && workoutDate < startOfWeek
  })

  // Calculate metrics
  const completedThisWeek = thisWeekWorkouts.filter(w => w.status === 'completed')
  const completedLastWeek = lastWeekWorkouts.filter(w => w.status === 'completed')

  const weeklyMileage = completedThisWeek.reduce((sum, w) => {
    return sum + (w.actual_distance || w.distance || 0)
  }, 0)

  const lastWeekMileage = completedLastWeek.reduce((sum, w) => {
    return sum + (w.actual_distance || w.distance || 0)
  }, 0)

  const completionRate =
    thisWeekWorkouts.length > 0
      ? Math.round((completedThisWeek.length / thisWeekWorkouts.length) * 100)
      : 0

  // Calculate trend (percentage change from last week)
  let trend = 0
  if (lastWeekMileage > 0) {
    trend = Math.round(((weeklyMileage - lastWeekMileage) / lastWeekMileage) * 100)
  } else if (weeklyMileage > 0) {
    trend = 100 // First week with mileage
  }

  // Find last activity date
  const completedWorkouts = athleteWorkouts
    .filter(w => w.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const lastActivityDate = completedWorkouts[0]?.date || null

  // Calculate days since last activity
  let daysSinceLastActivity: number | null = null
  if (lastActivityDate) {
    const lastDate = new Date(lastActivityDate)
    const diffTime = now.getTime() - lastDate.getTime()
    daysSinceLastActivity = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  }

  // Needs attention if no activity in 7+ days
  const needsAttention = daysSinceLastActivity === null || daysSinceLastActivity >= 7

  return {
    weeklyMileage,
    completionRate,
    trend,
    totalWorkoutsThisWeek: thisWeekWorkouts.length,
    completedWorkoutsThisWeek: completedThisWeek.length,
    lastActivityDate,
    daysSinceLastActivity,
    needsAttention,
  }
}

// ============================================================================
// Derived Atoms
// ============================================================================

/**
 * Athletes with calculated metrics
 * Combines relationship data with workout metrics for each athlete
 */
export const athletesWithMetricsAtom = atom(get => {
  const relationships = get(relationshipsAtom)
  const workouts = get(workoutsAtom)

  // Filter to only runner relationships (athletes the coach is working with)
  const athletes = relationships.filter(r => r.other_party.role === 'runner')

  return athletes.map(relationship => ({
    relationship,
    metrics: calculateAthleteMetrics(relationship.other_party.id, workouts),
  }))
})

/**
 * Athletes needing attention (no activity in 7+ days)
 */
export const athletesNeedingAttentionAtom = atom(get => {
  const athletesWithMetrics = get(athletesWithMetricsAtom)
  return athletesWithMetrics.filter(a => a.metrics.needsAttention)
})

/**
 * Filtered athletes based on search and status filter
 */
export const filteredAthletesAtom = atom(get => {
  const athletesWithMetrics = get(athletesWithMetricsAtom)
  const searchTerm = get(athleteSearchTermAtom).toLowerCase().trim()
  const statusFilter = get(athleteStatusFilterAtom)

  let filtered = athletesWithMetrics

  // Apply search filter
  if (searchTerm) {
    filtered = filtered.filter(a => {
      const name = a.relationship.other_party.name?.toLowerCase() || ''
      const fullName = a.relationship.other_party.full_name?.toLowerCase() || ''
      const email = a.relationship.other_party.email?.toLowerCase() || ''
      return (
        name.includes(searchTerm) || fullName.includes(searchTerm) || email.includes(searchTerm)
      )
    })
  }

  // Apply status filter
  switch (statusFilter) {
    case 'active':
      filtered = filtered.filter(a => a.relationship.status === 'active')
      break
    case 'pending':
      filtered = filtered.filter(a => a.relationship.status === 'pending')
      break
    case 'needs-attention':
      filtered = filtered.filter(a => a.metrics.needsAttention)
      break
    // 'all' - no additional filtering
  }

  return filtered
})

/**
 * Paginated athletes for current page
 */
export const paginatedAthletesAtom = atom(get => {
  const filtered = get(filteredAthletesAtom)
  const state = get(coachDashboardStateAtom)
  const { currentAthletePage, athletesPerPage } = state

  const startIndex = (currentAthletePage - 1) * athletesPerPage
  const endIndex = startIndex + athletesPerPage

  return {
    athletes: filtered.slice(startIndex, endIndex),
    totalCount: filtered.length,
    totalPages: Math.ceil(filtered.length / athletesPerPage),
    currentPage: currentAthletePage,
    hasNextPage: endIndex < filtered.length,
    hasPreviousPage: currentAthletePage > 1,
  }
})

/**
 * Status counts for filter chips
 * Uses single-pass reduce instead of multiple filter calls for better performance
 */
export const athleteStatusCountsAtom = atom(get => {
  const athletesWithMetrics = get(athletesWithMetricsAtom)

  // Single pass through the array instead of 3 separate filters
  const counts = athletesWithMetrics.reduce(
    (acc, a) => {
      if (a.relationship.status === 'active') acc.active++
      if (a.relationship.status === 'pending') acc.pending++
      if (a.metrics.needsAttention) acc.needsAttention++
      return acc
    },
    { active: 0, pending: 0, needsAttention: 0 }
  )

  return {
    all: athletesWithMetrics.length,
    ...counts,
  }
})

/**
 * Team aggregate statistics
 */
export const teamStatsAtom = atom(get => {
  const athletesWithMetrics = get(athletesWithMetricsAtom)

  const totalAthletes = athletesWithMetrics.length
  const totalMileage = athletesWithMetrics.reduce((sum, a) => sum + a.metrics.weeklyMileage, 0)
  const avgCompletion =
    totalAthletes > 0
      ? Math.round(
          athletesWithMetrics.reduce((sum, a) => sum + a.metrics.completionRate, 0) / totalAthletes
        )
      : 0

  return {
    totalAthletes,
    totalMileage: Math.round(totalMileage * 10) / 10, // Round to 1 decimal
    avgCompletionRate: avgCompletion,
  }
})

// ============================================================================
// Debug Labels
// ============================================================================

withDebugLabel(coachDashboardStateAtom, 'dashboard/state')
withDebugLabel(athleteSearchTermAtom, 'dashboard/searchTerm')
withDebugLabel(athleteStatusFilterAtom, 'dashboard/statusFilter')
withDebugLabel(athleteViewModeAtom, 'dashboard/viewMode')
withDebugLabel(athleteCurrentPageAtom, 'dashboard/currentPage')
withDebugLabel(athletesWithMetricsAtom, 'dashboard/athletesWithMetrics')
withDebugLabel(athletesNeedingAttentionAtom, 'dashboard/athletesNeedingAttention')
withDebugLabel(filteredAthletesAtom, 'dashboard/filteredAthletes')
withDebugLabel(paginatedAthletesAtom, 'dashboard/paginatedAthletes')
withDebugLabel(athleteStatusCountsAtom, 'dashboard/statusCounts')
withDebugLabel(teamStatsAtom, 'dashboard/teamStats')
