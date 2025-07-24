import { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { listItems } from '../../../api/items'
import { Card, CardContent } from '../../ui/card'
import { Input } from '../../ui/input'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Search, Filter, Heart, ShoppingBag } from 'lucide-react'
import { useFavorites } from '../../../context/FavoritesContext'
import ImageCarousel from '../../common/ImageCarousel'
import ItemImage from '../../common/ItemImage'
import { CATEGORY_LABELS } from '../../../constants'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../../ui/select'
import { Switch } from '../../ui/switch'
import { Popover, PopoverTrigger, PopoverContent } from '../../ui/popover'
import { Label } from '../../ui/label'
import { Helmet } from 'react-helmet-async'

interface Item {
  id: number
  name: string
  price?: number | null
  image_url?: string | null
  image_urls?: string[] | null
  brand?: string | null
  category?: string | null
  variants?: any[] | null
}

const ItemsList = () => {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const { isFavorite, toggleFavorite } = useFavorites()
  const [category, setCategory] = useState<string | undefined>(undefined)
  const [onlyDiscount, setOnlyDiscount] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')

  // Функция для загрузки данных
  const fetchItems = async (pageToLoad: number, q?: string, cat?: string | undefined, discount?: boolean) => {
    const params: any = { page: pageToLoad }
    if (q !== undefined && q !== null && q !== '') params.q = q
    if (cat && cat !== 'all') params.category = cat
    const data = await listItems(params)
    // Фильтрация по скидке и цене на клиенте
    let filteredData = data
    if (discount) {
      filteredData = filteredData.filter((item: Item) => getDiscountInfo(item).hasDiscount)
    }
    if (minPrice || maxPrice) {
      filteredData = filteredData.filter((item: Item) => {
        const price = getDisplayPrice(item)
        if (price === undefined) return false
        const min = minPrice ? parseFloat(minPrice) : 0
        const max = maxPrice ? parseFloat(maxPrice) : Infinity
        return price >= min && price <= max
      })
    }
    return filteredData
  }

  // Загрузка первой страницы или нового поиска/фильтра
  useEffect(() => {
    setLoading(true)
    setItems([])
    setHasMore(true)
    setPage(1)
    fetchItems(1, search, category, onlyDiscount).then(data => {
      setItems(data)
      setHasMore(data.length === 20)
      setLoading(false)
    })
  }, [search, category, onlyDiscount, minPrice, maxPrice])

  // Загрузка следующих страниц
  useEffect(() => {
    if (page === 1) return
    setLoadingMore(true)
    fetchItems(page, search, category, onlyDiscount).then(data => {
      setItems(prev => [...prev, ...data])
      setHasMore(data.length === 20)
      setLoadingMore(false)
    })
  }, [page])

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

  // Fetch next page when page state changes (except first, already fetched)
  useEffect(() => {
    if (page === 1) return
    fetchItems(page, search, category, onlyDiscount)
  }, [page, search, category, onlyDiscount])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  const getDisplayPrice = (item: Item): number | undefined => {
    if ((item as any).variants && (item as any).variants.length > 0) {
      const prices = (item as any).variants
        .map((v: any) => v.price)
        .filter((p: any) => typeof p === 'number' && p !== null) as number[]
      
      if (prices.length > 0) {
        const minPrice = Math.min(...prices)
        return minPrice
      }
    }
    return item.price ?? undefined
  }

  const getDiscountInfo = (item: Item): { hasDiscount: boolean; originalPrice?: number; discountPercent?: number } => {
    
    if (!item.price || typeof item.price !== 'number') {
      return { hasDiscount: false }
    }

    const displayPrice = getDisplayPrice(item)
    
    if (!displayPrice || displayPrice >= item.price) {
      return { hasDiscount: false }
    }

    const discountPercent = Math.round(((item.price - displayPrice) / item.price) * 100)
    
    return {
      hasDiscount: true,
      originalPrice: item.price,
      discountPercent
    }
  }

  return (
    <>
      <Helmet>
        <title>Каталог товаров — TRC</title>
        <meta name="description" content="Каталог модной одежды, аксессуаров и обуви на платформе TRC. Большой выбор, фильтры, тренды." />
        <meta name="keywords" content="каталог, одежда, обувь, аксессуары, мода, покупки, TRC" />
        <meta property="og:title" content="Каталог товаров — TRC" />
        <meta property="og:description" content="Каталог модной одежды, аксессуаров и обуви на платформе TRC." />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="mb-4 font-display text-3xl font-bold tracking-tight">Товары</h1>
          <p className="text-muted-foreground">Найдите идеальные вещи для вашего гардероба.</p>
        </motion.div>

        {/* Search & actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
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
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Фильтры
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="flex flex-col gap-4">
                <div>
                  <Label className="mb-1 block">Категория</Label>
                  <Select value={category || ""} onValueChange={v => setCategory(v === "" ? undefined : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Все категории" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все категории</SelectItem>
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="discount-switch">Только со скидкой</Label>
                  <Switch id="discount-switch" checked={onlyDiscount} onCheckedChange={setOnlyDiscount} />
                </div>
                <div className="space-y-2">
                  <Label className="block">Цена</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="От"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        type="number"
                        min="0"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="До"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        type="number"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="aspect-[3/4] animate-pulse bg-muted" />
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="h-4 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Items Grid */}
        {!loading && items.length > 0 && (
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
                    <Link to={`/items/${item.id}`}>
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
                        {/* Discount Badge */}
                        {(() => {
                          const discountInfo = getDiscountInfo(item)
                          return discountInfo.hasDiscount ? (
                            <div className="absolute top-3 left-3">
                              <Badge className="bg-red-500 text-white text-xs font-bold">
                                -{discountInfo.discountPercent}%
                              </Badge>
                            </div>
                          ) : null
                        })()}
                        
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
                          const discountInfo = getDiscountInfo(item)
                          
                          if (price === undefined) return null
                          
                          return (
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{price.toLocaleString()} ₸</p>
                              {discountInfo.hasDiscount && discountInfo.originalPrice && (
                                <p className="text-sm text-muted-foreground line-through">
                                  {discountInfo.originalPrice.toLocaleString()} ₸
                                </p>
                              )}
                            </div>
                          )
                        })()}
                      </CardContent>
                    </Link>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* Loading More Indicator */}
        {loadingMore && (
          <div className="mt-8 flex justify-center">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <span className="text-sm text-muted-foreground">Загрузка...</span>
            </div>
          </div>
        )}

        {/* Load More Button */}
        {!loading && hasMore && (
          <div className="mt-8 flex justify-center">
            <Button 
              onClick={() => setPage(prev => prev + 1)}
              disabled={loadingMore}
              variant="outline"
            >
              {loadingMore ? 'Загрузка...' : `Загрузить ещё (${page} → ${page + 1})`}
            </Button>
          </div>
        )}

        {/* End of Results */}
        {!loading && !loadingMore && !hasMore && items.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">Больше товаров нет</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && items.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="py-16 text-center"
          >
            <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 font-display text-xl font-semibold">Товары не найдены</h3>
            <p className="text-muted-foreground">
              Попробуйте изменить параметры поиска или вернитесь позже
            </p>
          </motion.div>
        )}
      </div>
    </>
  )
}

export default ItemsList