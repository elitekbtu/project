import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { useToast } from '../ui/use-toast'
import { 
  getPerformanceMetrics, 
  cleanupOldContexts, 
  checkSystemHealth,
  type PerformanceMetrics,
  type HealthResponse
} from '../../api/chatStylist'
import { 
  BarChart3, 
  Trash2, 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react'

const ChatStylistAdmin = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [cleaning, setCleaning] = useState(false)
  const [maxAgeHours, setMaxAgeHours] = useState(24)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [metricsData, healthData] = await Promise.all([
        getPerformanceMetrics(),
        checkSystemHealth()
      ])
      setMetrics(metricsData)
      setHealth(healthData)
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось загрузить данные системы агентов'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCleanup = async () => {
    setCleaning(true)
    try {
      const result = await cleanupOldContexts(maxAgeHours)
      toast({
        title: 'Очистка завершена',
        description: result.message
      })
      // Перезагружаем данные
      await loadData()
    } catch (error) {
      console.error('Ошибка очистки:', error)
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось выполнить очистку'
      })
    } finally {
      setCleaning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Управление ИИ-стилистом</h1>
          <p className="text-muted-foreground">Мониторинг и управление системой агентов</p>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Обновить
        </Button>
      </div>

      {/* Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Состояние системы
          </CardTitle>
        </CardHeader>
        <CardContent>
          {health ? (
            <div className="flex items-center gap-4">
              <Badge variant={health.status === 'healthy' ? 'default' : 'destructive'}>
                {health.status === 'healthy' ? (
                  <CheckCircle className="w-4 h-4 mr-1" />
                ) : (
                  <XCircle className="w-4 h-4 mr-1" />
                )}
                {health.status === 'healthy' ? 'Работает' : 'Ошибка'}
              </Badge>
              <span className="text-sm text-muted-foreground">{health.message}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Состояние неизвестно</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Всего разговоров</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total_conversations}</div>
              <p className="text-xs text-muted-foreground">
                Успешных: {metrics.successful_conversations}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Успешность</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(metrics.success_rate * 100)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Неудачных: {metrics.failed_conversations}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Среднее время</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.average_response_time.toFixed(2)}s
              </div>
              <p className="text-xs text-muted-foreground">
                Время обработки
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Активные контексты</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.active_contexts}</div>
              <p className="text-xs text-muted-foreground">
                Пользователей онлайн
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Agent Statistics */}
      {metrics?.agent_stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Статистика агентов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(metrics.agent_stats).map(([agentName, stats]) => (
                <div key={agentName} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">
                      {agentName.replace('_', ' ')}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {stats.requests_processed || 0}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Успешных:</span>
                      <span>{stats.successful_requests || 0}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Fallback:</span>
                      <span>{stats.fallback_used || 0}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Среднее время:</span>
                      <span>{(stats.average_processing_time || 0).toFixed(2)}s</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cleanup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Очистка контекстов
          </CardTitle>
          <CardDescription>
            Удаление старых контекстов разговоров для освобождения памяти
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxAge">Максимальный возраст (часы)</Label>
              <Input
                id="maxAge"
                type="number"
                value={maxAgeHours}
                onChange={(e) => setMaxAgeHours(Number(e.target.value))}
                min="1"
                max="168"
                className="w-32"
              />
            </div>
            <Button 
              onClick={handleCleanup} 
              disabled={cleaning}
              variant="destructive"
            >
              {cleaning ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Очистить
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Будут удалены контексты старше {maxAgeHours} часов
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default ChatStylistAdmin 