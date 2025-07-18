import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, 
  Download, 
  Loader2, 
  Play, 
  Square, 
  TrendingUp, 
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  Settings,
  RefreshCw,
  Info,
  Zap
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useToast } from '../ui/use-toast'
import { cn } from '../../lib/utils'
import {
  startFullParsing,
  startSimpleParsing,
  startTestChain,
  startTestParser,
  getTaskStatus,
  getTaskResult,
  cancelTask,
  getActiveTasks,
  getCatalogStats,
  waitForTask,
  checkParsingHealth,
  type TaskStatus,
  type CatalogStats,
  type ActiveTask,
  type ParsedProduct,
  type TaskResult
} from '../../api/catalog'

interface RunningTask {
  id: string
  query: string
  domain: string
  limit: number
  type: 'full' | 'simple' | 'test' | 'test-parser' | 'page'
  status: TaskStatus
  startTime: Date
  result?: TaskResult
}

const LamodaParser = () => {
  // Form state
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(20)
  const [domain, setDomain] = useState<'ru' | 'kz' | 'by'>('kz')
  
  // System state
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null)
  const [runningTasks, setRunningTasks] = useState<RunningTask[]>([])
  const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([])
  const [stats, setStats] = useState<CatalogStats | null>(null)
  
  // UI state
  const [activeTab, setActiveTab] = useState('parser')
  const [loading, setLoading] = useState(false)
  
  // Новое состояние для парсинга по страницам
  const [pageFrom, setPageFrom] = useState(1)
  const [pageTo, setPageTo] = useState(1)
  const [pageTasks, setPageTasks] = useState<RunningTask[]>([])
  const [pageLoading, setPageLoading] = useState(false)
  
  const { toast } = useToast()
  const intervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    checkSystemHealth()
    loadStats()
    loadActiveTasks()
    
    // Устанавливаем интервал для обновления статуса задач
    intervalRef.current = setInterval(() => {
      updateTasksStatus()
      loadActiveTasks()
    }, 3000)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const checkSystemHealth = async () => {
    const healthy = await checkParsingHealth()
    setIsHealthy(healthy)
    
    if (!healthy) {
      toast({
        variant: 'destructive',
        title: 'Система парсинга недоступна',
        description: 'Проверьте состояние backend сервиса'
      })
    }
  }

  const loadStats = async () => {
    try {
      const catalogStats = await getCatalogStats()
      setStats(catalogStats)
    } catch (error) {
      console.error('Failed to load catalog stats:', error)
    }
  }

  const loadActiveTasks = async () => {
    try {
      const tasks = await getActiveTasks()
      setActiveTasks(tasks)
    } catch (error) {
      console.error('Failed to load active tasks:', error)
    }
  }

  const updateTasksStatus = async () => {
    const updatedTasks = await Promise.all(
      runningTasks.map(async (task) => {
        try {
          const status = await getTaskStatus(task.id)
          return { ...task, status }
        } catch (error) {
          console.error(`Failed to update task ${task.id}:`, error)
          return task
        }
      })
    )
    
    setRunningTasks(updatedTasks)
    
    // Удаляем завершенные задачи после 30 секунд
    const now = new Date()
    const filteredTasks = updatedTasks.filter(task => {
      if (task.status.state === 'SUCCESS' || task.status.state === 'FAILURE') {
        const timeDiff = now.getTime() - task.startTime.getTime()
        return timeDiff < 30000 // 30 секунд
      }
      return true
    })
    
    if (filteredTasks.length !== updatedTasks.length) {
      setRunningTasks(filteredTasks)
    }
  }

  const startParsing = async (type: 'full' | 'simple' | 'test' | 'test-parser') => {
    if (!query.trim() && type !== 'test' && type !== 'test-parser') {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Введите поисковый запрос'
      })
      return
    }

    setLoading(true)
    
    try {
      let response
      
      switch (type) {
        case 'full':
          response = await startFullParsing({ query: query.trim(), limit, domain })
          break
        case 'simple':
          response = await startSimpleParsing(query.trim(), limit, domain)
          break
        case 'test':
          response = await startTestChain()
          break
        case 'test-parser':
          response = await startTestParser(query.trim() || 'jeans', limit, domain)
          break
      }
      
      const newTask: RunningTask = {
        id: response.task_id,
        query: type === 'test' ? 'Test Chain' : type === 'test-parser' ? `Test Parser: ${query.trim() || 'jeans'}` : query.trim(),
        domain,
        limit,
        type,
        status: { task_id: response.task_id, state: 'PENDING' },
        startTime: new Date()
      }
      
      setRunningTasks(prev => [...prev, newTask])
      
      toast({
        title: 'Парсинг запущен',
        description: `Задача ${response.task_id} добавлена в очередь`,
        className: 'border-0 bg-blue-500 text-white shadow-lg'
      })
      
      // Отслеживаем прогресс
      waitForTask(response.task_id, (status) => {
        setRunningTasks(prev => 
          prev.map(task => 
            task.id === response.task_id 
              ? { ...task, status }
              : task
          )
        )
      }).then(async (finalStatus) => {
        if (finalStatus.state === 'SUCCESS') {
          // Получаем детальный результат
          try {
            const taskResult = await getTaskResult(response.task_id)
            setRunningTasks(prev => 
              prev.map(task => 
                task.id === response.task_id 
                  ? { ...task, result: taskResult }
                  : task
              )
            )
          } catch (error) {
            console.error('Failed to get task result:', error)
          }
          
          toast({
            title: 'Парсинг завершен',
            description: `Задача ${response.task_id} выполнена успешно`,
            className: 'border-0 bg-green-500 text-white shadow-lg'
          })
          loadStats() // Обновляем статистику
        } else {
          toast({
            variant: 'destructive',
            title: 'Ошибка парсинга',
            description: `Задача ${response.task_id} завершилась с ошибкой`
          })
        }
      }).catch((error) => {
        console.error('Task monitoring error:', error)
      })
      
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка запуска',
        description: error.message || 'Не удалось запустить парсинг'
      })
    } finally {
      setLoading(false)
    }
  }

  // Новый метод для запуска парсинга по страницам через обычный парсер с параметром page
  const startPageParsing = async () => {
    if (!query.trim() || pageFrom < 1 || pageTo < pageFrom) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Проверьте поисковый запрос и диапазон страниц'
      })
      return
    }
    setPageLoading(true)
    setPageTasks([])
    const tasks: RunningTask[] = []
    for (let page = pageFrom; page <= pageTo; page++) {
      try {
        // Используем обычный парсер (startSimpleParsing) с параметром page
        const response = await startSimpleParsing(query.trim(), limit, domain, page)
        const newTask: RunningTask = {
          id: response.task_id,
          query: `${query.trim()} (стр. ${page})`,
          domain,
          limit,
          type: 'page',
          status: { task_id: response.task_id, state: 'PENDING' },
          startTime: new Date()
        }
        tasks.push(newTask)
        // Отслеживаем прогресс
        waitForTask(response.task_id, (status) => {
          setPageTasks(prev => prev.map(t => t.id === response.task_id ? { ...t, status } : t))
        }).then(async (finalStatus) => {
          if (finalStatus.state === 'SUCCESS') {
            try {
              const taskResult = await getTaskResult(response.task_id)
              setPageTasks(prev => prev.map(t => t.id === response.task_id ? { ...t, result: taskResult } : t))
            } catch {}
          }
        })
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: `Ошибка запуска (стр. ${page})`,
          description: error.message || 'Не удалось запустить парсинг'
        })
      }
    }
    setPageTasks(tasks)
    setPageLoading(false)
  }

  const handleCancelTask = async (taskId: string) => {
    try {
      await cancelTask(taskId)
      setRunningTasks(prev => prev.filter(task => task.id !== taskId))
      toast({
        title: 'Задача отменена',
        description: `Задача ${taskId} была остановлена`,
        className: 'border-0 bg-yellow-500 text-white shadow-lg'
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка отмены',
        description: error.message || 'Не удалось отменить задачу'
      })
    }
  }

  const getTaskIcon = (state: string) => {
    switch (state) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'PROGRESS':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'SUCCESS':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'FAILURE':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'SUCCESS': return 'bg-green-100 text-green-800 border-green-200'
      case 'FAILURE': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDuration = (startTime: Date) => {
    const now = new Date()
    const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000)
    
    if (diff < 60) return `${diff}с`
    if (diff < 3600) return `${Math.floor(diff / 60)}м ${diff % 60}с`
    return `${Math.floor(diff / 3600)}ч ${Math.floor((diff % 3600) / 60)}м`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">🚀 Парсер товаров</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Автоматизированный импорт товаров из каталога Lamoda с ИИ обработкой</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Badge 
            variant={isHealthy === true ? "default" : isHealthy === false ? "destructive" : "secondary"}
            className="flex items-center gap-1 text-xs sm:text-sm"
          >
            {isHealthy === true ? (
              <>
                <CheckCircle className="h-3 w-3" />
                <span className="hidden sm:inline">Система готова</span>
                <span className="sm:hidden">Готов</span>
              </>
            ) : isHealthy === false ? (
              <>
                <XCircle className="h-3 w-3" />
                <span className="hidden sm:inline">Система недоступна</span>
                <span className="sm:hidden">Ошибка</span>
              </>
            ) : (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="hidden sm:inline">Проверка...</span>
                <span className="sm:hidden">Проверка</span>
              </>
            )}
          </Badge>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              checkSystemHealth()
              loadStats()
              loadActiveTasks()
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Всего товаров</p>
                  <p className="text-lg sm:text-2xl font-bold">{stats.total_items.toLocaleString()}</p>
                </div>
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">За неделю</p>
                  <p className="text-lg sm:text-2xl font-bold">{stats.recent_items_week.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Ср. цена</p>
                  <p className="text-lg sm:text-2xl font-bold">{Math.round(stats.price_range.average).toLocaleString()}₸</p>
                </div>
                <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Активных задач</p>
                  <p className="text-lg sm:text-2xl font-bold">{activeTasks.length}</p>
                </div>
                <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap sm:flex-nowrap space-y-1 sm:space-y-0 sm:space-x-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('parser')}
          className={cn(
            'flex-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors',
            activeTab === 'parser'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="hidden sm:inline">Парсер</span>
          <span className="sm:hidden">Парсер</span>
        </button>
        <button
          onClick={() => setActiveTab('pages')}
          className={cn(
            'flex-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors',
            activeTab === 'pages'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="hidden sm:inline">Парсинг по страницам</span>
          <span className="sm:hidden">Страницы</span>
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={cn(
            'flex-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors',
            activeTab === 'tasks'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="hidden sm:inline">Задачи ({activeTasks.length})</span>
          <span className="sm:hidden">Задачи</span>
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={cn(
            'flex-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors',
            activeTab === 'analytics'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="hidden sm:inline">Аналитика</span>
          <span className="sm:hidden">Аналитика</span>
        </button>
      </div>

      {/* Parser Tab */}
      {activeTab === 'parser' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Новый парсинг
              </CardTitle>
              <CardDescription>
                Настройте параметры парсинга и запустите извлечение товаров из Lamoda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="query">Поисковый запрос</Label>
                  <Input
                    id="query"
                    placeholder="nike кроссовки, платье, джинсы..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="domain">Домен</Label>
                  <Select value={domain} onValueChange={(value: 'ru' | 'kz' | 'by') => setDomain(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kz">🇰🇿 Казахстан (lamoda.kz)</SelectItem>
                      <SelectItem value="ru">🇷🇺 Россия (lamoda.ru)</SelectItem>
                      <SelectItem value="by">🇧🇾 Беларусь (lamoda.by)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="limit">Количество товаров</Label>
                  <Input
                    id="limit"
                    type="number"
                    min="1"
                    max="100"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-4">
                <Button 
                  onClick={() => startParsing('full')}
                  disabled={loading || !isHealthy}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">{loading ? 'Запуск...' : 'Полный парсинг + ИИ + БД'}</span>
                  <span className="sm:hidden">{loading ? 'Запуск...' : 'Полный парсинг'}</span>
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => startParsing('simple')}
                  disabled={loading || !isHealthy}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Только парсинг</span>
                  <span className="sm:hidden">Парсинг</span>
                </Button>
                
                <Button 
                  variant="secondary"
                  onClick={() => startParsing('test')}
                  disabled={loading || !isHealthy}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <Play className="h-4 w-4" />
                  <span className="hidden sm:inline">Тест системы</span>
                  <span className="sm:hidden">Тест</span>
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => startParsing('test-parser')}
                  disabled={loading || !isHealthy}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <Zap className="h-4 w-4" />
                  <span className="hidden sm:inline">Тест парсера</span>
                  <span className="sm:hidden">Тест парсера</span>
                </Button>
              </div>
              
              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/20">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100">Режимы парсинга:</p>
                    <ul className="mt-1 space-y-1 text-blue-700 dark:text-blue-300">
                      <li><strong>Полный парсинг:</strong> Парсинг → ИИ обработка → Сохранение в БД</li>
                      <li><strong>Только парсинг:</strong> Извлечение данных без сохранения</li>
                      <li><strong>Тест системы:</strong> Проверка работоспособности с минимальными данными</li>
                      <li><strong>Тест парсера:</strong> Проверка извлечения изображений с Lamoda</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Running Tasks */}
          {runningTasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Выполняющиеся задачи ({runningTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {runningTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {getTaskIcon(task.status.state)}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm sm:text-base truncate">{task.query}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {task.domain.toUpperCase()} • {task.limit} товаров • {formatDuration(task.startTime)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge className={cn("text-xs", getStateColor(task.status.state))}>
                            {task.status.state}
                          </Badge>
                          
                          {(task.status.state === 'PENDING' || task.status.state === 'PROGRESS') && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleCancelTask(task.id)}
                            >
                              <Square className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {task.status.meta?.status && (
                        <p className="text-sm text-muted-foreground">{task.status.meta.status}</p>
                      )}
                      
                      {task.status.meta?.progress !== undefined && (
                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${task.status.meta.progress}%` }}
                          />
                        </div>
                      )}
                      
                      {task.status.state === 'SUCCESS' && task.status.result && (
                        <div className="text-sm text-green-600 dark:text-green-400">
                          ✅ Обработано: {task.status.result.success_count || 0} товаров
                        </div>
                      )}
                      
                      {task.status.state === 'SUCCESS' && task.result?.result && (
                        <div className="mt-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-green-600">Результаты парсинга</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>Качество: {(task.result.result.quality_score * 100).toFixed(0)}%</span>
                              <span>•</span>
                              <span>Время: {task.result.result.parsing_time.toFixed(1)}с</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-h-96 overflow-y-auto">
                            {task.result.result.products.slice(0, 6).map((product: ParsedProduct, index: number) => (
                              <div key={index} className="border rounded-lg p-2 sm:p-3 space-y-2 bg-white dark:bg-gray-800">
                                <div className="aspect-square w-full bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden">
                                  {product.image_url ? (
                                    <img 
                                      src={`/api/catalog/image-proxy?url=${encodeURIComponent(product.image_url)}`}
                                      alt={product.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        target.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                  ) : null}
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs sm:text-sm hidden">
                                    Нет изображения
                                  </div>
                                </div>
                                
                                <div className="space-y-1">
                                  <p className="font-medium text-xs sm:text-sm line-clamp-2" title={product.name}>
                                    {product.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{product.brand}</p>
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-xs sm:text-sm">{product.price.toLocaleString()}₸</span>
                                    {product.old_price && product.old_price > product.price && (
                                      <span className="text-xs text-red-500 line-through">
                                        {product.old_price.toLocaleString()}₸
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground">Качество:</span>
                                    <span className="text-xs font-medium text-green-600">
                                      {(product.parse_quality * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  {product.image_urls && product.image_urls.length > 1 && (
                                    <p className="text-xs text-blue-600">
                                      +{product.image_urls.length - 1} изображений
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {task.result.result.products.length > 6 && (
                            <p className="text-sm text-muted-foreground text-center">
                              И еще {task.result.result.products.length - 6} товаров...
                            </p>
                          )}
                        </div>
                      )}
                      
                      {task.status.state === 'FAILURE' && (
                        <div className="text-sm text-red-600 dark:text-red-400">
                          ❌ Ошибка: {task.status.traceback || 'Неизвестная ошибка'}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Новая вкладка: Парсинг по страницам */}
      {activeTab === 'pages' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Парсинг по страницам Lamoda
              </CardTitle>
              <CardDescription>
                Укажите диапазон страниц и получите максимум уникальных товаров с Lamoda. Каждый запуск — новые уникальные товары!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="query-pages">Поисковый запрос</Label>
                  <Input
                    id="query-pages"
                    placeholder="nike кроссовки, платье, джинсы..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={pageLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain-pages">Домен</Label>
                  <Select value={domain} onValueChange={(value: 'ru' | 'kz' | 'by') => setDomain(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kz">🇰🇿 Казахстан (lamoda.kz)</SelectItem>
                      <SelectItem value="ru">🇷🇺 Россия (lamoda.ru)</SelectItem>
                      <SelectItem value="by">🇧🇾 Беларусь (lamoda.by)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="limit-pages">Товаров на страницу</Label>
                  <Input
                    id="limit-pages"
                    type="number"
                    min="1"
                    max="100"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    disabled={pageLoading}
                  />
                </div>
                <div className="flex gap-2 items-end">
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="page-from">Страница с</Label>
                    <Input
                      id="page-from"
                      type="number"
                      min="1"
                      value={pageFrom}
                      onChange={(e) => setPageFrom(Number(e.target.value))}
                      disabled={pageLoading}
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="page-to">по</Label>
                    <Input
                      id="page-to"
                      type="number"
                      min={pageFrom}
                      value={pageTo}
                      onChange={(e) => setPageTo(Number(e.target.value))}
                      disabled={pageLoading}
                    />
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <Button
                  onClick={startPageParsing}
                  disabled={pageLoading || !isHealthy}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  {pageLoading ? 'Запуск...' : 'Парсить диапазон страниц'}
                </Button>
              </div>
            </CardContent>
          </Card>
          {/* Прогресс и результаты по страницам */}
          {pageTasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Прогресс по страницам ({pageTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pageTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="border rounded-lg p-4 space-y-3 bg-gradient-to-br from-blue-50 to-purple-50"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {getTaskIcon(task.status.state)}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm sm:text-base truncate">{task.query}</p>
                            <p className="text-xs text-muted-foreground">{task.domain.toUpperCase()} • {task.limit} товаров</p>
                          </div>
                        </div>
                        <Badge className={cn('text-xs', getStateColor(task.status.state))}>{task.status.state}</Badge>
                      </div>
                      {task.status.meta?.status && (
                        <p className="text-sm text-muted-foreground">{task.status.meta.status}</p>
                      )}
                      {task.status.meta?.progress !== undefined && (
                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${task.status.meta.progress}%` }}
                          />
                        </div>
                      )}
                      {task.status.state === 'SUCCESS' && task.result?.result && (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2 text-green-700 text-sm">
                            <CheckCircle className="h-4 w-4" />
                            <span>Уникальных товаров: {task.result.result.success_count}</span>
                            <span className="text-muted-foreground">/ Всего: {task.result.result.total_found}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-h-80 overflow-y-auto">
                            {task.result.result.products.slice(0, 6).map((product: ParsedProduct, index: number) => (
                              <div key={index} className="border rounded-lg p-2 sm:p-3 space-y-2 bg-white dark:bg-gray-800">
                                <div className="aspect-square w-full bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden">
                                  {product.image_url ? (
                                    <img
                                      src={`/api/catalog/image-proxy?url=${encodeURIComponent(product.image_url)}`}
                                      alt={product.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        target.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                  ) : null}
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs sm:text-sm hidden">
                                    Нет изображения
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="font-medium text-xs sm:text-sm line-clamp-2" title={product.name}>{product.name}</p>
                                  <p className="text-xs text-muted-foreground">{product.brand}</p>
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-xs sm:text-sm">{product.price.toLocaleString()}₸</span>
                                    {product.old_price && product.old_price > product.price && (
                                      <span className="text-xs text-red-500 line-through">{product.price.toLocaleString()}₸</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground">Качество:</span>
                                    <span className="text-xs font-medium text-green-600">{(product.parse_quality * 100).toFixed(0)}%</span>
                                  </div>
                                  {product.image_urls && product.image_urls.length > 1 && (
                                    <p className="text-xs text-blue-600">+{product.image_urls.length - 1} изображений</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          {task.result.result.products.length > 6 && (
                            <p className="text-xs text-muted-foreground text-center">И еще {task.result.result.products.length - 6} товаров...</p>
                          )}
                        </div>
                      )}
                      {task.status.state === 'FAILURE' && (
                        <div className="text-sm text-red-600 dark:text-red-400">❌ Ошибка: {task.status.traceback || 'Неизвестная ошибка'}</div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Активные задачи системы
            </CardTitle>
            <CardDescription>
              Список всех выполняющихся задач в Celery
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Нет активных задач</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeTasks.map((task) => (
                  <div key={task.task_id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{task.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Worker: {task.worker} • Started: {new Date(task.time_start).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ID: {task.task_id}
                        </p>
                      </div>
                      <Badge variant="outline">Выполняется</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Top Brands */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Топ брендов</CardTitle>
                <CardDescription className="text-sm">Самые популярные бренды в каталоге</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.top_brands.slice(0, 5).map((brand, index) => (
                    <div key={brand.brand} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium flex-shrink-0">
                          {index + 1}
                        </div>
                        <span className="font-medium text-sm sm:text-base truncate">{brand.brand}</span>
                      </div>
                      <Badge variant="outline" className="text-xs sm:text-sm flex-shrink-0">{brand.count.toLocaleString()}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Топ категорий</CardTitle>
                <CardDescription className="text-sm">Самые популярные категории товаров</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.top_categories.slice(0, 5).map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-medium flex-shrink-0">
                          {index + 1}
                        </div>
                        <span className="font-medium text-sm sm:text-base truncate">{category.category}</span>
                      </div>
                      <Badge variant="outline" className="text-xs sm:text-sm flex-shrink-0">{category.count.toLocaleString()}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Price Range */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Ценовой диапазон</CardTitle>
              <CardDescription className="text-sm">Статистика по ценам товаров в каталоге</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{Math.round(stats.price_range.min).toLocaleString()}₸</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Минимальная цена</p>
                </div>
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{Math.round(stats.price_range.average).toLocaleString()}₸</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Средняя цена</p>
                </div>
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-purple-600">{Math.round(stats.price_range.max).toLocaleString()}₸</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Максимальная цена</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </motion.div>
  )
}

export default LamodaParser 