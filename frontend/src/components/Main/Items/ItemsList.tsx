import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../../api/client'
import { Card, CardContent } from '../../ui/card'
import { Input } from '../../ui/input'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Search, Filter, Heart, ShoppingBag } from 'lucide-react'
import { useFavorites } from '../../../context/FavoritesContext'
import ImageCarousel from '../../common/ImageCarousel'
import ItemImage from '../../common/ItemImage'
import { CATEGORY_LABELS } from '../../../constants'

interface Item {
  id: number
  name: string
  price?: number | null
  image_url?: string | null
  image_urls?: string[] | null
  brand?: string | null
  category?: string | null
}

const ItemsList = () => {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { isFavorite, toggleFavorite } = useFavorites()

  const fetchItems = async (q?: string) => {
    try {
      setLoading(true)
      const resp = await api.get<Item[]>('/api/items/', { params: { q } })
      setItems(resp.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchItems(search)
  }

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
      const prices = (item as any).variants.map((v: any) => v.price).filter((p: any) => typeof p === 'number') as number[]
      if (prices.length > 0) return Math.min(...prices)
    }
    return item.price ?? undefined
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
        <h1 className="mb-4 font-display text-3xl font-bold tracking-tight">Каталог</h1>
        <p className="text-muted-foreground">
          Откройте для себя уникальные вещи и создайте свой неповторимый стиль
        </p>
      </motion.div>

      {/* Search and Filters */}
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
        
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Фильтры
        </Button>
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
          {items.map((item) => (
            <motion.div key={item.id} variants={itemVariants}>
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
          ))}
        </motion.div>
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
  )
}

export default ItemsList