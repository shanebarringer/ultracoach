// Derived atoms - computed values from other atoms
import { isSameDay, isWithinInterval } from 'date-fns'
import { atom } from 'jotai'

import { getWeekRange, parseWorkoutDate } from '@/lib/utils/date'

import { userAtom } from '../auth'
import { conversationsAtom, unreadMessagesCountAtom } from '../chat'
import { notificationsAtom } from '../notifications'
import { trainingPlansAtom } from '../training-plans'
import {
  workoutSearchTermAtom,
  workoutStatusFilterAtom,
  workoutTypeFilterAtom,
  workoutsAtom,
} from '../workouts'

// Filtered workouts based on search and filters
export const filteredWorkoutsAtom = atom(get => {
  const workouts = get(workoutsAtom)
  const searchTerm = get(workoutSearchTermAtom)
  const typeFilter = get(workoutTypeFilterAtom)
  const statusFilter = get(workoutStatusFilterAtom)

  return workouts.filter(workout => {
    const matchesSearch = searchTerm
      ? workout.planned_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workout.workout_notes?.toLowerCase().includes(searchTerm.toLowerCase())
      : true

    const matchesType = typeFilter === 'all' || workout.planned_type === typeFilter
    const matchesStatus = statusFilter === 'all' || workout.status === statusFilter

    return matchesSearch && matchesType && matchesStatus
  })
})

// Unread notifications count
export const unreadNotificationsAtom = atom(get => {
  const notifications = get(notificationsAtom)
  return notifications.filter(n => !n.read)
})

// Active training plans
export const activeTrainingPlansAtom = atom(get => {
  const plans = get(trainingPlansAtom)
  const today = new Date()

  return plans.filter(plan => {
    if (!plan.start_date) return false
    const startDate = new Date(plan.start_date)
    // Use target_race_date as end date if available, otherwise consider it active
    const endDate = plan.target_race_date ? new Date(plan.target_race_date) : null
    return startDate <= today && (!endDate || today <= endDate)
  })
})

// Total unread messages across all conversations
export const totalUnreadMessagesAtom = atom(get => {
  const unreadCounts = get(unreadMessagesCountAtom)
  return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0)
})

// Type guard for user object
function isUserWithId(user: unknown): user is { id: string } {
  return (
    typeof user === 'object' &&
    user !== null &&
    'id' in user &&
    typeof (user as { id: unknown }).id === 'string'
  )
}

// User's active conversations
export const activeConversationsAtom = atom(get => {
  const conversations = get(conversationsAtom)
  const user = get(userAtom)

  if (!user) return []

  // ConversationWithUser doesn't have participant1_id/participant2_id
  // It has sender and recipient properties
  return conversations.filter(conv => {
    if (!isUserWithId(user)) return false
    return conv.sender?.id === user.id || conv.recipient?.id === user.id
  })
})

// Today's workouts
export const todaysWorkoutsAtom = atom(get => {
  const workouts = get(workoutsAtom)
  const today = new Date()
  return workouts.filter(workout => {
    const d = parseWorkoutDate(workout.date)
    return d ? isSameDay(d, today) : false
  })
})

// This week's workouts
export const thisWeeksWorkoutsAtom = atom(get => {
  const workouts = get(workoutsAtom)
  const { start: weekStart, end: weekEnd } = getWeekRange(0) // Sunday start

  return workouts.filter(workout => {
    const d = parseWorkoutDate(workout.date)
    return d ? isWithinInterval(d, { start: weekStart, end: weekEnd }) : false
  })
})

// Workout completion rate
export const workoutCompletionRateAtom = atom(get => {
  const workouts = get(workoutsAtom)
  const completed = workouts.filter(w => w.status === 'completed').length
  const total = workouts.length

  return total > 0 ? (completed / total) * 100 : 0
})

// Helper to safely convert to number
const toNumber = (value: unknown): number => {
  const num = Number(value)
  return isNaN(num) ? 0 : num
}

// Workout statistics atom (for all filtered workouts)
export const workoutStatsAtom = atom(get => {
  const workouts = get(filteredWorkoutsAtom) || []

  const completed = workouts.filter(w => w.status === 'completed')
  const totalIntensity = workouts.reduce((sum, w) => sum + toNumber(w.intensity), 0)

  return {
    total: workouts.length,
    completed: completed.length,
    planned: workouts.filter(w => w.status === 'planned').length,
    skipped: workouts.filter(w => w.status === 'skipped').length,
    plannedDistance: workouts.reduce((sum, w) => sum + toNumber(w.planned_distance), 0),
    completedDistance: completed.reduce(
      (sum, w) => sum + toNumber(w.actual_distance || w.planned_distance),
      0
    ),
    avgIntensity: workouts.length > 0 ? totalIntensity / workouts.length : 0,
  }
})

// Weekly workout statistics atom (for this week's workouts only)
export const weeklyWorkoutStatsAtom = atom(get => {
  const workouts = get(thisWeeksWorkoutsAtom) || []

  const completed = workouts.filter(w => w.status === 'completed')
  const totalIntensity = workouts.reduce((sum, w) => sum + toNumber(w.intensity), 0)

  return {
    total: workouts.length,
    completed: completed.length,
    planned: workouts.filter(w => w.status === 'planned').length,
    skipped: workouts.filter(w => w.status === 'skipped').length,
    plannedDistance: workouts.reduce((sum, w) => sum + toNumber(w.planned_distance), 0),
    completedDistance: completed.reduce(
      (sum, w) => sum + toNumber(w.actual_distance || w.planned_distance),
      0
    ),
    avgIntensity: workouts.length > 0 ? totalIntensity / workouts.length : 0,
  }
})

// Filtered training plans atom
export const filteredTrainingPlansAtom = atom(get => {
  const plans = get(trainingPlansAtom)
  // Apply filters here as needed
  // For now, just return all plans
  return plans
})

// Jotai Devtools debug labels
filteredWorkoutsAtom.debugLabel = 'derived/filteredWorkouts'
unreadNotificationsAtom.debugLabel = 'derived/unreadNotifications'
activeTrainingPlansAtom.debugLabel = 'derived/activeTrainingPlans'
totalUnreadMessagesAtom.debugLabel = 'derived/totalUnreadMessages'
activeConversationsAtom.debugLabel = 'derived/activeConversations'
todaysWorkoutsAtom.debugLabel = 'derived/todaysWorkouts'
thisWeeksWorkoutsAtom.debugLabel = 'derived/thisWeeksWorkouts'
workoutCompletionRateAtom.debugLabel = 'derived/workoutCompletionRate'
workoutStatsAtom.debugLabel = 'derived/workoutStats'
weeklyWorkoutStatsAtom.debugLabel = 'derived/weeklyWorkoutStats'
filteredTrainingPlansAtom.debugLabel = 'derived/filteredTrainingPlans'
