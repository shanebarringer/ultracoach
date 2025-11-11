// Notification system atoms
import { atom } from 'jotai'

import type { Notification } from '@/types/notifications'

import { withDebugLabel } from './utils'

// Core notification atoms
export const notificationsAtom = atom<Notification[]>([])
export const notificationsLoadingAtom = atom(false)
export const notificationsErrorAtom = atom<string | null>(null)

// Async notifications atom with suspense support
export const asyncNotificationsAtom = atom(async () => {
  // This would be populated with actual async data fetching
  return [] as Notification[]
})

// Notification counts
export const unreadNotificationsCountAtom = atom(0)
export const hasNewNotificationsAtom = atom(false)

// Notification preferences
export const notificationPreferencesAtom = atom({
  workoutReminders: true,
  planUpdates: true,
  messageNotifications: true,
  weeklyReports: false,
  achievementAlerts: true,
})

// Jotai Devtools debug labels (dev-only)
withDebugLabel(notificationsAtom, 'notifications/list')
withDebugLabel(notificationsLoadingAtom, 'notifications/loading')
withDebugLabel(notificationsErrorAtom, 'notifications/error')
withDebugLabel(asyncNotificationsAtom, 'notifications/async')
withDebugLabel(unreadNotificationsCountAtom, 'notifications/unreadCount')
withDebugLabel(hasNewNotificationsAtom, 'notifications/hasNew')
withDebugLabel(notificationPreferencesAtom, 'notifications/preferences')
