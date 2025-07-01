import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listFavoriteItems } from '../../api/items'
import { listFavoriteOutfits } from '../../api/outfits'
import { motion } from 'framer-motion'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { ShoppingBag, Heart as HeartIcon } from 'lucide-react'

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

const Favorites = () => {
  const [items, setItems] = useState<Item[]>([])
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsResp, outfitsResp] = await Promise.all([
          listFavoriteItems(),
          listFavoriteOutfits(),
        ])
        setItems(itemsResp)
        setOutfits(outfitsResp)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

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
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 font-display text-3xl font-bold tracking-tight">Избранное</h1>

      {loading && <p className="py-8 text-center">Загрузка...</p>}

      {!loading && items.length === 0 && outfits.length === 0 && (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <HeartIcon className="mb-4 h-12 w-12 text-muted-foreground" />
          <p>У вас пока нет избранных товаров или образов</p>
        </div>
      )}

      {/* Favorite Items */}
      {!loading && items.length > 0 && (
        <>
          <h2 className="mb-4 text-xl font-semibold">Товары</h2>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {items.map((item) => (
              <motion.div key={item.id} variants={itemVariants}>
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
                          <Badge variant="outline" className="mb-2 text-xs">
                            {item.category}
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

      {/* Favorite Outfits */}
      {!loading && outfits.length > 0 && (
        <>
          <h2 className="mb-4 text-xl font-semibold">Образы</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {outfits.map((o) => (
              <Link
                key={o.id}
                to={`/outfits/${o.id}`}
                className="block rounded-md border p-4 hover:shadow"
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
  )
}

export default Favorites 