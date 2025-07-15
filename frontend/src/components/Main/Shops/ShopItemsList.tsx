import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { shopsApi, type Shop } from '../../../api/shops'
import { Card, CardContent } from '../../ui/card'
import { Input } from '../../ui/input'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Search,  Heart, ShoppingBag, ChevronLeft } from 'lucide-react'
import { useFavorites } from '../../../context/FavoritesContext'
import ImageCarousel from '../../common/ImageCarousel'
import ItemImage from '../../common/ItemImage'
import { CATEGORY_LABELS } from '../../../constants'
import { Skeleton } from '../../ui/skeleton'

interface Item {
  id: number
  name: string
  price?: number | null
  image_url?: string | null
  image_urls?: string[] | null
  brand?: string | null
  category?: string | null
}

const ShopItemsList = () => {
  const { moderatorId } = useParams<{ moderatorId: string }>()
  const [items, setItems] = useState<Item[]>([])
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const { isFavorite, toggleFavorite } = useFavorites()

  // Функция для загрузки данных
  const fetchItems = async (pageToLoad: number, q?: string) => {
    if (!moderatorId) return []
    const filters: any = {}
    if (q !== undefined && q !== null && q !== '') filters.q = q
    const response = await shopsApi.getShopItems(parseInt(moderatorId), pageToLoad, 20, filters)
    return response.items
  }

  // Загрузка информации о магазине
  useEffect(() => {
    const loadShop = async () => {
      if (!moderatorId) return
      try {
        const shopData = await shopsApi.getShop(parseInt(moderatorId))
        setShop(shopData)
      } catch (error) {
        console.error('Error fetching shop:', error)
      }
    }
    loadShop()
  }, [moderatorId])

  // Загрузка первой страницы или нового поиска
  useEffect(() => {
    setLoading(true)
    setItems([])
    setHasMore(true)
    setPage(1)
    fetchItems(1, search).then(data => {
      setItems(data)
      setHasMore(data.length === 20)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [search, moderatorId])

  // Загрузка следующих страниц
  useEffect(() => {
    if (page === 1) return
    setLoadingMore(true)
    fetchItems(page, search).then(data => {
      setItems(prev => [...prev, ...data])
      setHasMore(data.length === 20)
      setLoadingMore(false)
    })
  }, [page, moderatorId])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(search) // триггерит useEffect выше
  }

  // Infinite scroll observer
  const observer = useRef<IntersectionObserver | null>(null)
  const lastItemRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return
      if (!hasMore) return
      if (observer.current) observer.current.disconnect()
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setPage((prev) => prev + 1)
        }
      })
      if (node) observer.current.observe(node)
    },
    [loading, hasMore],
  )

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

  const getDisplayPrice = (item: Item): number | undefined => {
    if ((item as any).variants && (item as any).variants.length > 0) {
      const prices = (item as any).variants.map((v: any) => v.price).filter((p: any) => typeof p === 'number') as number[]
      if (prices.length > 0) return Math.min(...prices)
    }
    return item.price ?? undefined
  }

  // Loading State
  if (loading && !shop) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <Skeleton className="h-6 w-24 rounded-full mb-4" />
          <Skeleton className="h-9 w-48 mb-4" />
          <Skeleton className="h-5 w-96" />
        </div>

        {/* Search Skeleton */}
        <div className="mb-8">
          <Skeleton className="h-10 w-full max-w-md" />
        </div>

        {/* Grid Skeleton */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-[3/4] animate-pulse bg-muted" />
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
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6"
      >
        <Button asChild variant="ghost" className="pl-0 hover:bg-transparent">
          <Link to="/shops" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Назад к магазинам
          </Link>
        </Button>
      </motion.div>

      {/* Shop info */}
      {shop && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <div className="mb-4">
            <h1 className="mb-2 font-display text-3xl font-bold tracking-tight">{shop.name}</h1>
          </div>
        </motion.div>
      )}

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mb-8"
      >
        <form onSubmit={handleSearch} className="flex w-full max-w-md items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск товаров..."
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

      {/* Items Grid */}
      {items.length > 0 ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {items.map((item, idx) => {
            const refProp = idx === items.length - 1 ? { ref: lastItemRef } : {}
            return (
              <motion.div key={item.id} variants={itemVariants} {...refProp}>
                <Card className="group overflow-hidden transition-all hover:shadow-lg">
                  <Link to={`/shops/${moderatorId}/items/${item.id}`}>
                    <div className="relative aspect-[3/4] overflow-hidden">
                      {item.image_urls && item.image_urls.length > 0 ? (
                        <ImageCarousel images={item.image_urls} className="transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <ItemImage
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          fallbackClassName="h-full w-full"
                        />
                      )}
                      <div className="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 rounded-full"
                          onClick={async (e) => {
                            e.preventDefault()
                            await toggleFavorite(item.id)
                          }}
                        >
                          <Heart
                            className={`h-4 w-4 ${isFavorite(item.id) ? 'fill-primary text-primary' : ''}`}
                          />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="mb-2">
                        {item.category && (
                          <Badge variant="outline" className="mb-2 text-xs capitalize">
                            {CATEGORY_LABELS[item.category] ?? item.category}
                          </Badge>
                        )}
                        <h3 className="font-medium leading-tight" title={item.name}>
                          {item.name}
                        </h3>
                        {item.brand && (
                          <p className="text-sm text-muted-foreground">{item.brand}</p>
                        )}
                      </div>
                      {(() => {
                        const price = getDisplayPrice(item)
                        return price !== undefined ? (
                          <p className="font-semibold">{price.toLocaleString()} ₸</p>
                        ) : null
                      })()}
                    </CardContent>
                  </Link>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      ) : !loading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center py-16"
        >
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">Товары не найдены</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {search ? 'Попробуйте изменить поисковый запрос' : 'В данном магазине пока нет товаров'}
          </p>
        </motion.div>
      ) : null}

      {/* Loading More Indicator */}
      {loadingMore && (
        <div className="mt-8 flex justify-center">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <span className="text-sm text-muted-foreground">Загрузка...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShopItemsList 