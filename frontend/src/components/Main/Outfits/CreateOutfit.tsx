import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Save, X, Search, Sparkles } from 'lucide-react'
import { Input } from '../../ui/input'
import { Textarea } from '../../ui/textarea'
import { useToast } from '../../ui/use-toast'
import { listItems } from '../../../api/items'
import { type ItemOut, type OutfitCreate } from '../../../api/schemas'
import { createOutfit, generateVirtualTryon } from '../../../api/outfits'
import { categoryConfig } from './OutfitBuilder'
import { Button } from '../../ui/button'
import { UserPhotoUpload } from '../../ui/user-photo-upload'

interface IndexState {
  [key: string]: number
}

const idFieldMap: Record<string, string> = {
  top: 'top_ids',
  bottom: 'bottom_ids',
  footwear: 'footwear_ids',
  accessory: 'accessories_ids',
  fragrance: 'fragrances_ids',
}

const CreateOutfit = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [itemsByCat, setItemsByCat] = useState<Record<string, ItemOut[]>>({})
  const [indexByCat, setIndexByCat] = useState<IndexState>({})
  const [selectedByCat, setSelectedByCat] = useState<Record<string, ItemOut[]>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [generatingTryOn, setGeneratingTryOn] = useState(false)
  const [tryOnImage, setTryOnImage] = useState<string | null>(null)
  const [userPhoto, setUserPhoto] = useState<string>('')

  const [name, setName] = useState('')
  const [style, setStyle] = useState('')
  const [description, setDescription] = useState('')

  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ItemOut[]>([])

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
  }, [toast])

  useEffect(() => {
    const delay = setTimeout(() => {
      const doSearch = async () => {
        if (query.trim().length < 2) {
          setSearchResults([])
          return
        }
        try {
          const res = await listItems({ q: query.trim(), limit: 30 })
          setSearchResults(res)
        } catch (err) {
          console.error(err)
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
      const payload: OutfitCreate = { 
        name, 
        style, 
        description: description || undefined 
      }
      categoryConfig.forEach((c) => {
        const selList = selectedByCat[c.key] || []
        ;(payload as any)[idFieldMap[c.key]] = selList.map((it) => it.id)
      })
      const newOutfit = await createOutfit(payload)
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

  const handleGenerateTryOn = async () => {
    const hasAnySelected = categoryConfig.some((c) => (selectedByCat[c.key] || []).length > 0)
    if (!hasAnySelected) {
      toast({
        variant: 'destructive',
        title: 'Нет выбранных предметов',
        description: 'Добавьте хотя бы один предмет для генерации виртуальной примерки.',
      })
      return
    }

    setGeneratingTryOn(true)
    try {
      // Собираем все выбранные предметы
      const allOutfitItems = categoryConfig.flatMap((c) => {
        const items = selectedByCat[c.key] || []
        return items.map(item => ({
          id: item.id,
          name: item.name,
          image_url: item.image_url,
          category: item.category,
          price: item.price,
          brand: item.brand,
          color: item.color,
          description: item.description
        }))
      })

      // Показываем информацию о том, что будет применено
      const categoryCounts = categoryConfig.reduce((acc, c) => {
        acc[c.key] = (selectedByCat[c.key] || []).length
        return acc
      }, {} as Record<string, number>)
      
      const categoriesWithItems = Object.entries(categoryCounts)
        .filter(([_, count]) => count > 0)
        .map(([key, count]) => `${categoryConfig.find(c => c.key === key)?.label}: ${count}`)
        .join(', ')

      toast({
        title: 'Начинаем виртуальную примерку',
        description: `Будет применено по одному предмету из каждой категории: ${categoriesWithItems}`,
      })

      // Проверяем, есть ли фото пользователя
      if (!userPhoto) {
        toast({
          variant: 'destructive',
          title: 'Фото не загружено',
          description: 'Пожалуйста, загрузите свое фото для виртуальной примерки',
        })
        return
      }
      
      const result = await generateVirtualTryon({
        human_image_url: userPhoto,
        outfit_items: allOutfitItems
      })

      if (result.success) {
        setTryOnImage(result.result_image_url)
        toast({ 
          title: 'Виртуальная примерка готова', 
          description: 'Образ собран из предметов разных категорий' 
        })
      } else {
        toast({ 
          variant: 'destructive', 
          title: 'Ошибка генерации', 
          description: result.message || 'Не удалось сгенерировать виртуальную примерку' 
        })
      }
    } catch (err: any) {
      console.error(err)
      const message = err?.response?.data?.detail || 'Не удалось сгенерировать виртуальную примерку'
      toast({ variant: 'destructive', title: 'Ошибка', description: message })
    } finally {
      setGeneratingTryOn(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-black" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">

        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">Создание образа</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Название образа *</label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Введите название"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Стиль *</label>
                <Input 
                  value={style} 
                  onChange={(e) => setStyle(e.target.value)} 
                  placeholder="Кэжуал, деловой, спортивный..."
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Описание</label>
                <Textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Добавьте описание образа..."
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск товара..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2 max-h-60 overflow-auto">
              {searchResults.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 border rounded-md">
                  <span className="text-sm truncate">{item.name}</span>
                  <Button size="sm" onClick={() => addItemDirect(item)}>Добавить</Button>
                </div>
              ))}
            </div>
          </div>

          {categoryConfig.map((c) => {
            const list = itemsByCat[c.key] || []
            const current = list[indexByCat[c.key]]
            const selected = selectedByCat[c.key] || []
            return (
              <div key={c.key} className="bg-white p-4 rounded-xl border space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">{c.label}</span>
                  <span className="text-xs text-muted-foreground">{selected.length} выбрано</span>
                </div>
                <div className="flex gap-3 items-center">
                  <Button onClick={() => cycle(c.key, 'prev')}>‹</Button>
                  <div className="flex-1">
                    {current ? (
                      <div className="text-sm">{current.name}</div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Нет предметов</div>
                    )}
                  </div>
                  <Button onClick={() => cycle(c.key, 'next')}>›</Button>
                  <Button variant="outline" onClick={() => toggleSelect(c.key)}>
                    {current && selected.some((s) => s.id === current.id) ? 'Убрать' : 'Добавить'}
                  </Button>
                </div>
                {selected.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selected.map((it) => (
                      <div key={it.id} className="relative w-10 h-10 border rounded-md">
                        <img src={it.image_url} alt={it.name} className="w-full h-full object-cover rounded-md" />
                        <button
                          onClick={() =>
                            setSelectedByCat((prev) => ({
                              ...prev,
                              [c.key]: prev[c.key].filter((x) => x.id !== it.id),
                            }))
                          }
                          className="absolute -top-1 -right-1 bg-black text-white rounded-full w-4 h-4 text-xs flex items-center justify-center"
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

        <div className="sticky top-6 space-y-6">
          {/* Загрузка фото пользователя */}
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <UserPhotoUpload
              onPhotoSelected={setUserPhoto}
              currentPhoto={userPhoto}
              className=""
            />
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col items-center">
            <div className="w-full aspect-[3/4] bg-gray-100 rounded overflow-hidden relative">
              {tryOnImage ? (
                <img src={tryOnImage} className="object-cover w-full h-full" alt="Виртуальная примерка" />
              ) : (
                <img src="/maneken.jpg" className="object-cover w-full h-full" alt="Манекен" />
              )}
            </div>
            <div className="pt-4 text-center space-y-3">
              <div className="text-xs text-muted-foreground">Примерная стоимость</div>
              <div className="text-xl font-bold">
                {totalPrice > 0 ? `${totalPrice.toLocaleString('ru-RU')} ₽` : '—'}
              </div>
              
              <Button
                onClick={handleGenerateTryOn}
                disabled={generatingTryOn || !userPhoto}
                variant="default"
                size="sm"
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white disabled:opacity-50"
              >
                {generatingTryOn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Сборка образа...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Собрать образ
                  </>
                )}
              </Button>
              {!userPhoto && (
                <div className="text-xs text-muted-foreground text-center">
                  Загрузите фото для активации
                </div>
              )}
              {!categoryConfig.some((c) => (selectedByCat[c.key] || []).length > 0) && userPhoto && (
                <div className="text-xs text-muted-foreground text-center">
                  Добавьте предметы для активации
                </div>
              )}
              {categoryConfig.some((c) => (selectedByCat[c.key] || []).length > 0) && userPhoto && (
                <div className="text-xs text-muted-foreground text-center">
                  Будет применено по одному предмету из каждой категории
                </div>
              )}
            </div>
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full uppercase tracking-wide text-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Создать образ
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default CreateOutfit