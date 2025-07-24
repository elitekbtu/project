import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import api from '../../api/client'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { TrendingUp, Heart, ShoppingBag, Sparkles, Store } from 'lucide-react'
import ItemImage from '../common/ItemImage'
import { CATEGORY_LABELS } from '../../constants'
import { Helmet } from 'react-helmet-async'

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



  return (
    <>
      <Helmet>
        <title>TRC — Современная мода, стиль, образы, покупки</title>
        <meta name="description" content="TRC — платформа для создания стильных образов, покупки одежды и вдохновения." />
        <meta name="keywords" content="мода, стиль, образы, одежда, покупки, тренды, TRC" />
        <meta property="og:title" content="TRC — Современная мода и стиль" />
        <meta property="og:description" content="Создавайте образы, покупайте одежду, вдохновляйтесь модой на TRC." />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <section
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
        </section>

        {/* Quick Actions */}
        <section
          className="mb-12"
        >
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 md:grid-cols-4">
            {[
              {
                to: '/items',
                icon: <ShoppingBag className="h-6 w-6 text-primary" />,
                label: 'Каталог',
                sub: 'Все товары',
              },
              {
                to: '/shops',
                icon: <Store className="h-6 w-6 text-primary" />,
                label: 'Магазины',
                sub: 'Модераторы',
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
        </section>

        {/* Trending Items */}
        {!loading && trending.length > 0 && (
          <section
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
                <div key={item.id}>
                  <Card className="group overflow-hidden transition-all hover:shadow-lg">
                    <Link to={`/items/${item.id}`}>
                      <div className="relative aspect-square md:aspect-[3/4] overflow-hidden">
                        <ItemImage
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          fallbackClassName="h-full w-full"
                        />
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
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!loading && trending.length === 0 && (
          <div
            className="py-12 text-center"
          >
            <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 font-semibold">Пока нет популярных товаров</h3>
            <p className="text-muted-foreground">
              Начните добавлять товары в избранное, чтобы увидеть тренды
            </p>
          </div>
        )}
      </div>
    </>
  )
}

export default Home