import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  Package, 
  Layers, 
  Eye, 
  Heart, 
  Activity,
  BarChart3,
  Shield,
  Zap,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { useToast } from '../ui/use-toast'
import { getSystemAnalytics, getSystemHealth, getSystemPerformance, type SystemAnalytics as SystemAnalyticsType, type SystemHealth, type SystemPerformance } from '../../api/system'
import { cn } from '../../lib/utils'

const SystemAnalytics = () => {
  const [analytics, setAnalytics] = useState<SystemAnalyticsType | null>(null)
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [performance, setPerformance] = useState<SystemPerformance | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [authError, setAuthError] = useState(false)
  const [serverError, setServerError] = useState(false)
  const { toast } = useToast()

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      setAuthError(false)
      setServerError(false)

      const [analyticsData, healthData, performanceData] = await Promise.all([
        getSystemAnalytics(),
        getSystemHealth(),
        getSystemPerformance()
      ])

      setAnalytics(analyticsData)
      setHealth(healthData)
      setPerformance(performanceData)
    } catch (error: any) {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setAuthError(true)
      } else {
        setServerError(true)
      }
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось загрузить системную аналитику',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRefresh = () => {
    fetchData(true)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (authError) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-red-500 text-lg font-semibold">Нет доступа. Войдите как администратор.</p>
      </div>
    )
  }

  if (serverError) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-red-500 text-lg font-semibold">Ошибка сервера. Обратитесь к разработчику.</p>
      </div>
    )
  }

  if (!analytics || !health || !performance) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Не удалось загрузить данные</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Системная аналитика
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Полный анализ системы и мониторинг производительности
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          variant="outline"
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Обновить</span>
          <span className="sm:hidden">Обновить</span>
        </Button>
      </div>

      {/* System Health Status */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Состояние системы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Удалено: статус и база данных */}
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="font-medium text-sm sm:text-base">Пользователей: {health.users_count}</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-500" />
              <span className="font-medium text-sm sm:text-base">Товаров: {health.items_count}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex flex-wrap sm:flex-nowrap space-y-1 sm:space-y-0 sm:space-x-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            'flex-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors',
            activeTab === 'overview'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="hidden sm:inline">Обзор</span>
          <span className="sm:hidden">Обзор</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            'flex-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors',
            activeTab === 'users'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="hidden sm:inline">Пользователи</span>
          <span className="sm:hidden">Пользователи</span>
        </button>
        <button
          onClick={() => setActiveTab('content')}
          className={cn(
            'flex-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors',
            activeTab === 'content'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="hidden sm:inline">Контент</span>
          <span className="sm:hidden">Контент</span>
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={cn(
            'flex-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors',
            activeTab === 'performance'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="hidden sm:inline">Производительность</span>
          <span className="sm:hidden">Производительность</span>
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Всего пользователей</p>
                    <p className="text-xl sm:text-3xl font-bold">{analytics.system_info.total_users}</p>
                    <p className="text-xs sm:text-sm text-green-600">+{analytics.system_info.new_users_month} за месяц</p>
                  </div>
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Всего товаров</p>
                    <p className="text-xl sm:text-3xl font-bold">{analytics.content_stats.total_items}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{analytics.content_stats.items_with_price} с ценами</p>
                  </div>
                  <Package className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Всего образов</p>
                    <p className="text-xl sm:text-3xl font-bold">{analytics.content_stats.total_outfits}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{analytics.content_stats.public_outfits} публичных</p>
                  </div>
                  <Layers className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Активность</p>
                    <p className="text-xl sm:text-3xl font-bold">{analytics.activity_stats.total_views}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">просмотров</p>
                  </div>
                  <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Активность за последние 7 дней</CardTitle>
              <CardDescription className="text-sm">Просмотры и избранное по дням</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.daily_activity.reverse().map((day) => (
                  <div key={day.date} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-medium text-sm sm:text-base">{new Date(day.date).toLocaleDateString('ru-RU')}</span>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-blue-500" />
                        <span className="text-sm sm:text-base">{day.views}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-red-500" />
                        <span className="text-sm sm:text-base">{day.favorites}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* User Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Статистика пользователей</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base">Всего пользователей</span>
                    <Badge variant="outline" className="text-xs sm:text-sm">{analytics.system_info.total_users}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base">Активных пользователей</span>
                    <Badge variant="outline" className="text-xs sm:text-sm">{analytics.system_info.active_users}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base">Модераторов</span>
                    <Badge variant="outline" className="text-xs sm:text-sm">{analytics.system_info.moderators}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base">Администраторов</span>
                    <Badge variant="outline" className="text-xs sm:text-sm">{analytics.system_info.admins}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base">Новых за месяц</span>
                    <Badge variant="outline" className="text-xs sm:text-sm text-green-600">{analytics.system_info.new_users_month}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Moderator Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Статистика модераторов</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.moderator_stats.map((moderator) => (
                    <div key={moderator.user_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-medium text-sm sm:text-base truncate">{moderator.name}</span>
                        {moderator.is_active ? (
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs sm:text-sm flex-shrink-0">{moderator.items_count} товаров</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Top Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Топ категорий</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.top_categories.slice(0, 8).map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-medium flex-shrink-0">
                          {index + 1}
                        </div>
                        <span className="font-medium text-sm sm:text-base truncate">{category.category}</span>
                      </div>
                      <Badge variant="outline" className="text-xs sm:text-sm flex-shrink-0">{category.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Brands */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Топ брендов</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.top_brands.slice(0, 8).map((brand, index) => (
                    <div key={brand.brand} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-medium flex-shrink-0">
                          {index + 1}
                        </div>
                        <span className="font-medium text-sm sm:text-base truncate">{brand.brand}</span>
                      </div>
                      <Badge variant="outline" className="text-xs sm:text-sm flex-shrink-0">{brand.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Popular Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Популярные товары</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.popular_items.slice(0, 5).map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-medium flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-sm sm:text-base truncate block">{item.name}</span>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">{item.brand}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Heart className="h-4 w-4 text-red-500" />
                        <Badge variant="outline" className="text-xs sm:text-sm">{item.likes}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Popular Outfits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Популярные образы</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.popular_outfits.slice(0, 5).map((outfit, index) => (
                    <div key={outfit.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-medium flex-shrink-0">
                          {index + 1}
                        </div>
                        <span className="font-medium text-sm sm:text-base truncate">{outfit.name}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Heart className="h-4 w-4 text-red-500" />
                        <Badge variant="outline" className="text-xs sm:text-sm">{outfit.likes}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Запросов/час</p>
                    <p className="text-xl sm:text-3xl font-bold">{performance.requests_per_hour}</p>
                  </div>
                  <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Активных пользователей/час</p>
                    <p className="text-xl sm:text-3xl font-bold">{performance.active_users_hour}</p>
                  </div>
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">База данных</p>
                    <p className="text-xl sm:text-3xl font-bold">
                      {health.database === 'connected' ? 'healthy' : 'disconnected'}
                    </p>
                    {health.database === 'connected' && (
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        Соединений: {performance.database_connections}
                      </span>
                    )}
                  </div>
                  {health.database === 'connected' ? (
                    <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                  ) : (
                    <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Память</p>
                    <p className="text-xl sm:text-3xl font-bold">{performance.memory_usage}</p>
                  </div>
                  <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Статистика активности</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{analytics.activity_stats.total_views}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Просмотров</p>
                </div>
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-red-600">{analytics.activity_stats.total_favorites}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Избранных товаров</p>
                </div>
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{analytics.activity_stats.total_outfit_favorites}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Избранных образов</p>
                </div>
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-purple-600">{analytics.activity_stats.total_comments}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Комментариев</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Generated At */}
      <div className="text-center">
        <p className="text-xs sm:text-sm text-muted-foreground">
          Данные обновлены: {new Date(analytics.generated_at).toLocaleString('ru-RU')}
        </p>
      </div>
    </motion.div>
  )
}

export default SystemAnalytics 