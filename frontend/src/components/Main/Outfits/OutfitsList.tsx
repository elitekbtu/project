import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../../api/client'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Card, CardContent } from '../../ui/card'
import { Search, Filter, Sparkles } from 'lucide-react'
import { type OutfitOut } from '../../../api/schemas'

interface OutfitPreview {
  id: number
  name: string
  style: string
  total_price?: number | null
  image_url?: string | null
}

const OutfitsList = () => {
  const [outfits, setOutfits] = useState<OutfitPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchOutfits = async (q?: string) => {
    setLoading(true)
    try {
      const resp = await api.get<OutfitOut[]>('/api/outfits/', { params: { q } })
      // Map basic fields first
      const basic: OutfitPreview[] = resp.data.map((o) => ({
        id: o.id,
        name: o.name,
        style: o.style,
        total_price: o.total_price,
        image_url: undefined,
      }))
      setOutfits(basic)

      // Fetch details in background to get image preview (first top image)
      const promises = resp.data.map((o) => api.get<OutfitOut>(`/api/outfits/${o.id}`))
      const details = await Promise.allSettled(promises)
      setOutfits((prev) =>
        prev.map((p) => {
          const det = details.find((d) => d.status === 'fulfilled' && (d as any).value.data.id === p.id) as any
          if (det && det.status === 'fulfilled') {
            const data: OutfitOut = det.value.data
            const firstItem = data.tops?.[0] || data.bottoms?.[0] || data.footwear?.[0] || data.accessories?.[0]
            return { ...p, image_url: firstItem?.image_url || null }
          }
          return p
        }),
      )
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOutfits()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchOutfits(search)
  }

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
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {outfits.map((o) => (
            <motion.div key={o.id} variants={itemVariants}>
              <Card className="group overflow-hidden transition-all hover:shadow-lg">
                <Link to={`/outfits/${o.id}`}>
                  <div className="relative aspect-[3/4] overflow-hidden">
                    {o.image_url ? (
                      <img
                        src={o.image_url}
                        alt={o.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted">
                        <Sparkles className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4 space-y-1">
                    <h3 className="font-medium leading-tight" title={o.name}>{o.name}</h3>
                    <p className="text-sm text-muted-foreground">Стиль: {o.style}</p>
                    {o.total_price && (
                      <p className="font-semibold">{o.total_price.toLocaleString()} ₸</p>
                    )}
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
          className="py-16 text-center"
        >
          <Sparkles className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 font-display text-xl font-semibold">Образы не найдены</h3>
          <p className="text-muted-foreground">Попробуйте изменить запрос или создайте собственный лук!</p>
        </motion.div>
      )}
    </div>
  )
}

export default OutfitsList 