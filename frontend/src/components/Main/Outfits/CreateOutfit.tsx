import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Save, X, Search } from 'lucide-react'
import { Input } from '../../ui/input'
import { Textarea } from '../../ui/textarea'
import { Label } from '../../ui/label'
import { useToast } from '../../ui/use-toast'
import { listItems, listCollections } from '../../../api/items'
import { type ItemOut } from '../../../api/schemas'
import { createOutfit } from '../../../api/outfits'
import { categoryConfig } from './OutfitBuilder'
import { Button } from '../../ui/button'

interface IndexState {
  [key: string]: number
}

// Map category key to payload field
const idFieldMap: Record<string, string> = {
  tops: 'top_ids',
  bottoms: 'bottom_ids',
  footwear: 'footwear_ids',
  accessories: 'accessories_ids',
  fragrances: 'fragrances_ids',
}

const CreateOutfit = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [itemsByCat, setItemsByCat] = useState<Record<string, ItemOut[]>>({})
  const [indexByCat, setIndexByCat] = useState<IndexState>({})
  const [selectedByCat, setSelectedByCat] = useState<Record<string, ItemOut[]>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [style, setStyle] = useState('')
  const [description, setDescription] = useState('')
  const [collection, setCollection] = useState<string>('')
  const [collections, setCollections] = useState<string[]>([])

  // Search state
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ItemOut[]>([])
  const [searching, setSearching] = useState(false)

  // Compute total price of currently selected items
  const totalPrice = useMemo(() => {
    let total = 0
    categoryConfig.forEach((c) => {
      const selList = selectedByCat[c.key] || []
      selList.forEach((it) => {
        if (typeof it.price === 'number') total += it.price
      })
    })
    return total
  }, [selectedByCat])

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const grouped: Record<string, ItemOut[]> = {}
        const idx: IndexState = {}
        const sel: Record<string, ItemOut[]> = {}

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
      } catch (err) {
        console.error(err)
        toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось загрузить список вещей' })
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
    listCollections().then(setCollections).catch(() => {})
  }, [toast])

  // Debounced search effect
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

  const cycle = (key: string, dir: 'prev' | 'next') => {
    setIndexByCat((prev) => {
      const list = itemsByCat[key] || []
      if (list.length === 0) return prev
      const current = prev[key] ?? 0
      const next = dir === 'next' ? (current + 1) % list.length : (current - 1 + list.length) % list.length
      return { ...prev, [key]: next }
    })
  }

  const toggleSelect = (key: string) => {
    setSelectedByCat((prev) => {
      const list = itemsByCat[key] || []
      const currIdx = indexByCat[key] ?? 0
      const item = list[currIdx]
      if (!item) return prev
      const exists = prev[key]?.some((it) => it.id === item.id) ?? false
      const updated = exists ? prev[key].filter((x) => x.id !== item.id) : [...(prev[key] || []), item]
      return { ...prev, [key]: updated }
    })
  }

  // Add item directly from search results
  const addItemDirect = (item: ItemOut) => {
    const conf = categoryConfig.find((c) => c.apiTypes.some((t) => t === (item.category || '')))
    if (!conf) return
    setSelectedByCat((prev) => {
      const already = prev[conf.key]?.some((it) => it.id === item.id) ?? false
      const updated = already ? prev[conf.key] : [...(prev[conf.key] || []), item]
      return { ...prev, [conf.key]: updated }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !style.trim()) {
      toast({ variant: 'destructive', title: 'Заполните обязательные поля' })
      return
    }

    // Validate at least one selected item
    const hasAnySelected = categoryConfig.some((c) => (selectedByCat[c.key] || []).length > 0)
    if (!hasAnySelected) {
      toast({
        variant: 'destructive',
        title: 'Пустой образ',
        description: 'Добавьте хотя бы один предмет, чтобы создать образ.',
      })
      return
    }

    setSubmitting(true)
    try {
      // Prepare payload
      const payload: Record<string, any> = {
        name,
        style,
        description,
        collection: collection || undefined,
      }
      categoryConfig.forEach((c) => {
        const selList = selectedByCat[c.key] || []
        if (selList.length > 0) {
          (payload as any)[idFieldMap[c.key]] = selList.map((it) => it.id)
        } else {
          (payload as any)[idFieldMap[c.key]] = []
        }
      })
      const newOutfit = await createOutfit(payload as any)
      toast({ title: 'Образ создан', description: 'Вы перенаправлены на страницу образа' })
      navigate(`/outfits/${newOutfit.id}`)
    } catch (err: any) {
      console.error(err)
      const message = err?.response?.data?.detail || 'Не удалось создать образ'
      toast({ variant: 'destructive', title: 'Ошибка', description: message })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-black" />
          <span className="text-black text-sm">Загрузка...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <div className="border-b border-gray-200 pb-6 mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">Создание образа</h1>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Preview Section */}
          <div className="space-y-8">
            {/* Mannequin Preview */}
            <div className="flex justify-center">
              <div className="relative w-80 h-[520px] border border-gray-200 bg-gray-50">
                <img 
                  src="/maneken.jpg" 
                  alt="Манекен" 
                  className="absolute inset-0 w-full h-full object-contain"
                />
                {categoryConfig.flatMap((c, i) => {
                  const selList = selectedByCat[c.key] || []
                  return selList.map((sel, j) => (
                    sel.image_url ? (
                      <img 
                        key={`${c.key}-${sel.id}`} 
                        src={sel.image_url} 
                        alt={sel.name} 
                        className="absolute inset-0 w-full h-full object-contain" 
                        style={{ zIndex: i + j + 1 }} 
                      />
                    ) : null
                  ))
                })}
              </div>
            </div>

            {/* Price Display */}
            <div className="text-center py-4 border-t border-gray-200">
              <div className="text-sm text-muted-foreground mb-1">Примерная стоимость</div>
              <div className="text-2xl font-bold">
                {totalPrice > 0 ? `${totalPrice.toLocaleString('ru-RU')} ₽` : '—'}
              </div>
            </div>

            {/* Search Section */}
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Поиск товара..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searching && <div className="text-sm text-gray-500">Поиск...</div>}
              {query.trim().length >= 2 && !searching && (
                <div className="max-h-60 overflow-y-auto grid gap-2 sm:grid-cols-2">
                  {searchResults.length > 0 ? searchResults.map((it) => (
                    <div key={it.id} className="flex items-center gap-2 border p-2 hover:bg-gray-50">
                      <div className="h-12 w-12 flex-shrink-0 border border-gray-200 bg-gray-50">
                        {it.image_url ? (
                          <img
                            src={it.image_url}
                            alt={it.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-gray-200" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm text-black" title={it.name}>{it.name}</div>
                        {it.category && (
                          <div className="text-xs text-gray-500 capitalize">{it.category}</div>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => addItemDirect(it)}
                        className="shrink-0"
                      >
                        Добавить
                      </Button>
                    </div>
                  )) : (
                    <div className="text-sm text-gray-400">Ничего не найдено</div>
                  )}
                </div>
              )}
            </div>

            {/* Category Controls */}
            <div className="space-y-8">
              {categoryConfig.map((c) => {
                const list = itemsByCat[c.key] || []
                const idx = indexByCat[c.key]
                const current = list[idx]
                const selectedList = selectedByCat[c.key] || []
                
                return (
                  <div key={c.key} className="border-t border-gray-100 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium uppercase tracking-wider text-foreground">
                        {c.label}
                      </h3>
                      <div className="text-xs text-gray-500">
                        {selectedList.length > 0 && `${selectedList.length} выбрано`}
                      </div>
                    </div>

                    {/* Current Item Display */}
                    <div className="flex items-center gap-4 mb-4">
                      <button
                        type="button"
                        onClick={() => cycle(c.key, 'prev')}
                        disabled={list.length === 0}
                        className="w-8 h-8 border border-gray-300 hover:border-black disabled:border-gray-200 disabled:text-gray-300 text-black flex items-center justify-center text-lg font-light transition-colors"
                      >
                        ‹
                      </button>

                      <div className="flex-1 min-h-[80px] border border-gray-200 p-4 flex items-center gap-4">
                        {current ? (
                          <>
                            <div className="w-12 h-12 border border-gray-200 bg-gray-50 flex-shrink-0">
                              {current.image_url ? (
                                <img 
                                  src={current.image_url} 
                                  alt={current.name} 
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-black truncate">{current.name}</div>
                              {current.price && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {current.price.toLocaleString('ru-RU')} ₽
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-400">Нет доступных вариантов</div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => cycle(c.key, 'next')}
                        disabled={list.length === 0}
                        className="w-8 h-8 border border-gray-300 hover:border-black disabled:border-gray-200 disabled:text-gray-300 text-black flex items-center justify-center text-lg font-light transition-colors"
                      >
                        ›
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleSelect(c.key)}
                        disabled={!current}
                        className="px-4 py-2 border border-gray-300 hover:border-black hover:bg-black hover:text-white disabled:border-gray-200 disabled:text-gray-300 text-black text-xs uppercase tracking-wider transition-colors"
                      >
                        {current && selectedList.some((it) => it.id === current.id) ? 'Убрать' : 'Добавить'}
                      </button>
                    </div>

                    {/* Selected Items */}
                    {selectedList.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {selectedList.map((it) => (
                          <div key={it.id} className="relative group">
                            <div className="w-12 h-12 border border-gray-200 bg-gray-50">
                              {it.image_url ? (
                                <img 
                                  src={it.image_url} 
                                  alt={it.name} 
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200" />
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedByCat((prev) => ({
                                ...prev,
                                [c.key]: prev[c.key].filter((x) => x.id !== it.id),
                              }))}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-black text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-2 h-2" />
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

          {/* Form Section */}
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Название образа *
                </Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Введите название"
                  required
                  className="border-gray-300 focus:border-black focus:ring-0 bg-white text-black placeholder-gray-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="style" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Стиль *
                </Label>
                <Input 
                  id="style" 
                  value={style} 
                  onChange={(e) => setStyle(e.target.value)} 
                  placeholder="Кэжуал, деловой, спортивный..."
                  required
                  className="border-gray-300 focus:border-black focus:ring-0 bg-white text-black placeholder-gray-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Описание
                </Label>
                <Textarea 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Добавьте описание образа..."
                  rows={4}
                  className="border-gray-300 focus:border-black focus:ring-0 bg-white text-black placeholder-gray-400 resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="collection" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Коллекция
                </Label>
                <select
                  id="collection"
                  value={collection}
                  onChange={(e) => setCollection(e.target.value)}
                  className="w-full border border-gray-300 focus:border-black focus:ring-0 bg-white text-black px-3 py-2 text-sm"
                >
                  <option value="">Без коллекции</option>
                  {collections.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-200">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full uppercase tracking-wider"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Создать образ
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateOutfit