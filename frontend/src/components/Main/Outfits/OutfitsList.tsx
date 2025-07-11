import { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { listOutfits } from '../../../api/outfits'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Card, CardContent } from '../../ui/card'
import { Search, Filter, Sparkles } from 'lucide-react'
import { type OutfitOut } from '../../../api/schemas'
import { useFavorites } from '../../../context/FavoritesContext'

interface OutfitPreview {
  id: number
  name: string
  style: string
  total_price?: number | null
  image_url?: string | null
  items?: any[] // Added for items
  is_favorite?: boolean // Added for favorite status
}

const OutfitsList = () => {
  const [outfits, setOutfits] = useState<OutfitPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const { isFavorite, toggleFavorite } = useFavorites()

  // Функция для загрузки данных
  const fetchOutfits = async (pageToLoad: number, q?: string) => {
    const params: any = { page: pageToLoad }
    if (q !== undefined && q !== null && q !== '') params.q = q
    const data = await listOutfits(params)
    return data
  }

  // Загрузка первой страницы или нового поиска
  useEffect(() => {
    setLoading(true)
    setOutfits([])
    setHasMore(true)
    setPage(1)
    fetchOutfits(1, search).then(data => {
      setOutfits(data)
      setHasMore(data.length === 20)
      setLoading(false)
    })
  }, [search])

  // Загрузка следующих страниц
  useEffect(() => {
    if (page === 1) return
    setLoadingMore(true)
    fetchOutfits(page, search).then(data => {
      setOutfits(prev => [...prev, ...data])
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-[3/4] animate-pulse bg-muted" />
              <CardContent className="p-4 space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="mb-4 font-display text-3xl font-bold tracking-tight">Образы</h1>
        <p className="text-muted-foreground">Подберите готовый лук или вдохновитесь идеями наших стилистов.</p>
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
              placeholder="Поиск образов..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Фильтры
          </Button>
          <Link to="/outfits/new">
            <Button className="flex items-center gap-2 bg-primary hover:bg-primary/90">
              <Sparkles className="h-4 w-4" />
              Создать образ
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Grid */}
      {outfits.length > 0 ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {outfits.map((o, idx) => {
            const refProp = idx === outfits.length - 1 ? { ref: lastItemRef } : {}
            return (
              <motion.div key={o.id} variants={itemVariants} {...refProp}>
                <Card className="group overflow-hidden transition-all hover:shadow-lg rounded-lg">
                  <Link to={`/outfits/${o.id}`}>
                    <div className="relative aspect-[3/4] overflow-hidden">
                      {o.image_url ? (
                        <img
                          src={o.image_url.startsWith('/') ? `${window.location.origin}${o.image_url}` : o.image_url}
                          alt={o.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            console.error('Ошибка загрузки изображения образа:', o.image_url)
                            e.currentTarget.src = '/maneken.png'
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted">
                          <img
                            src="/maneken.png"
                            alt="Манекен"
                            className="h-2/3 w-2/3 object-contain opacity-70"
                          />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3 sm:p-4 space-y-1">
                      <h3 className="font-medium leading-tight text-base sm:text-lg" title={o.name}>{o.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">Стиль: {o.style}</p>
                      {o.total_price && (
                        <p className="font-semibold text-sm sm:text-base">{o.total_price.toLocaleString()} ₸</p>
                      )}
                    </CardContent>
                  </Link>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="py-16 text-center"
        >
          <Sparkles className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 font-display text-xl font-semibold">Образы не найдены</h3>
          <p className="text-muted-foreground">Попробуйте изменить запрос или создайте собственный лук!</p>
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

      {/* End of Results */}
      {!loading && !loadingMore && !hasMore && outfits.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">Больше образов нет</p>
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

      {/* Empty State */}
    </div>
  )
}

export default OutfitsList 