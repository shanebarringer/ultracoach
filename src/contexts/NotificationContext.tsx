'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { supabase } from '@/lib/supabase'
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime'
import type { Notification } from '@/lib/supabase'

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  addNotification: (notification: Omit<Notification, 'id' | 'created_at'>) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])

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
        console.error('Error fetching notifications:', error)
        return
      }

      setNotifications(data || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications()
    }
  }, [session?.user?.id, fetchNotifications])

  // Real-time updates for notifications
  useSupabaseRealtime({
    table: 'notifications',
    filter: `user_id=eq.${session?.user?.id}`,
    onInsert: (payload) => {
      const newNotification = payload.new as Notification
      setNotifications(prev => [newNotification, ...prev.slice(0, 49)])
    },
    onUpdate: (payload) => {
      const updatedNotification = payload.new as Notification
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === updatedNotification.id ? updatedNotification : notif
        )
      )
    }
  })

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', session?.user?.id)

      if (error) {
        console.error('Error marking notification as read:', error)
        return
      }

      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
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
        console.error('Error marking all notifications as read:', error)
        return
      }

      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      )
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const addNotification = async (notification: Omit<Notification, 'id' | 'created_at'>) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert([notification])

      if (error) {
        console.error('Error creating notification:', error)
      }
    } catch (error) {
      console.error('Error creating notification:', error)
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}