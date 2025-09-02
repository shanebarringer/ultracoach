// Derived atoms - computed values from other atoms
import { atom } from 'jotai'

import { workoutsAtom, workoutSearchTermAtom, workoutTypeFilterAtom, workoutStatusFilterAtom } from '../workouts'
import { notificationsAtom } from '../notifications'
import { trainingPlansAtom } from '../training-plans'
import { conversationsAtom, unreadMessagesCountAtom } from '../chat'
import { userAtom } from '../auth'

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

// User's active conversations
export const activeConversationsAtom = atom(get => {
  const conversations = get(conversationsAtom)
  const user = get(userAtom)
  
  if (!user) return []
  
  // ConversationWithUser doesn't have participant1_id/participant2_id
  // It has sender and recipient properties
  return conversations.filter(conv => {
    const userId = typeof user === 'object' && 'id' in user ? (user as any).id : null
    if (!userId) return false
    return conv.sender?.id === userId || conv.recipient?.id === userId
  })
})

// Today's workouts
export const todaysWorkoutsAtom = atom(get => {
  const workouts = get(workoutsAtom)
  const today = new Date().toISOString().split('T')[0]
  
  return workouts.filter(workout => workout.date?.startsWith(today))
})

// This week's workouts
export const thisWeeksWorkoutsAtom = atom(get => {
  const workouts = get(workoutsAtom)
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  const endOfWeek = new Date(today)
  endOfWeek.setDate(today.getDate() + (6 - today.getDay()))
  
  return workouts.filter(workout => {
    if (!workout.date) return false
    const workoutDate = new Date(workout.date)
    return workoutDate >= startOfWeek && workoutDate <= endOfWeek
  })
})

// Workout completion rate
export const workoutCompletionRateAtom = atom(get => {
  const workouts = get(workoutsAtom)
  const completed = workouts.filter(w => w.status === 'completed').length
  const total = workouts.length
  
  return total > 0 ? (completed / total) * 100 : 0
})

// Workout statistics atom
export const workoutStatsAtom = atom(get => {
  const workouts = get(filteredWorkoutsAtom) || []
  return {
    total: workouts.length,
    completed: workouts.filter(w => w.status === 'completed').length,
    planned: workouts.filter(w => w.status === 'planned').length,
    skipped: workouts.filter(w => w.status === 'skipped').length,
    plannedDistance: workouts.reduce((sum, w) => sum + (w.planned_distance || 0), 0),
    completedDistance: workouts
      .filter(w => w.status === 'completed')
      .reduce((sum, w) => sum + (w.actual_distance || w.planned_distance || 0), 0),
    avgIntensity:
      workouts.length > 0
        ? workouts.reduce((sum, w) => sum + (w.intensity || 0), 0) / workouts.length
        : 0,
  }
})

// Filtered training plans atom
export const filteredTrainingPlansAtom = atom(get => {
  const plans = get(trainingPlansAtom)
  // Apply filters here as needed
  // For now, just return all plans
  return plans
})