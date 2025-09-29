// Notification system atoms
import { atom } from 'jotai'

import type { Notification } from '@/types/notifications'

// Core notification atoms
export const notificationsAtom = atom<Notification[]>([])
notificationsAtom.debugLabel = 'notificationsAtom'
export const notificationsLoadingAtom = atom(false)
notificationsLoadingAtom.debugLabel = 'notificationsLoadingAtom'
export const notificationsErrorAtom = atom<string | null>(null)
notificationsErrorAtom.debugLabel = 'notificationsErrorAtom'

// Async notifications atom with suspense support
export const asyncNotificationsAtom = atom(async () => {
  // This would be populated with actual async data fetching
  return [] as Notification[]
})
asyncNotificationsAtom.debugLabel = 'asyncNotificationsAtom'

// Notification counts
export const unreadNotificationsCountAtom = atom(0)
unreadNotificationsCountAtom.debugLabel = 'unreadNotificationsCountAtom'
export const hasNewNotificationsAtom = atom(false)
hasNewNotificationsAtom.debugLabel = 'hasNewNotificationsAtom'

// Notification preferences
export const notificationPreferencesAtom = atom({
  workoutReminders: true,
  planUpdates: true,
  messageNotifications: true,
  weeklyReports: false,
  achievementAlerts: true,
})
notificationPreferencesAtom.debugLabel = 'notificationPreferencesAtom'
