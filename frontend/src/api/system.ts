import api from './client'

export interface SystemAnalytics {
  system_info: {
    total_users: number
    active_users: number
    moderators: number
    admins: number
    new_users_month: number
  }
  content_stats: {
    total_items: number
    items_with_price: number
    total_outfits: number
    public_outfits: number
  }
  price_analysis: {
    min_price: number
    max_price: number
    average_price: number
  }
  activity_stats: {
    total_views: number
    total_favorites: number
    total_outfit_favorites: number
    total_comments: number
  }
  top_categories: Array<{
    category: string
    count: number
  }>
  top_brands: Array<{
    brand: string
    count: number
  }>
  daily_activity: Array<{
    date: string
    views: number
    favorites: number
  }>
  popular_items: Array<{
    id: number
    name: string
    brand: string
    likes: number
  }>
  popular_outfits: Array<{
    id: number
    name: string
    likes: number
  }>
  moderator_stats: Array<{
    user_id: number
    name: string
    items_count: number
    is_active: boolean
  }>
  generated_at: string
}

export interface SystemHealth {
  status: 'healthy' | 'unhealthy'
  database: 'connected' | 'disconnected'
  users_count: number
  items_count: number
  last_activity: string | null
  timestamp: string
}

export interface SystemPerformance {
  requests_per_hour: number
  active_users_hour: number
  database_connections: string
  memory_usage: string
  cpu_usage: string
  timestamp: string
}

/**
 * Получение полной системной аналитики
 */
export const getSystemAnalytics = async (): Promise<SystemAnalytics> => {
  const response = await api.get<SystemAnalytics>('/api/system/analytics')
  return response.data
}

/**
 * Получение состояния здоровья системы
 */
export const getSystemHealth = async (): Promise<SystemHealth> => {
  const response = await api.get<SystemHealth>('/api/system/health')
  return response.data
}

/**
 * Получение метрик производительности
 */
export const getSystemPerformance = async (): Promise<SystemPerformance> => {
  const response = await api.get<SystemPerformance>('/api/system/performance')
  return response.data
} 