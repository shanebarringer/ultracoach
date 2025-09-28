import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, isAxiosError } from 'axios'

import { createLogger } from '@/lib/logger'
import { commonToasts } from '@/lib/toast'

// Parse env flag once; treat '1' or 'true' (case-insensitive) as true
export const DISABLE_ERROR_TOASTS = (() => {
  const raw = (process.env.NEXT_PUBLIC_DISABLE_ERROR_TOASTS ?? '').toString().trim().toLowerCase()
  return raw === '1' || raw === 'true'
})()

const logger = createLogger('ApiClient')

// Axios instance with safe defaults; callers may opt-in to cookies per request
export const apiClient = axios.create({
  withCredentials: false, // Safe default; enable per-request when required
  timeout: 10000, // 10 seconds
})

// Helper to determine if a request is targeting our own Next.js API routes
// Only runs on the client (window available). On the server it returns false.
function isSameOriginApiRequest(url?: string, baseURL?: string): boolean {
  if (!url || typeof window === 'undefined') return false
  try {
    const origin = window.location.origin

    // Support absolute and relative baseURL values
    let abs: URL
    if (baseURL) {
      const absBase = /^https?:\/\//i.test(baseURL)
        ? baseURL
        : `${origin}${baseURL.startsWith('/') ? '' : '/'}${baseURL}`
      abs = new URL(url, absBase)
    } else {
      abs = new URL(url, origin)
    }

    const sameOrigin = abs.origin === origin
    const path = abs.pathname
    const isApiPath = path === '/api' || path.startsWith('/api/')
    return sameOrigin && isApiPath
  } catch {
    // Malformed URL or unsupported environment
    return false
  }
}

// Request interceptor: automatically send cookies for same-origin /api/* calls
apiClient.interceptors.request.use(config => {
  // Respect explicit per-request settings; otherwise, set for same-origin API calls
  if (config.withCredentials == null && isSameOriginApiRequest(config.url, config.baseURL)) {
    config.withCredentials = true
  }
  return config
})

// Add a per-request suppression flag for global error toasts
export type ApiRequestConfig = AxiosRequestConfig & {
  suppressGlobalErrorToast?: boolean
  suppressGlobalToast?: boolean // Keep backward compatibility
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // Check for aborted/canceled requests and handle silently - this is expected behavior
    if (
      axios.isCancel(error) ||
      (isAxiosError(error) && error.code === 'ERR_CANCELED') ||
      error.name === 'AbortError'
    ) {
      return Promise.reject(error)
    }

    // Basic sanitized logging
    const method = (error.config?.method || 'get').toUpperCase()
    const url = error.config?.url || 'unknown-url'

    if (error.response) {
      const { status, statusText } = error.response
      logger.error('HTTP error', { method, url, status, statusText })
    } else {
      logger.error('Network error', { method, url, message: error.message })
    }

    const cfg = (error.config as ApiRequestConfig) || {}

    // Server responded with an error status
    if (error.response) {
      const status = error.response.status
      const isServerError = status >= 500 && status < 600
      // Support both suppressGlobalErrorToast (new) and suppressGlobalToast (legacy)
      const suppressToast = cfg.suppressGlobalErrorToast || cfg.suppressGlobalToast
      if (!suppressToast && isServerError) {
        if (typeof window !== 'undefined' && !DISABLE_ERROR_TOASTS) {
          commonToasts.serverError()
        }
      }
    } else {
      // Network or CORS error (no response)
      const suppressToast = cfg.suppressGlobalErrorToast || cfg.suppressGlobalToast
      if (!suppressToast) {
        if (typeof window !== 'undefined' && !DISABLE_ERROR_TOASTS) {
          commonToasts.networkError()
        }
      }
    }

    return Promise.reject(error)
  }
)

export const api = {
  get: <T = unknown>(url: string, config?: ApiRequestConfig) => apiClient.get<T>(url, config),
  post: <T = unknown>(url: string, data?: unknown, config?: ApiRequestConfig) =>
    apiClient.post<T>(url, data, config),
  put: <T = unknown>(url: string, data?: unknown, config?: ApiRequestConfig) =>
    apiClient.put<T>(url, data, config),
  delete: <T = unknown>(url: string, config?: ApiRequestConfig) => apiClient.delete<T>(url, config),
  patch: <T = unknown>(url: string, data?: unknown, config?: ApiRequestConfig) =>
    apiClient.patch<T>(url, data, config),
}

export default api
