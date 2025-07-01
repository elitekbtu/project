import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import api from '../../api/client'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { TrendingUp, Heart, ShoppingBag, Sparkles } from 'lucide-react'
import { CATEGORY_LABELS } from '../../constants'

interface Item {
  id: number
  name: string
  price?: number | null
  image_url?: string | null
  brand?: string | null
  category?: string | null
}

const Home = () => {
  const { user } = useAuth()
  const [trending, setTrending] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const resp = await api.get<Item[]>('/api/items/trending')
        setTrending(resp.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchTrending()
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12 text-center"
      >
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-4 font-display text-4xl font-bold tracking-tight lg:text-5xl">
            Добро пожаловать, {user?.first_name || 'стилист'}!
          </h1>
          <p className="text-lg text-muted-foreground">
            Откройте для себя новые тренды и создайте уникальные образы
          </p>
        </div>
      </motion.section>

      {/* Quick Actions */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mb-12"
      >
        <div className="grid gap-4 grid-cols-3 sm:grid-cols-3 md:grid-cols-3">
          {[
            {
              to: '/items',
              icon: <ShoppingBag className="h-6 w-6 text-primary" />,
              label: 'Каталог',
              sub: 'Все товары',
            },
            {
              to: '/outfits/new',
              icon: <Sparkles className="h-6 w-6 text-primary" />,
              label: 'Создать образ',
              sub: 'Новый лук',
            },
            {
              to: '/favorites',
              icon: <Heart className="h-6 w-6 text-primary" />,
              label: 'Избранное',
              sub: 'Любимые',
            },
          ].map((q) => (
            <Link key={q.to} to={q.to} className="group">
              <button
                type="button"
                className="w-full h-28 sm:h-32 flex flex-col items-center justify-center gap-2 rounded-xl border border-border/60 bg-card transition-all hover:shadow-md active:scale-[.97]"
              >
                <div className="rounded-full bg-primary/10 p-3 group-hover:scale-110 transition-transform">
                  {q.icon}
                </div>
                <span className="text-sm font-semibold leading-none">{q.label}</span>
                <span className="text-xs text-muted-foreground">{q.sub}</span>
              </button>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* Trending Items */}
      {!loading && trending.length > 0 && (
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-12"
        >
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-semibold">Популярные товары</h2>
            </div>
            <Button variant="outline" asChild>
              <Link to="/items">Смотреть все</Link>
            </Button>
          </div>
          
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
            {trending.slice(0, 8).map((item, index) => (
              <motion.div key={item.id} variants={itemVariants}>
                <Card className="group overflow-hidden transition-all hover:shadow-lg">
                  <Link to={`/items/${item.id}`}>
                    <div className="relative aspect-square md:aspect-[3/4] overflow-hidden">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted">
                          <ShoppingBag className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                          #{index + 1}
                        </Badge>
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
                      {item.price !== null && item.price !== undefined && (
                        <p className="font-semibold">{item.price.toLocaleString()} ₸</p>
                      )}
                    </CardContent>
                  </Link>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Empty State */}
      {!loading && trending.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="py-12 text-center"
        >
          <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 font-semibold">Пока нет популярных товаров</h3>
          <p className="text-muted-foreground">
            Начните добавлять товары в избранное, чтобы увидеть тренды
          </p>
        </motion.div>
      )}
    </div>
  )
}

export default Home