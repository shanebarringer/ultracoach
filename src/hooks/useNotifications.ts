'use client'

import { useAtom, useAtomValue, useSetAtom } from 'jotai'

import { useCallback, useEffect } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime'
import { notificationsAtom, unreadNotificationsCountAtom } from '@/lib/atoms/index'
import { asyncUserSettingsAtom } from '@/lib/atoms/settings'
import { createLogger } from '@/lib/logger'
import { NotificationManager } from '@/lib/notification-manager'
import type { Notification } from '@/types/notifications'

const logger = createLogger('useNotifications')

export function useNotifications() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useAtom(notificationsAtom)
  const setUnreadCount = useSetAtom(unreadNotificationsCountAtom)

  // Get notification preferences from user settings atom
  const userSettings = useAtomValue(asyncUserSettingsAtom)
  const notificationPrefs = userSettings?.notification_preferences

  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/notifications', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
      })

      if (!response.ok) {
        logger.error('Error fetching notifications:', response.statusText)
        return
      }

      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      logger.error('Error fetching notifications:', error)
    }
  }, [session?.user?.id, setNotifications, setUnreadCount])

  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications()
    }
  }, [session?.user?.id, fetchNotifications])

  // Enhanced real-time updates with toast notifications
  // Temporarily disabled due to schema mismatch - relying on polling fallback
  useSupabaseRealtime({
    table: 'notifications',
    filter: `user_id=eq.${session?.user?.id}`,
    disabled: true, // Disabled due to schema mismatch
    onInsert: payload => {
      const newNotification = payload.new as Notification

      // Show toast for new notification
      showNotificationToast(newNotification)

      setNotifications(prev => {
        const updated = [newNotification, ...prev.slice(0, 49)]
        setUnreadCount(updated.filter(n => !n.read).length)
        return updated
      })
    },
    onUpdate: payload => {
      const updatedNotification = payload.new as Notification
      setNotifications(prev => {
        const updated = prev.map(notif =>
          notif.id === updatedNotification.id ? updatedNotification : notif
        )
        setUnreadCount(updated.filter(n => !n.read).length)
        return updated
      })
    },
  })

  // Helper function to show toast notifications with preference filtering
  const showNotificationToast = (notification: Notification) => {
    // Map notification types to NotificationManager types
    const getNotificationType = (type: string) => {
      switch (type) {
        case 'message':
          return 'messages'
        case 'workout':
          return 'workouts'
        case 'training_plan':
          return 'training_plans'
        case 'race':
          return 'races'
        case 'reminder':
          return 'reminders'
        case 'system':
          return 'system_updates'
        default:
          return 'system_updates'
      }
    }

    const getNotificationIcon = (type: string) => {
      switch (type) {
        case 'workout':
          return '🏃'
        case 'training_plan':
          return '📋'
        case 'message':
          return '💬'
        case 'race':
          return '🏁'
        case 'reminder':
          return '⏰'
        default:
          return '📢'
      }
    }

    const notificationType = getNotificationType(notification.type)
    const icon = getNotificationIcon(notification.type)
    const title = `${icon} ${notification.title}`

    // Use NotificationManager to respect preferences
    NotificationManager.showInfoSync(
      notificationType as Parameters<typeof NotificationManager.showInfoSync>[0],
      title,
      notification.message,
      notificationPrefs
    )
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationIds: [notificationId],
          read: true,
        }),
      })

      if (!response.ok) {
        logger.error('Error marking notification as read:', response.statusText)
        return
      }

      setNotifications(prev => {
        const updated = prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
        setUnreadCount(updated.filter(n => !n.read).length)
        return updated
      })
    } catch (error) {
      logger.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id)

      if (unreadIds.length === 0) return

      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationIds: unreadIds,
          read: true,
        }),
      })

      if (!response.ok) {
        logger.error('Error marking all notifications as read:', response.statusText)
        return
      }

      setNotifications(prev => {
        const updated = prev.map(notif => ({ ...notif, read: true }))
        setUnreadCount(0)
        return updated
      })
    } catch (error) {
      logger.error('Error marking all notifications as read:', error)
    }
  }

  const addNotification = async (notification: Omit<Notification, 'id' | 'created_at'>) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: notification.user_id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
        }),
      })

      if (!response.ok) {
        logger.error('Error creating notification:', response.statusText)
      }
    } catch (error) {
      logger.error('Error creating notification:', error)
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
  }
}
