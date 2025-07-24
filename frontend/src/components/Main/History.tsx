import { useEffect, useState } from 'react'
import { useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { viewedItems, clearViewHistory } from '../../api/items'
import { viewedOutfits, clearOutfitViewHistory } from '../../api/outfits'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { ShoppingBag, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
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

interface Outfit {
  id: number
  name: string
  style: string
  total_price?: number | null
}

const History = () => {
  const [items, setItems] = useState<Item[]>([])
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(true)
  const [itemsPage, setItemsPage] = useState(1)
  const [outfitsPage, setOutfitsPage] = useState(1)
  const [itemsHasMore, setItemsHasMore] = useState(true)
  const [outfitsHasMore, setOutfitsHasMore] = useState(true)

  const fetchItems = async (page: number, append = false) => {
    try {
      const data = await viewedItems(page)
      setItems(prev => append ? [...prev, ...data] : data)
      setItemsHasMore(data.length === 20)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchOutfits = async (page: number, append = false) => {
    try {
      const data = await viewedOutfits(page)
      setOutfits(prev => append ? [...prev, ...data] : data)
      setOutfitsHasMore(data.length === 20)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchItems(1),
        fetchOutfits(1),
      ])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleClear = async () => {
    try {
      await Promise.all([clearViewHistory(), clearOutfitViewHistory()])
      setItems([])
      setOutfits([])
      setItemsPage(1)
      setOutfitsPage(1)
      setItemsHasMore(true)
      setOutfitsHasMore(true)
    } catch (err) {
      console.error(err)
    }
  }

  // Infinite scroll for items
  const itemsObserver = useRef<IntersectionObserver | null>(null)
  const lastItemRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return
      if (!itemsHasMore) return
      if (itemsObserver.current) itemsObserver.current.disconnect()
      itemsObserver.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setItemsPage(prev => prev + 1)
        }
      })
      if (node) itemsObserver.current.observe(node)
    },
    [loading, itemsHasMore],
  )

  // Infinite scroll for outfits
  const outfitsObserver = useRef<IntersectionObserver | null>(null)
  const lastOutfitRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return
      if (!outfitsHasMore) return
      if (outfitsObserver.current) outfitsObserver.current.disconnect()
      outfitsObserver.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setOutfitsPage(prev => prev + 1)
        }
      })
      if (node) outfitsObserver.current.observe(node)
    },
    [loading, outfitsHasMore],
  )

  // Load more items
  useEffect(() => {
    if (itemsPage > 1) {
      fetchItems(itemsPage, true)
    }
  }, [itemsPage])

  // Load more outfits
  useEffect(() => {
    if (outfitsPage > 1) {
      fetchOutfits(outfitsPage, true)
    }
  }, [outfitsPage])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <>
      <Helmet>
        <title>История просмотров — TRC</title>
        <meta name="description" content="История ваших просмотров товаров и образов на платформе TRC." />
        <meta name="keywords" content="история, просмотры, товары, образы, TRC" />
        <meta property="og:title" content="История просмотров — TRC" />
        <meta property="og:description" content="История ваших просмотров товаров и образов на платформе TRC." />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold tracking-tight">История просмотров</h1>
          {(items.length > 0 || outfits.length > 0) && (
            <Button variant="outline" size="sm" onClick={handleClear}>
              Очистить историю
            </Button>
          )}
        </div>

        {loading && <p className="py-8 text-center">Загрузка...</p>}

        {!loading && items.length === 0 && outfits.length === 0 && (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <Clock className="mb-4 h-12 w-12 text-muted-foreground" />
            <p>История просмотров пуста</p>
          </div>
        )}

        {/* Viewed Items */}
        {!loading && items.length > 0 && (
          <>
            <h2 className="mb-4 text-xl font-semibold">Товары</h2>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
            >
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  ref={index === items.length - 1 ? lastItemRef : null}
                >
                  <Card className="group overflow-hidden transition-all hover:shadow-lg">
                    <Link to={`/items/${item.id}`}>
                      <div className="relative aspect-[3/4] overflow-hidden">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted">
                            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
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
                          {item.brand && <p className="text-sm text-muted-foreground">{item.brand}</p>}
                        </div>
                        {item.price !== null && item.price !== undefined && (
                          <p className="font-semibold">{item.price.toLocaleString()} ₸</p>
                        )}
                      </CardContent>
                    </Link>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}

        {/* Viewed Outfits */}
        {!loading && outfits.length > 0 && (
          <>
            <h2 className="mb-4 text-xl font-semibold">Образы</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {outfits.map((o, index) => (
                <Link
                  key={o.id}
                  to={`/outfits/${o.id}`}
                  className="block rounded-md border p-4 hover:shadow"
                  ref={index === outfits.length - 1 ? lastOutfitRef : null}
                >
                  <h3 className="text-lg font-medium">{o.name}</h3>
                  <p className="text-sm text-gray-500">Стиль: {o.style}</p>
                  {o.total_price && <p className="mt-2 font-semibold">{o.total_price}₸</p>}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default History 