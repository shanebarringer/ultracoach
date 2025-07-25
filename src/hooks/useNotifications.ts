'use client'

import { useAtom, useSetAtom } from 'jotai'

import { useCallback, useEffect } from 'react'

import { useSession } from '@/hooks/useBetterSession'
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime'
import { notificationsAtom, unreadNotificationsCountAtom } from '@/lib/atoms'
import { createLogger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'
import type { Notification } from '@/lib/supabase'

const logger = createLogger('useNotifications')

export function useNotifications() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useAtom(notificationsAtom)
  const setUnreadCount = useSetAtom(unreadNotificationsCountAtom)

  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        logger.error('Error fetching notifications:', error)
        return
      }

      setNotifications(data || [])
      setUnreadCount((data || []).filter(n => !n.read).length)
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
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', session?.user?.id)

      if (error) {
        logger.error('Error marking notification as read:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
        })
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
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', session?.user?.id)
        .eq('read', false)

      if (error) {
        logger.error('Error marking all notifications as read:', error)
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
      const { error } = await supabase.from('notifications').insert([notification])

      if (error) {
        logger.error('Error creating notification:', error)
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
