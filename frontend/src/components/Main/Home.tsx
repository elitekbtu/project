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
import ItemsCarousel from '../common/ItemsCarousel'

interface Item {
  id: number
  name: string
  price?: number | null
  image_url?: string | null
  brand?: string | null
  category?: string | null
  variants?: any[] | null // добавлено
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

  const discounted = trending.filter(item => getDiscountInfo(item).hasDiscount)

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

        {/* Trending Items Section */}
        {!loading && trending.length > 0 && (
          <ItemsCarousel
            items={trending}
            getDisplayPrice={getDisplayPrice}
            getDiscountInfo={getDiscountInfo}
            title="Популярные товары"
            showIndexBadge
          />
        )}

        {/* Discounted Items Section */}
        {!loading && discounted.length > 0 && (
          <ItemsCarousel
            items={discounted}
            getDisplayPrice={getDisplayPrice}
            getDiscountInfo={getDiscountInfo}
            title="Товары со скидкой"
          />
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