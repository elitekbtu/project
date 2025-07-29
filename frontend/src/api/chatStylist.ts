import api from './client'

export interface ChatStylistItem {
  id: number
  name: string
  image_url?: string | null
  brand?: string | null
  price?: number | null
  category?: string | null
  color?: string | null
  size?: string | null
  description?: string | null
}

export interface ChatStylistResponse {
  reply: string
  items: ChatStylistItem[]
  intent_type?: string
  confidence?: number
  processing_time?: number
}

export interface ChatStats {
  user_id?: number
  interaction_count?: number
  current_state?: string
  conversation_duration?: number
  last_interaction?: string
  error?: string
}

export interface ChatSummary {
  user_id: number
  total_messages: number
  conversation_duration: number
  favorite_categories: string[]
  price_range: { min: number; max: number }
  style_preferences: string[]
  error?: string
}

export interface PerformanceMetrics {
  total_conversations: number
  successful_conversations: number
  failed_conversations: number
  average_response_time: number
  success_rate: number
  agent_stats: Record<string, any>
  active_contexts: number
  error?: string
}

export interface CleanupResponse {
  message: string
  cleaned_count?: number
}

export interface HealthResponse {
  status: string
  system_stats: any
  message: string
}

// Основная функция для отправки сообщений (обновленная)
export const sendChatMessage = async (message: string, userProfile?: any): Promise<ChatStylistResponse> => {
  const resp = await api.post<ChatStylistResponse>('/api/chat-stylist/', { message })
  return resp.data
}

// Легаси функция для обратной совместимости
export const sendChatMessageLegacy = async (message: string, userProfile?: any): Promise<ChatStylistResponse> => {
  const resp = await api.post<ChatStylistResponse>('/api/chat-stylist/legacy', { message })
  return resp.data
}

// Новые функции для работы с системой агентов

/**
 * Сброс состояния диалога
 */
export const resetConversation = async (userId?: number): Promise<{ message: string; user_id?: number }> => {
  const resp = await api.post<{ message: string; user_id?: number }>('/api/chat-stylist/reset', {
    user_id: userId
  })
  return resp.data
}

/**
 * Получение статистики разговора
 */
export const getConversationStats = async (userId?: number): Promise<ChatStats> => {
  const params = userId ? { user_id: userId } : {}
  const resp = await api.get<{ stats: ChatStats }>('/api/chat-stylist/stats', { params })
  return resp.data.stats
}

/**
 * Получение сводки разговора
 */
export const getConversationSummary = async (userId: number): Promise<ChatSummary> => {
  const resp = await api.get<{ summary: ChatSummary }>(`/api/chat-stylist/summary/${userId}`)
  return resp.data.summary
}

/**
 * Получение метрик производительности (требует права администратора)
 */
export const getPerformanceMetrics = async (): Promise<PerformanceMetrics> => {
  const resp = await api.get<{ metrics: PerformanceMetrics }>('/api/chat-stylist/performance')
  return resp.data.metrics
}

/**
 * Очистка старых контекстов (требует права администратора)
 */
export const cleanupOldContexts = async (maxAgeHours: number = 24): Promise<CleanupResponse> => {
  const resp = await api.post<CleanupResponse>('/api/chat-stylist/cleanup', {
    max_age_hours: maxAgeHours
  })
  return resp.data
}

/**
 * Проверка здоровья системы агентов
 */
export const checkSystemHealth = async (): Promise<HealthResponse> => {
  const resp = await api.get<HealthResponse>('/api/chat-stylist/health')
  return resp.data
} 