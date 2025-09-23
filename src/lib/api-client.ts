/**
 * Axios API Client Configuration
 *
 * Provides a pre-configured Axios instance with:
 * - Authentication credentials handling
 * - JSON content type headers
 * - Request/response timeouts
 * - Error interceptors for consistent error handling
 * - Toast notifications for errors
 */
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'

import { createLogger } from './logger'
import { commonToasts } from './toast'

// Extend AxiosRequestConfig to include our custom flags
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  suppressGlobalToast?: boolean
  withCredentials?: boolean
}

const logger = createLogger('ApiClient')

// Create base Axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL:
    typeof window !== 'undefined'
      ? ''
      : process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Request interceptor for logging and authentication
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    logger.debug('API Request', {
      method: config.method?.toUpperCase(),
      url: config.url,
      hasData: Boolean(config.data),
    })
    return config
  },
  error => {
    logger.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    logger.debug('API Response', {
      status: response.status,
      url: response.config.url,
      hasData: Boolean(response.data),
    })
    return response
  },
  (error: AxiosError) => {
    // Handle different error types
    if (error.response) {
      // Server responded with error status
      const { status, data, config } = error.response
      logger.error('API Error Response', {
        status,
        url: config?.url,
        method: config?.method?.toUpperCase(),
        message:
          typeof data === 'string'
            ? data.slice(0, 200)
            : ((data as Record<string, unknown>)?.error ??
              (data as Record<string, unknown>)?.message ??
              'Unknown error'),
      })

      // Don't show toast for specific status codes that components handle
      if (status !== 401 && status !== 403) {
        // Check if global toasts are suppressed for this request
        const suppressToast = (config as ExtendedAxiosRequestConfig)?.suppressGlobalToast
        // Only show toast if error toasts are not disabled and not suppressed for this request
        if (
          typeof window !== 'undefined' &&
          !process.env.NEXT_PUBLIC_DISABLE_ERROR_TOASTS &&
          !suppressToast
        ) {
          commonToasts.serverError()
        }
      }
    } else if (error.request) {
      // Request was made but no response received (network error)
      logger.error('Network Error', {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        message: error.message,
      })

      const suppressToast = (error.config as ExtendedAxiosRequestConfig)?.suppressGlobalToast
      if (
        typeof window !== 'undefined' &&
        !process.env.NEXT_PUBLIC_DISABLE_ERROR_TOASTS &&
        !suppressToast
      ) {
        commonToasts.networkError()
      }
    } else {
      // Something else happened
      logger.error('Request Setup Error', {
        message: error.message,
        url: error.config?.url,
      })
    }

    return Promise.reject(error)
  }
)

// Export the configured client
export default apiClient

// Export convenience methods with proper typing
export const api = {
  get: <T = unknown>(url: string, config?: ExtendedAxiosRequestConfig) =>
    apiClient.get<T>(url, config),

  post: <T = unknown>(url: string, data?: unknown, config?: ExtendedAxiosRequestConfig) =>
    apiClient.post<T>(url, data, config),

  put: <T = unknown>(url: string, data?: unknown, config?: ExtendedAxiosRequestConfig) =>
    apiClient.put<T>(url, data, config),

  delete: <T = unknown>(url: string, config?: ExtendedAxiosRequestConfig) =>
    apiClient.delete<T>(url, config),

  patch: <T = unknown>(url: string, data?: unknown, config?: ExtendedAxiosRequestConfig) =>
    apiClient.patch<T>(url, data, config),
}

// Named export for default import compatibility
export { apiClient }
