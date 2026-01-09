'use client'

import { useAtom, useSetAtom } from 'jotai'

import { useCallback, useEffect, useState } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime'
import { api } from '@/lib/api-client'
import { notificationsAtom, unreadNotificationsCountAtom } from '@/lib/atoms/index'
import { createLogger } from '@/lib/logger'
import { toast } from '@/lib/toast'
import type { Notification } from '@/types/notifications'

const logger = createLogger('useNotifications')

export function useNotifications() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useAtom(notificationsAtom)
  const setUnreadCount = useSetAtom(unreadNotificationsCountAtom)
  const [preferences, setPreferences] = useState<{
    toast_notifications?: boolean
    messages?: boolean
    workouts?: boolean
    training_plans?: boolean
    races?: boolean
    reminders?: boolean
    email_notifications?: boolean
  } | null>(null)

  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await api.get<{ notifications: Notification[]; unreadCount: number }>(
        '/api/notifications',
        { suppressGlobalToast: true }
      )

      const data = response.data
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      logger.error('Error fetching notifications:', error)
    }
  }, [session?.user?.id, setNotifications, setUnreadCount])

  // Fetch user preferences
  const fetchPreferences = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await api.get<{ preferences: typeof preferences }>(
        '/api/user/notification-preferences',
        { suppressGlobalToast: true }
      )
      setPreferences(response.data.preferences)
    } catch (error) {
      logger.error('Error fetching notification preferences:', error)
      // Set default preferences if fetch fails
      setPreferences({
        toast_notifications: true,
        messages: true,
        workouts: true,
        training_plans: true,
        races: true,
        reminders: true,
      })
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications()
      fetchPreferences()
    }
  }, [session?.user?.id, fetchNotifications, fetchPreferences])

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
    // Check if toast notifications are enabled
    if (!preferences?.toast_notifications) return

    // Map notification types to preference keys
    const getPreferenceKey = (type: string) => {
      switch (type) {
        case 'message':
          return 'messages'
        case 'workout':
          return 'workouts'
        case 'training_plan':
          return 'training_plans'
        case 'race':
          return 'races'
        default:
          return null
      }
    }

    const preferenceKey = getPreferenceKey(notification.type)
    if (preferenceKey && preferences?.[preferenceKey as keyof typeof preferences] === false) {
      return
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
        default:
          return '📢'
      }
    }

    const icon = getNotificationIcon(notification.type)
    const title = `${icon} ${notification.title}`

    toast.info(title, notification.message)
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await api.patch(
        '/api/notifications',
        {
          notificationIds: [notificationId],
          read: true,
        },
        { suppressGlobalToast: true }
      )

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

      await api.patch(
        '/api/notifications',
        {
          notificationIds: unreadIds,
          read: true,
        },
        { suppressGlobalToast: true }
      )

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
      await api.post(
        '/api/notifications',
        {
          userId: notification.user_id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
        },
        { suppressGlobalToast: true }
      )
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
