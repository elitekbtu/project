import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  DollarSign, 
  Users, 
  Eye, 
  MessageSquare,
  Heart,
  Calendar,
  Target,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { useToast } from '../ui/use-toast'
import { getModeratorAnalytics, type ModeratorAnalytics } from '../../api/items'
import { cn } from '../../lib/utils'

const ModeratorAnalytics = () => {
  const [analytics, setAnalytics] = useState<ModeratorAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  const fetchAnalytics = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      
      const data = await getModeratorAnalytics()
      setAnalytics(data)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось загрузить аналитику',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const handleRefresh = () => {
    fetchAnalytics(true)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Не удалось загрузить аналитику</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="container mx-auto px-4 py-8"
    >
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Аналитика товаров
          </h1>
          <p className="text-muted-foreground">
            Модератор: {analytics.moderator_info.user_name}
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          variant="outline"
          className="flex items-center gap-2"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Обновить
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Всего товаров</p>
                <p className="text-3xl font-bold">{analytics.overview.total_items}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">За неделю</p>
                <p className="text-3xl font-bold">{analytics.overview.items_this_week}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ср. цена</p>
                <p className="text-3xl font-bold">
                  {Math.round(analytics.price_analysis.average_price).toLocaleString()}₸
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Рост</p>
                <p className={cn(
                  "text-3xl font-bold",
                  analytics.recent_activity.growth_rate > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {analytics.recent_activity.growth_rate > 0 ? '+' : ''}{analytics.recent_activity.growth_rate}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Категории товаров</CardTitle>
            <CardDescription>Распределение по категориям</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.categories.slice(0, 8).map((category, index) => (
                <div key={category.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <span className="font-medium">{category.category}</span>
                  </div>
                  <Badge variant="outline">{category.count}</Badge>
                </div>
              ))}
              {analytics.categories.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  Нет данных о категориях
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Brands */}
        <Card>
          <CardHeader>
            <CardTitle>Бренды</CardTitle>
            <CardDescription>Топ брендов в ваших товарах</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.brands.slice(0, 8).map((brand, index) => (
                <div key={brand.brand} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <span className="font-medium">{brand.brand}</span>
                  </div>
                  <Badge variant="outline">{brand.count}</Badge>
                </div>
              ))}
              {analytics.brands.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  Нет данных о брендах
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Price Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Ценовой анализ</CardTitle>
            <CardDescription>Статистика по ценам товаров</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {Math.round(analytics.price_analysis.min_price).toLocaleString()}₸
                  </p>
                  <p className="text-sm text-muted-foreground">Минимальная</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.round(analytics.price_analysis.average_price).toLocaleString()}₸
                  </p>
                  <p className="text-sm text-muted-foreground">Средняя</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.round(analytics.price_analysis.max_price).toLocaleString()}₸
                  </p>
                  <p className="text-sm text-muted-foreground">Максимальная</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Товаров с ценой: {analytics.price_analysis.items_with_price} из {analytics.overview.total_items}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Popular Items */}
        <Card>
          <CardHeader>
            <CardTitle>Популярные товары</CardTitle>
            <CardDescription>Товары с наибольшим количеством лайков</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.popular_items.by_likes.slice(0, 5).map((item, index) => (
                <div key={item.item_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <span className="font-medium truncate max-w-32">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4 text-red-500" />
                    <Badge variant="outline">{item.likes}</Badge>
                  </div>
                </div>
              ))}
              {analytics.popular_items.by_likes.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  Нет данных о популярности
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Активность</CardTitle>
          <CardDescription>Статистика активности за последний месяц</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold">За неделю</h3>
              </div>
              <p className="text-2xl font-bold">{analytics.recent_activity.last_week_items}</p>
              <p className="text-sm text-muted-foreground">товаров добавлено</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Target className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold">За месяц</h3>
              </div>
              <p className="text-2xl font-bold">{analytics.recent_activity.last_month_items}</p>
              <p className="text-sm text-muted-foreground">товаров добавлено</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold">Рост</h3>
              </div>
              <p className={cn(
                "text-2xl font-bold",
                analytics.recent_activity.growth_rate > 0 ? "text-green-600" : "text-red-600"
              )}>
                {analytics.recent_activity.growth_rate > 0 ? '+' : ''}{analytics.recent_activity.growth_rate}%
              </p>
              <p className="text-sm text-muted-foreground">по сравнению с прошлым периодом</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated At */}
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Данные обновлены: {new Date(analytics.generated_at).toLocaleString('ru-RU')}
        </p>
      </div>
    </motion.div>
  )
}

export default ModeratorAnalytics 