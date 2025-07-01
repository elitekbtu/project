import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, ArrowLeft, Save } from 'lucide-react'
import { createOutfit, updateOutfit, getOutfit } from '../../api/outfits'
import { type OutfitCreate, type OutfitUpdate } from '../../api/schemas'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Label } from '../../components/ui/label'
import { useToast } from '../../components/ui/use-toast'
import { cn } from '../../lib/utils'

const emptyOutfit: OutfitCreate = {
  name: '',
  style: '',
  description: '',
  top_ids: [],
  bottom_ids: [],
  footwear_ids: [],
  accessories_ids: [],
  fragrances_ids: [],
  collection: '',
}

const OutfitForm = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const isEdit = !!id

  const [form, setForm] = useState<OutfitCreate>(emptyOutfit)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchOutfit = async () => {
      try {
        if (isEdit) {
          const data = await getOutfit(Number(id))
          setForm({
            name: data.name,
            style: data.style,
            description: data.description ?? '',
            top_ids: (data.tops || []).map((t) => t.id),
            bottom_ids: (data.bottoms || []).map((b) => b.id),
            footwear_ids: (data.footwear || []).map((f) => f.id),
            accessories_ids: (data.accessories || []).map((a) => a.id),
            fragrances_ids: (data.fragrances || []).map((fr) => fr.id),
            collection: data.collection ?? '',
          })
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: 'Не удалось загрузить данные об образе',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchOutfit()
  }, [id, isEdit, toast])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev: OutfitCreate) => ({ ...prev, [name]: value }))
  }

  const handleIdsChange = (name: keyof OutfitCreate, value: string) => {
    const ids = value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
      .map(Number)
    setForm((prev: OutfitCreate) => ({ ...prev, [name]: ids as any }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Client-side validation
    if (!form.name.trim() || !form.style.trim()) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Название и стиль обязательны' })
      return
    }
    const hasAnyItems = [form.top_ids, form.bottom_ids, form.footwear_ids, form.accessories_ids, form.fragrances_ids]
      .some((arr) => arr && arr.length > 0)
    if (!hasAnyItems) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Добавьте хотя бы один элемент в образ' })
      return
    }

    setSubmitting(true)

    try {
      const basePayload = { ...form, collection: form.collection?.trim() || undefined }
      if (isEdit) {
        const payload: OutfitUpdate = basePayload
        await updateOutfit(Number(id), payload)
        toast({
          title: 'Успешно',
          description: 'Образ успешно обновлен',
        })
      } else {
        await createOutfit(basePayload as OutfitCreate)
        toast({
          title: 'Успешно',
          description: 'Образ успешно создан',
        })
      }
      navigate('/admin/outfits')
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
      className="container mx-auto max-w-3xl px-4 py-8"
    >
      <div className="mb-8 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin/outfits')}
          className="shrink-0 hover:bg-accent/50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {isEdit ? 'Редактирование образа' : 'Создание нового образа'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold text-foreground">Основная информация</h2>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="name" className="text-sm font-medium text-muted-foreground">
                Название*
              </Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Название образа"
                className="focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="style" className="text-sm font-medium text-muted-foreground">
                Стиль*
              </Label>
              <Input
                id="style"
                name="style"
                value={form.style}
                onChange={handleChange}
                required
                placeholder="Стиль образа"
                className="focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="collection" className="text-sm font-medium text-muted-foreground">
                Коллекция
              </Label>
              <Input
                id="collection"
                name="collection"
                value={form.collection || ''}
                onChange={handleChange}
                placeholder="Напр. Summer 2024"
                className="focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="description" className="text-sm font-medium text-muted-foreground">
                Описание
              </Label>
              <Textarea
                id="description"
                name="description"
                value={form.description || ''}
                onChange={handleChange}
                placeholder="Описание образа"
                rows={4}
                className="min-h-[120px] focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold text-foreground">Состав образа</h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            {(
              [
                { key: 'top_ids', label: 'ID верха' },
                { key: 'bottom_ids', label: 'ID низа' },
                { key: 'footwear_ids', label: 'ID обуви' },
                { key: 'accessories_ids', label: 'ID аксессуаров' },
                { key: 'fragrances_ids', label: 'ID ароматов' },
              ] as const
            ).map((field) => (
              <div key={field.key} className="space-y-3">
                <Label htmlFor={field.key} className="text-sm font-medium text-muted-foreground">
                  {field.label} (через запятую)
                </Label>
                <Input
                  id={field.key}
                  value={(form[field.key] ?? []).join(', ')}
                  onChange={(e) => handleIdsChange(field.key, e.target.value)}
                  placeholder="Например: 123, 456, 789"
                  className="focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/outfits')}
            className="border-muted-foreground/30 hover:bg-muted/50"
          >
            Отмена
          </Button>
          <Button 
            type="submit" 
            disabled={submitting}
            className="bg-primary hover:bg-primary/90"
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className={cn('h-4 w-4', !submitting && 'mr-2')} />
            {submitting ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </form>
    </motion.div>
  )
}

export default OutfitForm