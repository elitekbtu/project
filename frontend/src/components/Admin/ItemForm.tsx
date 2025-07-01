import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, ArrowLeft, Save, Plus, Trash2, Upload, Link as LinkIcon } from 'lucide-react'
import {
  getItem,
  createItem,
  updateItem,
  listVariants,
  createVariant as apiCreateVariant,
  deleteVariant as apiDeleteVariant,
  listItemImages,
  deleteItemImage as apiDeleteItemImage,
} from '../../api/items'
import { type ItemUpdate, type VariantCreate } from '../../api/schemas'
import type { ItemImageOut } from '../../api/items'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Label } from '../../components/ui/label'
import { useToast } from '../../components/ui/use-toast'
import type { Body_create_item_api_items__post as ItemCreate } from '../../api/schemas'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { Badge } from '../../components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../../components/ui/dropdown-menu'

const emptyItem: ItemCreate = {
  name: '',
  brand: '',
  color: '',
  clothing_type: 'tshirt',
  image_url: '',
  description: '',
  price: undefined,
  category: 'tshirt',
  article: '',
  size: '',
  style: '',
  collection: '',
}

const categories = [
  { value: 'tshirt', label: 'Футболка' },
  { value: 'shirt', label: 'Рубашка' },
  { value: 'hoodie', label: 'Худи' },
  { value: 'sweater', label: 'Свитер' },
  { value: 'jacket', label: 'Куртка' },
  { value: 'coat', label: 'Пальто' },
  { value: 'dress', label: 'Платье' },
  { value: 'pants', label: 'Штаны' },
  { value: 'jeans', label: 'Джинсы' },
  { value: 'shorts', label: 'Шорты' },
  { value: 'skirt', label: 'Юбка' },
  { value: 'accessories', label: 'Аксессуары' },
  { value: 'footwear', label: 'Обувь' },
  { value: 'fragrances', label: 'Ароматы' },
]

const ItemForm = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const isEdit = !!id

  const [form, setForm] = useState<ItemCreate>(emptyItem)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [variants, setVariants] = useState<VariantCreate[]>([])
  const [existingImages, setExistingImages] = useState<ItemImageOut[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchItem = async () => {
      try {
        if (isEdit) {
          const data = await getItem(Number(id))
          setForm({ ...(data as ItemCreate), clothing_type: (data as any).category as any })
          try {
            const imgs = await listItemImages(Number(id))
            setExistingImages(imgs)
          } catch (_) {/* ignore */}
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: 'Не удалось загрузить данные о товаре',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchItem()
  }, [id, isEdit, toast])

  useEffect(() => {
    const fetchVariants = async () => {
      if (!isEdit) return
      try {
        const data = await listVariants(Number(id))
        setVariants(data.map((v) => ({ size: v.size, color: v.color, sku: v.sku, stock: v.stock, price: v.price })))
      } catch (_) {
        /* ignore */
      }
    }
    fetchVariants()
  }, [id, isEdit])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev: ItemCreate) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'clothing_type') {
      setForm((prev) => ({ ...prev, clothing_type: value as any, category: value }))
    } else if (name === 'category') {
      setForm((prev) => ({ ...prev, category: value, clothing_type: value as any }))
    } else {
      setForm((prev: ItemCreate) => ({ ...prev, [name]: value }))
    }
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev: ItemCreate) => ({ ...prev, [name]: value === '' ? undefined : Number(value) }))
  }

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const selected = Array.from(e.target.files)
    setFiles(selected)
  }

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name.trim()) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Название товара обязательно' })
      return
    }
    if (form.price !== undefined && form.price <= 0) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Цена должна быть положительным числом' })
      return
    }

    setSubmitting(true)

    try {
      let itemId: number | null = null

      if (isEdit) {
        const payload: ItemUpdate = { ...form }
        await updateItem(Number(id), payload)
        itemId = Number(id)
        toast({
          title: 'Успешно',
          description: 'Товар успешно обновлен',
        })
      } else {
        const formData = new FormData()
        Object.entries(form).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            formData.append(key, String(value))
          }
        })
        files.forEach((file) => {
          formData.append('images', file)
        })
        const created = await createItem(formData)
        itemId = created.id
        toast({
          title: 'Успешно',
          description: 'Товар успешно создан',
        })
      }

      if (itemId && variants.length > 0) {
        if (isEdit) {
          const existing = await listVariants(itemId)
          await Promise.all(existing.map((v) => apiDeleteVariant(itemId!, v.id)))
        }
        for (const v of variants) {
          await apiCreateVariant(itemId, v)
        }
      }

      navigate('/admin/items')
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Произошла ошибка при сохранении',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="container mx-auto max-w-4xl px-4 py-8"
    >
      <div className="mb-8 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin/items')}
          className="shrink-0 hover:bg-accent/50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          {isEdit ? 'Редактирование товара' : 'Создание нового товара'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Основная информация */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold">
            Основная информация
          </h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Название*</Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Название товара"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Бренд</Label>
              <Input
                id="brand"
                name="brand"
                value={form.brand || ''}
                onChange={handleChange}
                placeholder="Бренд"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Категория товара</Label>
              <Select
                value={form.category}
                onValueChange={(value) => handleSelectChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Цена</Label>
              <Input
                id="price"
                name="price"
                type="number"
                value={form.price ?? ''}
                onChange={handleNumberChange}
                placeholder="Цена"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="size">Размер</Label>
              <Input
                id="size"
                name="size"
                value={form.size || ''}
                onChange={handleChange}
                placeholder="Размер"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Цвет</Label>
              <Input
                id="color"
                name="color"
                value={form.color || ''}
                onChange={handleChange}
                placeholder="Цвет"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="article">Артикул / SKU</Label>
              <Input
                id="article"
                name="article"
                value={form.article || ''}
                onChange={handleChange}
                placeholder="Уникальный артикул товара"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="style">Стиль</Label>
              <Input
                id="style"
                name="style"
                value={form.style || ''}
                onChange={handleChange}
                placeholder="Классический, спорт-шик, casual..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="collection">Коллекция</Label>
              <Input
                id="collection"
                name="collection"
                value={form.collection || ''}
                onChange={handleChange}
                placeholder="Напр. Summer 2024"
              />
            </div>
          </div>
        </div>

        {/* Изображения и описание */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold">
            Изображение и описание
          </h2>
          
          <div className="space-y-6">
            {/* Upload controls */}
            <div className="space-y-2">
              <Label htmlFor="image_files">Загрузить изображения</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    <span>Загрузить</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-40">
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault()
                      fileInputRef.current?.click()
                    }}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" /> Файл
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault()
                      const url = prompt('Введите URL изображения:')
                      if (!url) return
                      if (!/^https?:\/\//.test(url)) {
                        toast({ variant: 'destructive', title: 'Ошибка', description: 'URL должен начинаться с http:// или https://' })
                        return
                      }
                      setForm((prev) => ({ ...prev, image_url: url }))
                    }}
                    className="flex items-center gap-2"
                  >
                    <LinkIcon className="h-4 w-4" /> Ссылка
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <input
                id="image_files"
                ref={fileInputRef}
                name="image_files"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesChange}
                className="hidden"
              />
              <span className="text-sm text-muted-foreground block">
                {files.length > 0 ? `${files.length} файлов выбрано` : 'Файлы не выбраны'}
              </span>
            </div>

            {/* Image previews */}
            {(existingImages.length > 0 || files.length > 0) && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {/* Existing images */}
                {existingImages.map((img) => (
                  <div key={img.id} className="relative group h-40 w-full overflow-hidden rounded-lg border">
                    <img 
                      src={img.image_url} 
                      alt="Изображение товара" 
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm('Удалить изображение?')) return
                        try {
                          await apiDeleteItemImage(Number(id), img.id)
                          setExistingImages((prev) => prev.filter((x) => x.id !== img.id))
                        } catch (err) {
                          toast({ 
                            variant: 'destructive', 
                            title: 'Ошибка', 
                            description: 'Не удалось удалить изображение' 
                          })
                        }
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-6 w-6 text-white" />
                    </button>
                  </div>
                ))}

                {/* New files preview */}
                {files.map((file, idx) => (
                  <div key={idx} className="relative group h-40 w-full overflow-hidden rounded-lg border">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`preview-${idx}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-6 w-6 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Preview for image URL */}
            {form.image_url && (
              <div className="flex justify-center">
                <div className="relative h-48 w-48 overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/20">
                  <img
                    src={form.image_url}
                    alt="Предпросмотр"
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                name="description"
                value={form.description || ''}
                onChange={handleChange}
                placeholder="Подробное описание товара"
                rows={5}
                className="min-h-[120px]"
              />
            </div>
          </div>
        </div>

        {/* Вариации */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Вариации и остатки</h2>
            <Badge variant="outline" className="px-3 py-1">
              {variants.length} вариаций
            </Badge>
          </div>

          {variants.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 p-8 text-center">
              <p className="mb-4 text-muted-foreground">Вариации ещё не добавлены</p>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setVariants([{ size: '', color: '', sku: '', stock: 0, price: undefined }])}
              >
                <Plus className="mr-2 h-4 w-4" />
                Добавить вариацию
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-2 font-medium text-sm text-muted-foreground">
                <div className="col-span-3">Размер</div>
                <div className="col-span-2">Цвет</div>
                <div className="col-span-2">SKU</div>
                <div className="col-span-2">Остаток</div>
                <div className="col-span-2">Цена</div>
                <div className="col-span-1"></div>
              </div>

              {variants.map((variant, idx) => (
                <div key={idx} className="grid grid-cols-12 items-center gap-2">
                  <Input
                    className="col-span-3"
                    placeholder="Размер"
                    value={variant.size || ''}
                    onChange={(e) => {
                      setVariants((prev) => {
                        const copy = [...prev]
                        copy[idx].size = e.target.value
                        return copy
                      })
                    }}
                  />
                  <Input
                    className="col-span-2"
                    placeholder="Цвет"
                    value={variant.color || ''}
                    onChange={(e) => {
                      setVariants((prev) => {
                        const copy = [...prev]
                        copy[idx].color = e.target.value
                        return copy
                      })
                    }}
                  />
                  <Input
                    className="col-span-2"
                    placeholder="SKU"
                    value={variant.sku || ''}
                    onChange={(e) => {
                      setVariants((prev) => {
                        const copy = [...prev]
                        copy[idx].sku = e.target.value
                        return copy
                      })
                    }}
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    placeholder="Остаток"
                    value={variant.stock ?? ''}
                    onChange={(e) => {
                      setVariants((prev) => {
                        const copy = [...prev]
                        copy[idx].stock = Number(e.target.value)
                        return copy
                      })
                    }}
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    placeholder="Цена"
                    value={variant.price ?? ''}
                    onChange={(e) => {
                      setVariants((prev) => {
                        const copy = [...prev]
                        copy[idx].price = e.target.value === '' ? undefined : Number(e.target.value)
                        return copy
                      })
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setVariants((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button 
                type="button" 
                variant="outline"
                onClick={() => setVariants([...variants, { size: '', color: '', sku: '', stock: 0, price: undefined }])}
              >
                <Plus className="mr-2 h-4 w-4" />
                Добавить вариацию
              </Button>
            </div>
          )}
        </div>

        {/* Form actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/items')}
          >
            Отмена
          </Button>
          <Button 
            type="submit" 
            disabled={submitting}
            className="min-w-32"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Сохранить
              </>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  )
}

export default ItemForm