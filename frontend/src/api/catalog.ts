import api from './client'

// Types для каталога
export interface ParseRequest {
  query: string
  limit: number
  domain: 'ru' | 'kz' | 'by'
  page?: number // добавлено для постраничного парсинга
}

export interface ParseResponse {
  message: string
  task_id: string
  query: string
  limit: string
  domain: string
  started_by: string
  status_url: string
}

export interface TaskStatus {
  task_id: string
  state: 'PENDING' | 'PROGRESS' | 'SUCCESS' | 'FAILURE' | 'RETRY' | 'REVOKED'
  result?: any
  meta?: {
    status?: string
    progress?: number
    [key: string]: any
  }
  traceback?: string
  date_done?: string
}

export interface CatalogStats {
  total_items: number
  recent_items_week: number
  price_range: {
    min: number
    max: number
    average: number
  }
  top_brands: Array<{
    brand: string
    count: number
  }>
  top_categories: Array<{
    category: string
    count: number
  }>
  generated_at: string
}

export interface ActiveTask {
  task_id: string
  name: string
  worker: string
  args: any[]
  kwargs: Record<string, any>
  time_start: string
}

export interface ParsedProduct {
  sku: string
  name: string
  brand: string
  price: number
  old_price?: number
  url: string
  image_url: string
  image_urls: string[]
  description?: string
  category?: string
  clothing_type?: string
  color?: string
  sizes: string[]
  style?: string
  collection?: string
  rating?: number
  reviews_count?: number
  parse_quality: number
  parse_metadata: Record<string, any>
  parsed_at: string
}

export interface ParseResult {
  success: boolean
  products: ParsedProduct[]
  total_found: number
  success_count: number
  failed_count: number
  quality_score: number
  parsing_time: number
  metadata: Record<string, any>
  task_completed_at: string
}

export interface TaskResult {
  status: 'success' | 'failure' | 'pending' | 'progress'
  task_id: string
  result?: ParseResult
  error?: string
  info?: any
}

// API Functions для каталога

/**
 * Запуск полного парсинга с импортом в БД
 */
export const startFullParsing = async (request: ParseRequest): Promise<ParseResponse> => {
  const response = await api.post<ParseResponse>('/api/catalog/parse', request)
  return response.data
}

/**
 * Запуск простого парсинга без импорта (для предварительного просмотра)
 */
export const startSimpleParsing = async (
  query: string,
  limit: number = 10,
  domain: 'ru' | 'kz' | 'by' = 'kz',
  page?: number
): Promise<ParseResponse> => {
  let url = `/api/catalog/parse-simple?query=${encodeURIComponent(query)}&limit=${limit}&domain=${domain}`
  if (page !== undefined) {
    url += `&page=${page}`
  }
  const response = await api.post<ParseResponse>(url)
  return response.data
}

/**
 * Тестовый запуск цепочки обработки
 */
export const startTestChain = async (): Promise<ParseResponse> => {
  const response = await api.post<ParseResponse>('/api/catalog/test-chain')
  return response.data
}

/**
 * ВРЕМЕННЫЙ тестовый парсер без аутентификации
 */
export const startTestParser = async (
  query: string = 'jeans',
  limit: number = 5,
  domain: 'ru' | 'kz' | 'by' = 'kz'
): Promise<ParseResponse> => {
  const response = await api.post<ParseResponse>(
    `/api/catalog/test-parser?query=${encodeURIComponent(query)}&limit=${limit}&domain=${domain}`
  )
  return response.data
}

/**
 * Получение статуса задачи
 */
export const getTaskStatus = async (taskId: string): Promise<TaskStatus> => {
  const response = await api.get<TaskStatus>(`/api/catalog/tasks/${taskId}/status`)
  return response.data
}

/**
 * Отмена задачи
 */
export const cancelTask = async (taskId: string): Promise<void> => {
  await api.delete(`/api/catalog/tasks/${taskId}`)
}

/**
 * Получение списка активных задач
 */
export const getActiveTasks = async (): Promise<ActiveTask[]> => {
  const response = await api.get<ActiveTask[]>('/api/catalog/tasks')
  return response.data
}

/**
 * Получение статистики каталога
 */
export const getCatalogStats = async (): Promise<CatalogStats> => {
  const response = await api.get<CatalogStats>('/api/catalog/stats')
  return response.data
}

/**
 * Получение подробного результата задачи
 */
export const getTaskResult = async (taskId: string): Promise<TaskResult> => {
  const response = await api.get<TaskResult>(`/api/catalog/tasks/${taskId}/result`)
  return response.data
}

// Хелперы для работы с задачами

/**
 * Ожидание завершения задачи с периодическими проверками
 */
export const waitForTask = async (
  taskId: string,
  onProgress?: (status: TaskStatus) => void,
  interval: number = 2000,
  timeout: number = 300000 // 5 минут
): Promise<TaskStatus> => {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeout) {
    const status = await getTaskStatus(taskId)
    
    if (onProgress) {
      onProgress(status)
    }
    
    if (status.state === 'SUCCESS' || status.state === 'FAILURE') {
      return status
    }
    
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  
  throw new Error('Task timeout')
}

/**
 * Проверка готовности системы парсинга
 */
export const checkParsingHealth = async (): Promise<boolean> => {
  try {
    await getCatalogStats()
    return true
  } catch (error) {
    console.error('Parsing system health check failed:', error)
    return false
  }
} 