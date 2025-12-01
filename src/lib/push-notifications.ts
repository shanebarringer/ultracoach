/**
 * Push Notification Utilities
 *
 * Client-side utilities for registering service worker and managing push notifications.
 */
import { createLogger } from '@/lib/logger'

const logger = createLogger('PushNotifications')

// VAPID public key - should be set in environment variables
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'serviceWorker' in navigator && 'PushManager' in window
}

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) {
    logger.warn('Service workers not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })

    logger.info('Service worker registered', { scope: registration.scope })
    return registration
  } catch (error) {
    logger.error('Service worker registration failed:', error)
    return null
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    logger.warn('Notifications not supported')
    return 'denied'
  }

  if (!('Notification' in window)) {
    logger.warn('Notification API not supported')
    return 'denied'
  }

  const permission = await Notification.requestPermission()
  logger.info('Notification permission:', permission)
  return permission
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  try {
    // Register service worker
    const registration = await registerServiceWorker()
    if (!registration) {
      throw new Error('Service worker registration failed')
    }

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready

    // Request notification permission
    const permission = await requestNotificationPermission()
    if (permission !== 'granted') {
      throw new Error('Notification permission denied')
    }

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      logger.info('Existing push subscription found')
      return subscription
    }

    // Create new subscription
    if (!VAPID_PUBLIC_KEY) {
      logger.error('VAPID public key not configured')
      throw new Error('Push notifications not configured')
    }

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    })

    logger.info('Push subscription created')

    // Send subscription to server
    await savePushSubscription(subscription)

    return subscription
  } catch (error) {
    logger.error('Push subscription failed:', error)
    return null
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) {
      logger.warn('No service worker registration found')
      return false
    }

    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      logger.warn('No push subscription found')
      return false
    }

    // Unsubscribe from push
    const unsubscribed = await subscription.unsubscribe()

    if (unsubscribed) {
      // Notify server
      await deletePushSubscription(subscription)
      logger.info('Unsubscribed from push notifications')
    }

    return unsubscribed
  } catch (error) {
    logger.error('Unsubscribe failed:', error)
    return false
  }
}

/**
 * Get current push subscription
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return null

    return await registration.pushManager.getSubscription()
  } catch (error) {
    logger.error('Error getting subscription:', error)
    return null
  }
}

/**
 * Save push subscription to server
 */
async function savePushSubscription(subscription: PushSubscription): Promise<void> {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth')),
        },
        deviceType: getDeviceType(),
        browser: getBrowserInfo(),
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to save subscription')
    }

    logger.info('Subscription saved to server')
  } catch (error) {
    logger.error('Error saving subscription:', error)
    throw error
  }
}

/**
 * Delete push subscription from server
 */
async function deletePushSubscription(subscription: PushSubscription): Promise<void> {
  try {
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        endpoint: subscription.endpoint,
      }),
    })

    logger.info('Subscription deleted from server')
  } catch (error) {
    logger.error('Error deleting subscription:', error)
  }
}

/**
 * Convert URL-safe base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''

  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

/**
 * Get device type
 */
function getDeviceType(): string {
  const ua = navigator.userAgent
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet'
  }
  if (
    /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
      ua
    )
  ) {
    return 'mobile'
  }
  return 'desktop'
}

/**
 * Get browser information
 */
function getBrowserInfo(): string {
  const ua = navigator.userAgent
  let browser = 'Unknown'

  if (ua.includes('Firefox/')) {
    browser = 'Firefox'
  } else if (ua.includes('SamsungBrowser/')) {
    browser = 'Samsung Internet'
  } else if (ua.includes('Opera/') || ua.includes('OPR/')) {
    browser = 'Opera'
  } else if (ua.includes('Trident/')) {
    browser = 'Internet Explorer'
  } else if (ua.includes('Edge/')) {
    browser = 'Edge Legacy'
  } else if (ua.includes('Edg/')) {
    browser = 'Edge'
  } else if (ua.includes('Chrome/')) {
    browser = 'Chrome'
  } else if (ua.includes('Safari/')) {
    browser = 'Safari'
  }

  return browser
}
