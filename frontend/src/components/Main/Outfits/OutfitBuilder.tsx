import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, X, Search, Star } from 'lucide-react'
import { listItems, listFavoriteItems } from '../../../api/items'
import { type ItemOut } from '../../../api/schemas'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { useTranslation } from 'react-i18next'
import { useFavorites } from '../../../context/FavoritesContext'
import { useToast } from '../../ui/use-toast'
import { createOutfit } from '../../../api/outfits'
import { useNavigate } from 'react-router-dom'
import ItemImage from '../../common/ItemImage'
import { useAuth } from '../../../context/AuthContext'

// Новая конфигурация для 5 категорий образа
export const categoryConfig = [
  {
    key: 'top',
    apiTypes: ['top'],
    label: 'Верх',
  },
  {
    key: 'bottom',
    apiTypes: ['bottom'],
    label: 'Низ',
  },
  {
    key: 'footwear',
    apiTypes: ['footwear'],
    label: 'Обувь',
  },
  {
    key: 'accessory',
    apiTypes: ['accessory'],
    label: 'Аксессуары',
  },
  {
    key: 'fragrance',
    apiTypes: ['fragrance'],
    label: 'Ароматы',
  },
] as const

type CategoryKey = (typeof categoryConfig)[number]['key']

interface IndexState {
  [k: string]: number
}

const OutfitBuilder = () => {
  const { user } = useAuth();
  const [itemsByCat, setItemsByCat] = useState<Record<string, ItemOut[]>>({})
  const [indexByCat, setIndexByCat] = useState<IndexState>({})
  const [selectedByCat, setSelectedByCat] = useState<Record<string, ItemOut[]>>({})
  const [loading, setLoading] = useState(true)

  // Search & favorites
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ItemOut[]>([])
  const [searching, setSearching] = useState(false)
  const [favItemsByCat, setFavItemsByCat] = useState<Record<string, ItemOut[]>>({})
  const { t } = useTranslation()
  const { favoriteIds } = useFavorites()
  const { toast } = useToast()
  const navigate = useNavigate()

  // form state
  const [name, setName] = useState('')
  const [styleName, setStyleName] = useState('')
  // Убрано поле collection - коллекции больше не используются
  // Убрано - коллекции больше не используются

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const grouped: Record<string, ItemOut[]> = {}
        const idx: IndexState = {}
        const sel: Record<string, ItemOut[]> = {}

        // Fetch items for each logical category (tops, bottoms, etc.)
        await Promise.all(
          categoryConfig.map(async (c) => {
            const lists = await Promise.all(
              c.apiTypes.map((t) => listItems({ category: t, limit: 50 }))
            )
            const combined = lists.flat()
            grouped[c.key] = combined
            idx[c.key] = 0
            sel[c.key] = []
          }),
        )
        setItemsByCat(grouped)
        setIndexByCat(idx)
        setSelectedByCat(sel)

        // Fetch favorite items details once
        if (user) {
          try {
            const fav = await listFavoriteItems()
            const favGrouped: Record<string, ItemOut[]> = {}
            categoryConfig.forEach((c) => (favGrouped[c.key] = []))
            fav.forEach((item) => {
              const catConf = categoryConfig.find((c) => c.apiTypes.some((t) => t === (item.category || '')))
              if (catConf) favGrouped[catConf.key].push(item)
            })
            setFavItemsByCat(favGrouped)
          } catch (err) {
            // ignore
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  // Убрано получение коллекций

  // Search effect
  useEffect(() => {
    const delay = setTimeout(() => {
      const doSearch = async () => {
        if (query.trim().length < 2) {
          setSearchResults([])
          return
        }
        setSearching(true)
        try {
          const res = await listItems({ q: query.trim(), limit: 30 })
          setSearchResults(res)
        } catch (err) {
          console.error(err)
        } finally {
          setSearching(false)
        }
      }
      doSearch()
    }, 400)
    return () => clearTimeout(delay)
  }, [query])

  const addItemDirect = (item: ItemOut) => {
    const conf = categoryConfig.find((c) => c.apiTypes.some((t) => t === (item.category || '')))
    if (!conf) return
    setSelectedByCat((prev) => {
      const already = prev[conf.key]?.some((it) => it.id === item.id) ?? false
      const updated = already ? prev[conf.key] : [...(prev[conf.key] || []), item]
      return { ...prev, [conf.key]: updated }
    })
  }

  const cycle = (key: CategoryKey, dir: 'prev' | 'next') => {
    setIndexByCat((prev) => {
      const list = itemsByCat[key] || []
      if (list.length === 0) return prev
      const current = prev[key] ?? 0
      const nextIndex = dir === 'next' ? (current + 1) % list.length : (current - 1 + list.length) % list.length
      return { ...prev, [key]: nextIndex }
    })
  }

  const toggleSelect = (key: CategoryKey) => {
    setSelectedByCat((prev) => {
      const list = itemsByCat[key] || []
      const currIdx = indexByCat[key] ?? 0
      const item = list[currIdx]
      if (!item) return prev
      const already = prev[key]?.some((it) => it.id === item.id) ?? false
      const updated = already ? prev[key].filter((it) => it.id !== item.id) : [...(prev[key] || []), item]
      return { ...prev, [key]: updated }
    })
  }

  const mannequinUrl = '/maneken.jpg'

  if (loading) {
    return <div className="flex h-64 items-center justify-center">{t('common.loading')}</div>
  }

  return (
    <div className="container mx-auto flex flex-col gap-8 px-4 py-8 md:flex-row md:items-start">
      {/* Mannequin Preview */}
      <div className="relative mx-auto h-[520px] w-[300px] shrink-0 shadow-lg">
        <img
          src={mannequinUrl}
          alt="Mannequin"
          className="absolute inset-0 h-full w-full object-contain"
        />
        {categoryConfig.flatMap((c, i) => {
          const selectedList = selectedByCat[c.key] || []
          return selectedList.map((sel, j) => (
            sel.image_url ? (
              <ItemImage
                key={`${c.key}-${sel.id}`}
                src={sel.image_url}
                alt={sel.name}
                className="absolute inset-0 h-full w-full object-contain"
                fallbackClassName="absolute inset-0 h-full w-full"
                style={{ zIndex: i + j + 1 }}
              />
            ) : null
          ))
        })}
      </div>

      {/* Controls */}
      <div className="flex-1 space-y-6">
        {/* Search & Favorites */}
        <div className="space-y-4 rounded-xl border p-4 shadow-sm">
          {/* Basic info */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Название образа" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Стиль" value={styleName} onChange={(e) => setStyleName(e.target.value)} />
            {/* Убрано поле коллекции - больше не используется в новой системе образов */}
          </div>

          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск товара..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
          </div>
          {searching && <p className="text-sm text-muted-foreground">Поиск...</p>}
          {query.length >= 2 && !searching && (
            <div className="max-h-60 overflow-y-auto pt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {searchResults.length > 0 ? searchResults.map((it) => (
                <div key={it.id} className="flex items-center gap-2 rounded border p-2 hover:bg-accent/50">
                  <ItemImage
                    src={it.image_url}
                    alt={it.name}
                    className="h-12 w-12 rounded object-cover"
                    fallbackClassName="h-12 w-12 rounded bg-muted"
                  />
                  <div className="flex-1">
                    <p className="line-clamp-1 text-sm font-medium" title={it.name}>{it.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{it.category}</p>
                  </div>
                  <Button size="sm" onClick={() => addItemDirect(it)}>
                    Добавить
                  </Button>
                </div>
              )) : <p className="text-sm text-muted-foreground">Ничего не найдено</p>}
            </div>
          )}

          {/* Favorites */}
          {favoriteIds.length > 0 && (
            <div className="pt-4">
              <div className="mb-2 flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <p className="text-sm font-medium">Избранное</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(favItemsByCat).flatMap(([_, arr]) => arr.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => addItemDirect(it)}
                    className="relative h-14 w-14 overflow-hidden rounded border border-border/40 hover:ring-2 hover:ring-primary/40"
                  >
                    <ItemImage
                      src={it.image_url}
                      alt={it.name}
                      className="h-full w-full object-cover"
                      fallbackClassName="h-full w-full bg-muted"
                    />
                  </button>
                )))}
              </div>
            </div>
          )}
        </div>

        {/* Save button */}
        <div className="pt-4 text-right">
          <Button
            disabled={!name.trim() || !styleName.trim() || Object.values(selectedByCat).every((arr) => arr.length === 0)}
            onClick={async () => {
              try {
                const payload = {
                  name: name.trim(),
                  style: styleName.trim(),
                  description: '',
                  // Убрано поле collection
                  top_ids: selectedByCat.top?.map((i) => i.id) || [],
                  bottom_ids: selectedByCat.bottom?.map((i) => i.id) || [],
                  footwear_ids: selectedByCat.footwear?.map((i) => i.id) || [],
                  accessories_ids: selectedByCat.accessory?.map((i) => i.id) || [],
                  fragrances_ids: selectedByCat.fragrance?.map((i) => i.id) || [],
                }
                const created = await createOutfit(payload as any)
                toast({ title: 'Образ создан', description: created.name })
                navigate(`/outfits/${created.id}`)
              } catch (err: any) {
                toast({ variant: 'destructive', title: 'Ошибка', description: err?.response?.data?.detail || 'Не удалось создать образ' })
              }
            }}
          >
            Сохранить образ
          </Button>
        </div>

        {categoryConfig.map((c) => {
          const list = itemsByCat[c.key] || []
          const idx = indexByCat[c.key]
          const current = list[idx]
          const selectedList = selectedByCat[c.key] || []
          return (
            <div key={c.key} className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => cycle(c.key, 'prev')}
                disabled={list.length === 0}
                className="hover:bg-accent/50"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <div className="flex flex-1 items-center gap-4 overflow-hidden">
                <span className="w-28 shrink-0 text-sm font-medium">{c.label}</span>
                {current ? (
                  <div className="flex items-center gap-2 overflow-hidden">
                    <ItemImage
                      src={current.image_url}
                      alt={current.name}
                      className="h-20 w-20 rounded object-cover"
                      fallbackClassName="h-20 w-20 rounded bg-muted"
                    />
                    <span className="truncate text-sm">{current.name}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">{t('outfitBuilder.noOptions')}</span>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => cycle(c.key, 'next')}
                disabled={list.length === 0}
                className="hover:bg-accent/50"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>

              <Button
                variant="secondary"
                size="sm"
                disabled={!current}
                onClick={() => toggleSelect(c.key)}
              >
                {current && selectedList.some((it) => it.id === current.id) ? 'Убрать' : 'Добавить'}
              </Button>

              {selectedList.length > 0 && (
                <div className="flex gap-1 overflow-x-auto">
                  {selectedList.map((it) => (
                    <div key={it.id} className="relative h-12 w-12 shrink-0 rounded">
                      <ItemImage
                        src={it.image_url}
                        alt={it.name}
                        className="h-full w-full rounded object-cover"
                        fallbackClassName="h-full w-full rounded bg-muted"
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedByCat((prev) => ({
                          ...prev,
                          [c.key]: prev[c.key].filter((x) => x.id !== it.id),
                        }))}
                        className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default OutfitBuilder 