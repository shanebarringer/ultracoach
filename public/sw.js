/**
 * Service Worker for Push Notifications
 *
 * Handles push notification events and provides offline support.
 * This service worker enables web push notifications for UltraCoach.
 */

/* eslint-disable no-restricted-globals */
/* global self, clients */

const CACHE_NAME = 'ultracoach-v1'
const CACHE_URLS = ['/', '/offline', '/manifest.json']

// Install event - cache essential resources
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...')

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching essential resources')
      return cache.addAll(CACHE_URLS)
    })
  )

  // Force the waiting service worker to become the active service worker
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...')

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[Service Worker] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    })
  )

  // Claim all clients immediately
  return self.clients.claim()
})

// Push event - handle incoming push notifications
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received:', event)

  let notificationData = {
    title: '🏔️ UltraCoach',
    body: 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: 'ultracoach-notification',
    requireInteraction: false,
  }

  // Parse push notification data
  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = {
        ...notificationData,
        ...data,
        // Add notification actions based on type
        actions: getNotificationActions(data.type),
        data: data, // Store original data for click handling
      }
    } catch (error) {
      console.error('[Service Worker] Error parsing push data:', error)
      notificationData.body = event.data.text()
    }
  }

  event.waitUntil(self.registration.showNotification(notificationData.title, notificationData))
})

// Notification click event - handle user interaction
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification clicked:', event)

  event.notification.close()

  // Get the URL to open based on notification data
  const urlToOpen = getNotificationUrl(event.notification.data)

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          // Focus existing window and navigate
          return client.focus().then(client => {
            if ('navigate' in client) {
              return client.navigate(urlToOpen)
            }
          })
        }
      }

      // No window open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// Fetch event - offline support (optional)
self.addEventListener('fetch', event => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return

  // Skip caching for API requests
  if (event.request.url.includes('/api/')) return

  event.respondWith(
    caches.match(event.request).then(response => {
      // Return cached response if found
      if (response) {
        return response
      }

      // Otherwise fetch from network
      return fetch(event.request)
        .then(response => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/offline')
          }
        })
    })
  )
})

/**
 * Get notification actions based on notification type
 */
function getNotificationActions(type) {
  switch (type) {
    case 'message':
      return [
        { action: 'reply', title: 'Reply', icon: '/icons/reply.png' },
        { action: 'view', title: 'View', icon: '/icons/view.png' },
      ]
    case 'workout':
      return [
        { action: 'log', title: 'Log Workout', icon: '/icons/log.png' },
        { action: 'view', title: 'View Details', icon: '/icons/view.png' },
      ]
    default:
      return [{ action: 'view', title: 'View', icon: '/icons/view.png' }]
  }
}

/**
 * Get URL to open based on notification data
 */
function getNotificationUrl(data) {
  if (!data) return '/'

  switch (data.type) {
    case 'message':
      return data.conversationId ? `/chat/${data.conversationId}` : '/chat'
    case 'workout':
      return data.workoutId ? `/workouts?id=${data.workoutId}` : '/workouts'
    case 'training_plan':
      return data.planId ? `/training-plans/${data.planId}` : '/training-plans'
    case 'race':
      return '/races'
    default:
      return '/dashboard'
  }
}
