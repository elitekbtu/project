import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../../api/client'
import { Heart, ShoppingCart, Pencil, ChevronLeft, MessageSquare, Trash2 } from 'lucide-react'
import { type OutfitCommentOut, type VariantOut } from '../../../api/schemas'
import {
  toggleFavoriteOutfit,
  listOutfitComments,
  addOutfitComment,
  likeOutfitComment,
  deleteOutfitComment,
} from '../../../api/outfits'
import { useCart } from '../../../context/CartContext'
import { Button } from '../../ui/button'
import { Textarea } from '../../ui/textarea'
import { Card, CardContent, CardHeader } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { Skeleton } from '../../ui/skeleton'
import RatingStars from '../../common/RatingStars'
import { useAuth } from '../../../context/AuthContext'
import { categoryConfig } from './OutfitBuilder'
import { motion } from 'framer-motion'
import ItemImage from '../../common/ItemImage'
import { Helmet } from 'react-helmet-async'

interface Item {
  id: number
  name: string
  image_url?: string | null
}

interface Outfit {
  id: number
  name: string
  style: string
  description?: string | null
  total_price?: number | null
  owner_id?: number | string
  tops: Item[]
  bottoms: Item[]
  footwear: Item[]
  accessories: Item[]
  fragrances: Item[]
  tryon_image_url?: string | null  // URL сгенерированного изображения виртуальной примерки
}

const OutfitDetail = () => {
  const { id } = useParams<{ id: string }>()
  const { user, isAdmin } = useAuth()
  const [outfit, setOutfit] = useState<Outfit | null>(null)
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState<OutfitCommentOut[]>([])
  const [newComment, setNewComment] = useState('')
  const [rating, setRating] = useState<number | undefined>()
  const [favorited, setFavorited] = useState<boolean | null>(null)
  const { addItem } = useCart()
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const fetchOutfit = async () => {
      try {
        const resp = await api.get<Outfit>(`/api/outfits/${id}`)
        setOutfit(resp.data)
        const commentsData = await listOutfitComments(Number(id))
        setComments(commentsData)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchOutfit()
  }, [id])

  useEffect(() => {
    const fetchFavoriteStatus = async () => {
      if (!id || !user) return
      try {
        const favs = await api.get<Outfit[]>('/api/outfits/favorites')
        setFavorited(favs.data.some((o) => o.id === Number(id)))
      } catch (err) {
      }
    }
    fetchFavoriteStatus()
  }, [id, user])

  const handleToggleFavorite = async () => {
    if (!id || user === null) return
    // Optimistic update
    setFavorited((prev) => !prev)
    try {
      await toggleFavoriteOutfit(Number(id))
    } catch (err) {
      // Revert on error
      setFavorited((prev) => !prev)
      console.error(err)
    }
  }

  const handleAddComment = async () => {
    if (!id || !newComment.trim()) return
    try {
      const newComm = await addOutfitComment(Number(id), { content: newComment, rating })
      setComments([newComm, ...comments])
      setNewComment('')
      setRating(undefined)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddToCart = async () => {
    if (!outfit) return
    setAdding(true)
    try {
      const allItems = [
        ...(outfit.tops || []),
        ...(outfit.bottoms || []),
        ...(outfit.footwear || []),
        ...(outfit.accessories || []),
        ...(outfit.fragrances || []),
      ]

      await Promise.all(
        allItems.map(async (it) => {
          try {
            const resp = await api.get<{ variants?: VariantOut[]; price?: number; image_url?: string; name: string }>(
              `/api/items/${it.id}`
            )
            const data = resp.data
            const variant = data.variants && data.variants.length > 0 ? data.variants[0] : undefined
            const variantId = variant?.id ?? it.id
            const price = variant?.price ?? data.price ?? 0

            await addItem({
              id: variantId,
              item_id: it.id,
              name: data.name,
              price,
              image_url: data.image_url,
              size: variant?.size,
              color: variant?.color,
              stock: variant?.stock,
              quantity: 1,
            })
          } catch (err) {
            console.error(err)
          }
        })
      )
    } catch (err) {
      console.error(err)
    } finally {
      setAdding(false)
    }
  }

  const previewLayers = useMemo(() => {
    if (!outfit) {
      // Return placeholders to keep indexes in sync
      return categoryConfig.map(() => null)
    }
    // Return array of image urls by same ordering as categoryConfig
    return categoryConfig.map((c) => {
      const key = c.key as keyof Outfit
      const items = outfit[key] as Item[] | undefined
      const first = items && items.length ? items[0] : undefined
      return first?.image_url || null
    })
  }, [outfit])

  if (loading) return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/2">
          <Skeleton className="aspect-[4/5] rounded-xl" />
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

  if (!outfit) return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="container mx-auto px-4 py-16 text-center"
    >
      <ShoppingCart className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
      <h3 className="mb-2 text-2xl font-semibold tracking-tight">Образ не найден</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Возможно, образ был удален или перемещен
      </p>
      <Button asChild variant="outline" className="rounded-full">
        <Link to="/outfits">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Вернуться к образам
        </Link>
      </Button>
    </motion.div>
  )

  const categories = [
    { label: 'Верх', items: outfit.tops, key: 'tops' },
    { label: 'Низ', items: outfit.bottoms, key: 'bottoms' },
    { label: 'Обувь', items: outfit.footwear, key: 'footwear' },
    { label: 'Аксессуары', items: outfit.accessories, key: 'accessories' },
    { label: 'Ароматы', items: outfit.fragrances, key: 'fragrances' },
  ]

  return (
    <>
      {outfit && (
        <Helmet>
          <title>{outfit.name} — Образ в TRC</title>
          <meta name="description" content={outfit.description || 'Уникальный модный образ на платформе TRC.'} />
          <meta name="keywords" content={`мода, образ, стиль, ${outfit.style || ''}, купить`} />
          <meta property="og:title" content={outfit.name} />
          <meta property="og:description" content={outfit.description || ''} />
        </Helmet>
      )}
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
            <Link to="/outfits" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Назад к образам
            </Link>
          </Button>
        </motion.div>

        {/* Main outfit section */}
        <div className="mb-16 flex flex-col gap-8 md:flex-row md:gap-12">
          {/* Outfit preview */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full md:w-1/2"
          >
            <div className="aspect-[4/5] relative overflow-hidden rounded-xl bg-muted shadow-sm border">
              {outfit.tryon_image_url ? (
                // Показываем сгенерированное изображение виртуальной примерки
                <img
                  src={outfit.tryon_image_url.startsWith('/') ? `${window.location.origin}${outfit.tryon_image_url}` : outfit.tryon_image_url}
                  alt="Виртуальная примерка"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Ошибка загрузки изображения виртуальной примерки:', outfit.tryon_image_url)
                    // Fallback к стандартному превью с манекеном
                    e.currentTarget.style.display = 'none'
                    // Показываем стандартный превью
                    const container = e.currentTarget.parentElement
                    if (container) {
                      container.innerHTML = `
                      <img src="/maneken.jpg" alt="Манекен" class="absolute inset-0 w-full h-full object-contain" />
                      ${previewLayers.map((url, idx) => 
                        url ? `<img src="${url}" alt="layer" class="absolute inset-0 w-full h-full object-contain" style="z-index: ${idx + 1}" />` : ''
                      ).join('')}
                    `
                    }
                  }}
                />
              ) : (
                // Стандартный превью с манекеном и слоями
                <>
                  <img
                    src="/maneken.jpg"
                    alt="Манекен"
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                  {previewLayers.map((url, idx) => {
                    if (!url) return null
                    return (
                      <img
                        key={idx}
                        src={url}
                        alt="layer"
                        className="absolute inset-0 w-full h-full object-contain"
                        style={{ zIndex: idx + 1 }}
                      />
                    )
                  })}
                </>
              )}
            </div>
          </motion.div>

          {/* Outfit info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full md:w-1/2"
          >
            <div className="mb-4">
              <Badge variant="outline" className="text-xs capitalize mb-4">
                Образ
              </Badge>
            </div>

            <h1 className="mb-2 text-2xl sm:text-3xl font-bold tracking-tight">{outfit.name}</h1>
            
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-md bg-muted/80 p-2 sm:p-2.5 border border-border/50">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Стиль</p>
                <p className="text-sm font-medium leading-tight">{outfit.style}</p>
              </div>
              {outfit.total_price && (
                <div className="rounded-md bg-muted/80 p-2 sm:p-2.5 border border-border/50">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Стоимость</p>
                  <p className="text-sm font-medium leading-tight">{outfit.total_price.toLocaleString('ru-RU')} ₽</p>
                </div>
              )}
            </div>

            {outfit.description && (
              <div className="mb-6">
                <h3 className="mb-2 font-medium text-base sm:text-lg">Описание</h3>
                <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">{outfit.description}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="flex-1 rounded-lg shadow-sm hover:shadow-md transition-shadow w-full sm:w-auto"
                disabled={adding}
                onClick={handleAddToCart}
              >
                <ShoppingCart className="mr-2 w-4 h-4" />
                {adding ? 'Добавление...' : 'Добавить в корзину'}
              </Button>
              
              <Button
                size="lg"
                variant={favorited ? "default" : "outline"}
                className="rounded-lg px-3 shadow-sm hover:shadow-md transition-shadow w-full sm:w-auto"
                onClick={handleToggleFavorite}
              >
                <Heart 
                  className={`h-5 w-5 ${favorited ? 'fill-current' : ''}`}
                  strokeWidth={favorited ? 2 : 1.5}
                />
              </Button>

              {(user && (user.id === (outfit.owner_id as any) || isAdmin)) && (
                <Button 
                  asChild 
                  size="lg"
                  variant="outline" 
                  className="rounded-lg px-3 shadow-sm hover:shadow-md transition-shadow w-full sm:w-auto"
                >
                  <Link to={`/outfits/${outfit.id}/edit`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </motion.div>
        </div>

        {/* Items by Category */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight mb-2">
              Состав образа
            </h2>
          </div>
          <div className="space-y-12">
            {categories.map((cat) => (
              cat.items.length > 0 && (
                <motion.div 
                  key={cat.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  <h3 className="text-base sm:text-lg font-medium text-foreground uppercase tracking-wider border-l-4 border-primary pl-4">
                    {cat.label}
                  </h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {cat.items.map((item) => (
                      <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="group overflow-hidden transition-all hover:shadow-lg border-0 shadow-sm rounded-lg">
                          <Link to={`/items/${item.id}`} className="block">
                            <div className="relative aspect-square overflow-hidden">
                              <ItemImage
                                src={item.image_url}
                                alt={item.name}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                fallbackClassName="flex h-full w-full items-center justify-center bg-muted"
                              />
                            </div>
                            <CardContent className="p-2 sm:p-3">
                              <h4 className="font-medium leading-tight line-clamp-2 text-xs sm:text-sm group-hover:text-primary transition-colors" title={item.name}>
                                {item.name}
                              </h4>
                            </CardContent>
                          </Link>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )
            ))}
          </div>
        </motion.section>

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
                placeholder="Поделитесь своим мнением об этом образе..."
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
                Будьте первым, кто оставит отзыв об этом образе
              </p>
            </motion.div>
          ) : (
            <motion.ul className="space-y-4">
              {comments.map((comment) => (
                <motion.li 
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="overflow-hidden border-0 shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{(comment as any).user_name ?? 'Пользователь'}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString('ru-RU', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        {(user?.id === comment.user_id || isAdmin) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600 h-8 w-8 rounded-full"
                            onClick={async () => {
                              if (!id) return
                              if (!confirm('Удалить комментарий?')) return
                              try {
                                await deleteOutfitComment(Number(id), comment.id)
                                setComments((prev) => prev.filter((x) => x.id !== comment.id))
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
                      {comment.rating !== undefined && comment.rating !== null && (
                        <div className="mb-3">
                          <RatingStars value={comment.rating} />
                        </div>
                      )}
                      
                      <p className="mb-4 whitespace-pre-line text-muted-foreground">{comment.content}</p>
                      
                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-2 rounded-full"
                          onClick={async () => {
                            if (!id || !user) return;
                            try {
                              await likeOutfitComment(Number(id), comment.id);
                              const updatedComments = await listOutfitComments(Number(id));
                              setComments(updatedComments);
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                        >
                          <Heart
                            className={`h-4 w-4 ${comment.likes > 0 ? 'fill-primary text-primary' : ''}`}
                          />
                          <span>{comment.likes}</span>
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
    </>
  )
}

export default OutfitDetail