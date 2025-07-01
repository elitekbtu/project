import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

// Base URL from env or fallback to same-origin (empty string) so calls like '/api/…' stay single-prefixed
const baseURL = import.meta.env.VITE_API_BASE_URL || ''

// Access + refresh tokens are persisted in localStorage using these keys
const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

export const getStoredTokens = () => ({
  access: localStorage.getItem(ACCESS_KEY) || undefined,
  refresh: localStorage.getItem(REFRESH_KEY) || undefined,
})

export const setStoredTokens = (access?: string, refresh?: string) => {
  if (access) {
    localStorage.setItem(ACCESS_KEY, access)
  }
  if (refresh) {
    localStorage.setItem(REFRESH_KEY, refresh)
  }
}

export const clearStoredTokens = () => {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

// Create axios instance
const api = axios.create({
  baseURL,
})

// Request interceptor: attach access token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { access } = getStoredTokens()
  if (access && config.headers) {
    config.headers.Authorization = `Bearer ${access}`
  }
  return config
})

let isRefreshing = false
let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }[] = []

const processQueue = (error: unknown, token?: string) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// Response interceptor: attempt refresh on 401
api.interceptors.response.use(
  (response: any) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      const { refresh } = getStoredTokens()
      if (!refresh) {
        clearStoredTokens()
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true
      try {
        const resp = await axios.post<{ access_token: string; refresh_token: string; token_type: string }>(
          `${baseURL}/api/auth/refresh`,
          {
            refresh_token: refresh,
          },
        )
        const { access_token: newAccess, refresh_token: newRefresh } = resp.data
        setStoredTokens(newAccess, newRefresh)
        processQueue(undefined, newAccess)
        if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${newAccess}`
        return api(originalRequest)
      } catch (err) {
        processQueue(err, undefined)
        clearStoredTokens()
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  },
)

export default api 