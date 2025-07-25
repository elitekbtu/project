import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Link } from 'react-router-dom'
import ItemImage from './ItemImage'
import { CATEGORY_LABELS } from '../../constants'
import { Button } from '../ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Item {
  id: number
  name: string
  price?: number | null
  image_url?: string | null
  brand?: string | null
  category?: string | null
}

interface ItemsCarouselProps {
  items: Item[]
  getDisplayPrice: (item: Item) => number | undefined
  getDiscountInfo: (item: Item) => { hasDiscount: boolean; originalPrice?: number; discountPercent?: number }
  title?: string
  showIndexBadge?: boolean
}

const VISIBLE_COUNT = 4

const ItemsCarousel: React.FC<ItemsCarouselProps> = ({ items, getDisplayPrice, getDiscountInfo, title, showIndexBadge }) => {
  const [startIdx, setStartIdx] = useState(0)
  const canPrev = startIdx > 0
  const canNext = startIdx + VISIBLE_COUNT < items.length

  const handlePrev = () => {
    if (canPrev) setStartIdx(startIdx - 1)
  }
  const handleNext = () => {
    if (canNext) setStartIdx(startIdx + 1)
  }

  return (
    <div className="mb-12">
      {title && (
        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold flex items-center gap-2">{title}</h2>
          <div className="flex gap-2">
            <Button size="icon" variant="outline" onClick={handlePrev} disabled={!canPrev}><ChevronLeft /></Button>
            <Button size="icon" variant="outline" onClick={handleNext} disabled={!canNext}><ChevronRight /></Button>
          </div>
        </div>
      )}
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          {items.slice(startIdx, startIdx + VISIBLE_COUNT).map((item, idx) => (
            <Card key={item.id} className="group overflow-hidden transition-all hover:shadow-lg min-w-[220px] max-w-[260px] flex-1">
              <Link to={`/items/${item.id}`}> 
                <div className="relative aspect-square md:aspect-[3/4] overflow-hidden">
                  <ItemImage
                    src={item.image_url}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    fallbackClassName="h-full w-full"
                  />
                  {/* Discount Badge */}
                  {(() => {
                    const discountInfo = getDiscountInfo(item)
                    return discountInfo.hasDiscount ? (
                      <div className="absolute top-3 left-3 z-10">
                        <Badge className="bg-red-500 text-white text-xs font-bold">
                          -{discountInfo.discountPercent}%
                        </Badge>
                      </div>
                    ) : null
                  })()}
                  {showIndexBadge && (
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                        #{startIdx + idx + 1}
                      </Badge>
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
          ))}
        </div>
      </div>
    </div>
  )
}

export default ItemsCarousel 