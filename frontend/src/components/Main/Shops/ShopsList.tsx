import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Store, Package, Calendar, ArrowRight, Search, User, Building2 } from 'lucide-react'
import { shopsApi, type Shop } from '../../../api/shops'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Card, CardContent } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { Skeleton } from '../../ui/skeleton'

const ShopsList = () => {
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Функция для загрузки данных
  const fetchShops = async (q?: string) => {
    const data = await shopsApi.getShops()
    // Фильтрация по поиску на клиенте, так как API не поддерживает пагинацию
    if (q && q.trim()) {
      return data.filter(shop =>
        shop.name.toLowerCase().includes(q.toLowerCase()) ||
        shop.moderator_name.toLowerCase().includes(q.toLowerCase())
      )
    }
    return data
  }

  // Загрузка данных
  useEffect(() => {
    const loadShops = async () => {
      setLoading(true)
      try {
        const data = await fetchShops(search)
        setShops(data)
      } catch (error) {
        console.error('Error fetching shops:', error)
      } finally {
        setLoading(false)
      }
    }
    loadShops()
  }, [search])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Поиск уже работает через useEffect выше
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  // Loading State
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <Skeleton className="h-9 w-48 mb-4" />
          <Skeleton className="h-5 w-96" />
        </div>

        {/* Search Skeleton */}
        <div className="mb-8">
          <Skeleton className="h-10 w-full max-w-md" />
        </div>

        {/* Grid Skeleton */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-[4/3] animate-pulse bg-muted" />
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="mb-4 font-display text-3xl font-bold tracking-tight">Магазины</h1>
        <p className="text-muted-foreground">Откройте для себя уникальные коллекции от наших модераторов</p>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mb-8"
      >
        <form onSubmit={handleSearch} className="flex w-full max-w-md items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск магазинов..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </motion.div>

      {/* Shops Grid */}
      {shops.length > 0 ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {shops.map((shop) => (
            <motion.div key={shop.id} variants={itemVariants}>
              <Card className="group overflow-hidden transition-all hover:shadow-lg border-0 shadow-sm">
                <Link to={`/shops/${shop.id}/items`}>
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {shop.avatar ? (
                      <img
                        src={shop.avatar.startsWith('/') ? `${window.location.origin}${shop.avatar}` : shop.avatar}
                        alt={shop.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    
                    {/* Fallback avatar with initials */}
                    <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40 ${shop.avatar ? 'hidden' : ''}`}>
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg">
                        <span className="text-2xl font-bold">
                          {shop.moderator_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Overlay with shop info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="absolute bottom-4 left-4 right-4 text-white">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="h-4 w-4" />
                          <span className="text-sm font-medium">{shop.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            <span>{shop.items_count} товаров</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{shop.moderator_name}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Badge */}
                    <div className="absolute top-3 left-3">
                      <Badge variant="secondary" className="bg-white/90 text-foreground hover:bg-white">
                        <Store className="mr-1 h-3 w-3" />
                        Магазин
                      </Badge>
                    </div>
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="mb-3">
                      <h3 className="font-medium leading-tight text-lg mb-1" title={shop.name}>
                        {shop.name}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {shop.moderator_name}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          <span>{shop.items_count} товаров</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(shop.created_at).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                      
                      <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center py-16"
        >
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
            <Building2 className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">Магазины не найдены</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {search ? 'Попробуйте изменить поисковый запрос' : 'В данный момент нет доступных магазинов'}
          </p>
        </motion.div>
      )}


    </div>
  )
}

export default ShopsList 