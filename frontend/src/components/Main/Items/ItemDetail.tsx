import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { type CommentOut, type VariantOut } from '../../../api/schemas'
import { listItemComments, addItemComment, likeComment, deleteItemComment } from '../../../api/items'
import api from '../../../api/client'
import { Button } from '../../ui/button'
import { Heart, ShoppingBag, ChevronLeft, MessageSquare, Trash2, Minus, Plus } from 'lucide-react'
import RatingStars from '../../common/RatingStars'
import { useAuth } from '../../../context/AuthContext'
import { Card, CardContent, CardHeader } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { Skeleton } from '../../ui/skeleton'
import { Textarea } from '../../ui/textarea'
import { useCart } from '../../../context/CartContext'
import { useFavorites } from '../../../context/FavoritesContext'
import ImageCarousel from '../../common/ImageCarousel'
import { CATEGORY_LABELS } from '../../../constants'

interface Item {
  id: number
  name: string
  brand?: string | null
  description?: string | null
  price?: number | null
  image_url?: string | null
  image_urls?: string[] | null
  color?: string | null
  category?: string | null
  size?: string | null
  style?: string | null
  collection?: string | null
  variants?: VariantOut[] | null
}

const ItemDetail = () => {
  const { id } = useParams<{ id: string }>()
  const { user, isAdmin } = useAuth()
  const [item, setItem] = useState<Item | null>(null)
  const [similar, setSimilar] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState<CommentOut[]>([])
  const [newComment, setNewComment] = useState('')
  const [rating, setRating] = useState<number | undefined>()
  const { isFavorite, toggleFavorite } = useFavorites()
  const { addItem } = useCart()
  const [selectedVariant, setSelectedVariant] = useState<VariantOut | null>(null)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!id) return
        setLoading(true)
        const [detailResp, similarResp] = await Promise.all([
          api.get<Item>(`/api/items/${id}`),
          api.get<Item[]>(`/api/items/${id}/similar`),
        ])
        setItem(detailResp.data)
        setSimilar(similarResp.data)
        const commentsData = await listItemComments(Number(id))
        setComments(commentsData)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  const handleToggleFavorite = async () => {
    if (!id) return
    await toggleFavorite(Number(id))
  }

  const handleAddComment = async () => {
    if (!id || !newComment.trim()) return
    try {
      const newComm = await addItemComment(Number(id), { content: newComment, rating })
      setComments([newComm, ...comments])
      setNewComment('')
      setRating(undefined)
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/2">
          <Skeleton className="aspect-square rounded-xl" />
        </div>
        <div className="w-full md:w-1/2 space-y-6">
          <Skeleton className="h-9 w-3/4 rounded-lg" />
          <Skeleton className="h-5 w-1/2 rounded-lg" />
          <Skeleton className="h-7 w-1/4 rounded-lg" />
          <div className="space-y-4 pt-4">
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-4/5 rounded-lg" />
            <Skeleton className="h-4 w-3/4 rounded-lg" />
          </div>
          <div className="flex gap-4 pt-6">
            <Skeleton className="h-12 flex-1 rounded-lg" />
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )

  if (!item) return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="container mx-auto px-4 py-16 text-center"
    >
      <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
      <h3 className="mb-2 text-2xl font-semibold tracking-tight">Товар не найден</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Возможно, товар был удален или перемещен
      </p>
      <Button asChild variant="outline" className="rounded-full">
        <Link to="/items">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Вернуться в каталог
        </Link>
      </Button>
    </motion.div>
  )

  const minVariantPrice = item.variants && item.variants.length > 0
    ? Math.min(...item.variants.map((v) => (typeof v.price === 'number' ? v.price! : Infinity)))
    : undefined

  let displayedPrice: number | undefined
  if (selectedVariant?.price !== undefined && selectedVariant?.price !== null) {
    displayedPrice = selectedVariant.price
  } else if (minVariantPrice !== undefined && minVariantPrice !== Infinity) {
    displayedPrice = minVariantPrice
  } else if (item.price !== undefined && item.price !== null) {
    displayedPrice = item.price
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="container mx-auto px-4 py-8"
    >
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6"
      >
        <Button asChild variant="ghost" className="pl-0 hover:bg-transparent">
          <Link to="/items" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Назад к каталогу
          </Link>
        </Button>
      </motion.div>

      {/* Main product section */}
      <div className="mb-16 flex flex-col md:flex-row gap-8 md:gap-12">
        {/* Product image */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full md:w-1/2"
        >
          {item.image_urls && item.image_urls.length > 0 ? (
            <ImageCarousel 
              images={item.image_urls} 
              className="rounded-xl shadow-sm" 
              aspectClassName="aspect-square"
            />
          ) : item.image_url ? (
            <div className="aspect-square overflow-hidden rounded-xl bg-muted shadow-sm">
              <img
                src={item.image_url}
                alt={item.name}
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-xl bg-muted shadow-sm">
              <ShoppingBag className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
        </motion.div>

        {/* Product info */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full md:w-1/2"
        >
          <div className="mb-4 flex items-center justify-between">
            {item.category && (
              <Badge variant="outline" className="text-xs capitalize">
                {CATEGORY_LABELS[item.category] ?? item.category}
              </Badge>
            )}
          </div>

          <h1 className="mb-2 text-3xl font-bold tracking-tight">{item.name}</h1>
          
          {item.brand && (
            <p className="mb-4 text-lg text-muted-foreground">{item.brand}</p>
          )}

          {displayedPrice !== undefined && (
            <p className="mb-6 text-2xl font-bold">{displayedPrice.toLocaleString()}₸</p>
          )}

          { (item.color || item.size || item.style || item.collection) && (
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {item.color && (
                <div className="rounded-md bg-muted/80 p-2.5 border border-border/50 w-full sm:max-w-[260px]">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Цвет</p>
                  <p className="text-sm font-medium leading-tight">{item.color}</p>
                </div>
              )}
              {item.size && (
                <div className="rounded-md bg-muted/80 p-2.5 border border-border/50 w-full sm:max-w-[260px]">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Размер</p>
                  <p className="text-sm font-medium leading-tight">{item.size}</p>
                </div>
              )}
              {item.style && (
                <div className="rounded-md bg-muted/80 p-2.5 border border-border/50 w-full sm:max-w-[260px]">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Стиль</p>
                  <p className="text-sm font-medium leading-tight">{item.style}</p>
                </div>
              )}
              {item.collection && (
                <div className="rounded-md bg-muted/80 p-2.5 border border-border/50 w-full sm:max-w-[260px]">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Коллекция</p>
                  <p className="text-sm font-medium leading-tight">{item.collection}</p>
                </div>
              )}
            </div>
          )}

          {/* Variants Section */}
          {item.variants && item.variants.length > 0 && (
            <div className="mb-6 space-y-4">
              <h3 className="font-medium">Выберите вариант</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {item.variants.map((v) => {
                  const parts: string[] = []
                  if (v.size) parts.push(v.size)
                  if (v.color) parts.push(v.color)
                  const label = parts.join(' ') || v.sku || String(v.id)
                  const isSelected = selectedVariant?.id === v.id
                  const isOut = v.stock !== undefined && v.stock === 0

                  return (
                    <Button
                      key={v.id}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      size="default"
                      disabled={isOut}
                      className={`flex flex-col items-start justify-between gap-1 rounded-xl border-2 px-3 py-3 transition-all duration-200 min-h-[84px] ${
                        isSelected ? 'border-primary shadow-sm' : 'border-transparent hover:border-muted-foreground/40'
                      } ${isOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => {
                        setSelectedVariant(v)
                        setQty(1)
                      }}
                    >
                      <span className="font-medium leading-tight">{label}</span>
                      {v.price !== undefined && v.price !== null && (
                        <span className="text-sm text-muted-foreground">
                          {v.price.toLocaleString()}₸
                        </span>
                      )}
                      {v.stock !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          {v.stock > 0 ? `${v.stock} шт.` : 'Нет в наличии'}
                        </span>
                      )}
                    </Button>
                  )
                })}
              </div>

              {selectedVariant && (
                <div className="flex items-center gap-4 pt-2">
                  <p className="text-sm text-muted-foreground">Доступно: {selectedVariant.stock ?? '—'}</p>
                  <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      disabled={qty <= 1} 
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="h-8 w-8 rounded-md"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center font-medium">{qty}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={selectedVariant.stock !== undefined && qty >= selectedVariant.stock}
                      onClick={() => setQty((q) => (selectedVariant.stock !== undefined ? Math.min(selectedVariant.stock, q + 1) : q + 1))}
                      className="h-8 w-8 rounded-md"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {item.description && (
            <div className="mb-6">
              <h3 className="mb-2 font-medium">Описание</h3>
              <p className="text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              size="lg"
              className="flex-1 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              disabled={!selectedVariant}
              onClick={() => {
                if (!item || !selectedVariant) return
                addItem({
                  id: selectedVariant.id,
                  item_id: item.id,
                  name: item.name,
                  price: selectedVariant.price ?? item.price ?? 0,
                  image_url: item.image_url,
                  size: selectedVariant.size,
                  color: selectedVariant.color,
                  quantity: qty,
                  stock: selectedVariant.stock,
                })
              }}
            >
              Добавить в корзину
            </Button>
            <Button
              size="lg"
              variant={isFavorite(Number(id)) ? "default" : "outline"}
              className="rounded-lg px-3 shadow-sm hover:shadow-md transition-shadow"
              onClick={handleToggleFavorite}
            >
              <Heart 
                className={`h-5 w-5 ${isFavorite(Number(id)) ? 'fill-current' : ''}`}
                strokeWidth={isFavorite(Number(id)) ? 2 : 1.5}
              />
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Similar items */}
      {similar.length > 0 && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <h2 className="mb-6 text-2xl font-bold tracking-tight">Похожие товары</h2>
          <motion.div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {similar.map((it) => (
              <motion.div 
                key={it.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="group overflow-hidden transition-all hover:shadow-lg border-0 shadow-sm">
                  <Link to={`/items/${it.id}`} className="block">
                    <div className="relative aspect-[3/4] overflow-hidden">
                      {it.image_url ? (
                        <img
                          src={it.image_url}
                          alt={it.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted">
                          <ShoppingBag className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="mb-2">
                        {it.category && (
                          <Badge variant="outline" className="mb-2 text-xs capitalize">
                            {CATEGORY_LABELS[it.category] ?? it.category}
                          </Badge>
                        )}
                        <h3 className="font-medium leading-tight line-clamp-1" title={it.name}>
                          {it.name}
                        </h3>
                        {it.brand && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{it.brand}</p>
                        )}
                      </div>
                      {(() => {
                        let price: number | undefined = undefined
                        if ((it as any).variants && (it as any).variants.length > 0) {
                          const prices = (it as any).variants.map((v: any) => v.price).filter((p: any) => typeof p === 'number') as number[]
                          if (prices.length > 0) price = Math.min(...prices)
                        }
                        if (price === undefined) price = it.price ?? undefined
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
        </motion.section>
      )}

      {/* Comments Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mb-16"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Отзывы</h2>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MessageSquare className="h-5 w-5" />
            <span className="font-medium">{comments.length}</span>
          </div>
        </div>

        {/* Add comment form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 rounded-xl border p-6 shadow-sm"
        >
          <h3 className="mb-4 text-lg font-medium">Оставить отзыв</h3>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Ваша оценка</p>
              <RatingStars value={rating} onChange={setRating} />
            </div>
            <Textarea
              placeholder="Расскажите о вашем опыте использования этого товара..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={4}
              className="rounded-lg border-muted"
            />
            <div className="flex justify-end">
              <Button 
                onClick={handleAddComment} 
                disabled={!newComment.trim()}
                className="rounded-lg"
              >
                Отправить отзыв
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Comments list */}
        {comments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="rounded-xl border p-8 text-center shadow-sm"
          >
            <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">Пока нет отзывов</h3>
            <p className="text-muted-foreground">
              Будьте первым, кто оставит отзыв об этом товаре
            </p>
          </motion.div>
        ) : (
          <motion.ul className="space-y-4">
            {comments.map((c) => (
              <motion.li 
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="overflow-hidden border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{c.user_name ?? 'Пользователь'}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString('ru-RU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      {(user?.id === c.user_id || isAdmin) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600 h-8 w-8 rounded-full"
                          onClick={async () => {
                            if (!id) return
                            if (!confirm('Удалить комментарий?')) return
                            try {
                              await deleteItemComment(Number(id), c.id)
                              setComments((prev) => prev.filter((x) => x.id !== c.id))
                            } catch (err) {
                              console.error(err)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {c.rating !== undefined && c.rating !== null && (
                      <div className="mb-3">
                        <RatingStars value={c.rating} />
                      </div>
                    )}
                    
                    <p className="mb-4 whitespace-pre-line text-muted-foreground">{c.content}</p>
                    
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2 rounded-full"
                        onClick={async () => {
                          if (!id || !user) return;
                          try {
                            await likeComment(Number(id), c.id);
                            const updatedComments = await listItemComments(Number(id));
                            setComments(updatedComments);
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                      >
                        <Heart
                          className={`h-4 w-4 ${c.likes > 0 ? 'fill-primary text-primary' : ''}`}
                        />
                        <span>{c.likes}</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </motion.section>
    </motion.div>
  )
}

export default ItemDetail