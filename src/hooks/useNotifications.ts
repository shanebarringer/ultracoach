'use client'

import { useAtom, useSetAtom } from 'jotai'

import { useCallback, useEffect } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime'
import { notificationsAtom, unreadNotificationsCountAtom } from '@/lib/atoms'
import { createLogger } from '@/lib/logger'
import type { Notification } from '@/lib/supabase'

const logger = createLogger('useNotifications')

export function useNotifications() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useAtom(notificationsAtom)
  const setUnreadCount = useSetAtom(unreadNotificationsCountAtom)

  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/notifications', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
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

  // Real-time updates for notifications
  useSupabaseRealtime({
    table: 'notifications',
    filter: `user_id=eq.${session?.user?.id}`,
    onInsert: payload => {
      const newNotification = payload.new as Notification
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
