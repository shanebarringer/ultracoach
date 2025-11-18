import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, isAxiosError } from 'axios'

import { createLogger } from '@/lib/logger'
import { commonToasts } from '@/lib/toast'

// Parse env flag once; treat '1' or 'true' (case-insensitive) as true
export const DISABLE_ERROR_TOASTS = (() => {
  const raw = (process.env.NEXT_PUBLIC_DISABLE_ERROR_TOASTS ?? '').toString().trim().toLowerCase()
  return raw === '1' || raw === 'true'
})()

const logger = createLogger('ApiClient')

// Axios instance with safe defaults
// Note: do NOT set `withCredentials` here. Leaving it undefined allows the
// request interceptor to detect whether the caller explicitly set it. The
// browser/XHR default is effectively `false` for cross-origin, which is what
// we want when the interceptor doesn't opt in for same-origin `/api/*`.
export const apiClient = axios.create({
  // In development, Next.js routes compile on-demand which can take 10+ seconds
  // for large modules like /api/runners (5815 modules). Use 30s timeout to allow
  // compilation to complete. Production builds are pre-compiled so 10s is sufficient.
  timeout: process.env.NODE_ENV === 'development' ? 30000 : 10000, // 30s dev, 10s prod
})

// Helper to determine if a request is targeting our own Next.js API routes
// Only runs on the client (window available). On the server it returns false.
function isSameOriginApiRequest(url?: string, baseURL?: string): boolean {
  if (!url || typeof window === 'undefined') return false

  // Treat protocol-relative URLs (//host/path) as absolute
  const isAbsoluteUrl = (u: string) => /^[a-z][a-z\d+.-]*:/i.test(u) || /^\/\//.test(u)

  // Replicate Axios combine + buildFullPath semantics
  const trimTrailing = (s: string) => s.replace(/\/+$/g, '')
  const trimLeading = (s: string) => s.replace(/^\/+/, '')
  const stripQueryHash = (s: string) => s.split(/[?#]/, 1)[0]
  const combineUrls = (base: string, relative: string) =>
    `${trimTrailing(stripQueryHash(base))}/${trimLeading(relative)}`

  // Build the request path similar to Axios's `buildFullPath`
  const fullPath = baseURL && !isAbsoluteUrl(url) ? combineUrls(baseURL, url) : url

  try {
    const { origin, protocol } = window.location

    // Turn the string into an absolute URL for inspection
    let absoluteUrl: URL
    if (isAbsoluteUrl(fullPath)) {
      // If protocol-relative, prefix the current protocol
      const resolved = fullPath.startsWith('//') ? `${protocol}${fullPath}` : fullPath
      absoluteUrl = new URL(resolved)
    } else {
      // Relative URL: resolve against current origin
      absoluteUrl = new URL(
        fullPath.startsWith('/') ? fullPath : `/${trimLeading(fullPath)}`,
        origin
      )
    }

    const sameOrigin = absoluteUrl.origin === origin
    const path = absoluteUrl.pathname
    const isApiPath = path === '/api' || path.startsWith('/api/')
    return sameOrigin && isApiPath
  } catch {
    // Malformed URL or unsupported environment
    return false
  }
}

// Request interceptor: automatically send cookies for same-origin /api/* calls
apiClient.interceptors.request.use(config => {
  // If this is a same-origin Next.js API request, enable cookies by default.
  // We only skip when the caller explicitly opted out with `withCredentials: false`.
  if (isSameOriginApiRequest(config.url, config.baseURL)) {
    if (config.withCredentials !== false) {
      config.withCredentials = true
    }
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
