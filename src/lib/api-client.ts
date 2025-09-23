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

// Add a per-request suppression flag for global error toasts
export type ApiRequestConfig = AxiosRequestConfig & {
  suppressGlobalErrorToast?: boolean
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // Short-circuit intentional cancellations before any logging/toasts
    if (axios.isCancel(error) || (isAxiosError(error) && error.code === 'ERR_CANCELED')) {
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
      if (!cfg.suppressGlobalErrorToast && isServerError) {
        if (typeof window !== 'undefined' && !DISABLE_ERROR_TOASTS) {
          commonToasts.serverError()
        }
      }
    } else {
      // Network or CORS error (no response)
      if (!cfg.suppressGlobalErrorToast) {
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
