// Notification system atoms
import { atom } from 'jotai'

import type { Notification } from '@/types/notifications'

// Core notification atoms
export const notificationsAtom = atom<Notification[]>([])
export const notificationsLoadingAtom = atom(false)
export const notificationsErrorAtom = atom<string | null>(null)

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