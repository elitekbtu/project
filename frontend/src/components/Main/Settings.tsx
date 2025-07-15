import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, Save, Trash2, Upload, Link as LinkIcon } from 'lucide-react'
import { getProfile, updateProfile, deleteProfile, uploadAvatar, deleteAvatar } from '../../api/profile'
import { type ProfileUpdate } from '../../api/schemas'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { useToast } from '../ui/use-toast'
import { useAuth } from '../../context/AuthContext'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu'
import PWAStatus from '../PWAStatus'

const emptyProfile: ProfileUpdate = {
  avatar: '',
  first_name: '',
  last_name: '',
  phone_number: '',
  date_of_birth: '',
  height: undefined,
  weight: undefined,
  chest: undefined,
  waist: undefined,
  hips: undefined,
  favorite_colors: '',
  favorite_brands: '',
}

const Settings = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { logout, updateUser } = useAuth()

  const [form, setForm] = useState<ProfileUpdate>(emptyProfile)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getProfile()
        setForm({
          avatar: data.avatar || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone_number: data.phone_number || '',
          date_of_birth: data.date_of_birth || '',
          height: data.height,
          weight: data.weight,
          chest: data.chest,
          waist: data.waist,
          hips: data.hips,
          favorite_colors: Array.isArray(data.favorite_colors)
            ? data.favorite_colors.join(', ')
            : (data.favorite_colors as string) || '',
          favorite_brands: Array.isArray(data.favorite_brands)
            ? data.favorite_brands.join(', ')
            : (data.favorite_brands as string) || '',
        })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: 'Не удалось загрузить профиль',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [toast])

  const validateField = (name: string, value: any): string => {
    switch (name) {
      case 'first_name':
      case 'last_name':
        if (value && value.trim()) {
          const trimmed = value.trim()
          if (trimmed.length > 50) {
            return `Не более 50 символов`
          }
          if (!/^[a-zA-Zа-яА-Я\s-]+$/.test(trimmed)) {
            return `Только буквы, пробелы и дефисы`
          }
        }
        break
      
      case 'phone_number':
        if (value && value.trim() && !/^\+?[0-9]{7,15}$/.test(value)) {
          return `Формат: +77071234567`
        }
        break
      
      case 'height':
        if (value !== undefined && value !== '' && value !== null) {
          const num = Number(value)
          if (isNaN(num) || num <= 0) return 'Должно быть положительным числом'
          if (num > 300) return 'Не более 300 см'
        }
        break
      
      case 'weight':
        if (value !== undefined && value !== '' && value !== null) {
          const num = Number(value)
          if (isNaN(num) || num <= 0) return 'Должно быть положительным числом'
          if (num > 500) return 'Не более 500 кг'
        }
        break
      
      case 'chest':
      case 'waist':
      case 'hips':
        if (value !== undefined && value !== '' && value !== null) {
          const num = Number(value)
          if (isNaN(num) || num <= 0) return 'Должно быть положительным числом'
          if (num > 200) return 'Не более 200 см'
        }
        break
      
      case 'date_of_birth':
        if (value && value.trim()) {
          const selected = new Date(value)
          if (isNaN(selected.getTime())) {
            return 'Некорректная дата'
          }
          
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          
          if (selected > today) {
            return 'Не может быть в будущем'
          }
          
          const age = (today.getTime() - selected.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
          if (age < 13) {
            return 'Минимум 13 лет'
          }
          if (age > 120) {
            return 'Некорректная дата'
          }
        }
        break
      
      case 'avatar':
        if (value && value.trim()) {
          const avatar = value.trim()
          if (!(avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('/'))) {
            return 'Ссылка должна быть абсолютной (http://, https://) или начинаться с /'
          }
        }
        break
    }
    return ''
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev: ProfileUpdate) => ({ ...prev, [name as keyof ProfileUpdate]: value }))
    
    // Валидация в реальном времени
    const error = validateField(name, value)
    setErrors(prev => ({
      ...prev,
      [name]: error
    }))
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const num = value === '' ? undefined : Number(value)
    if (num !== undefined && num < 0) return // игнорируем отрицательные значения
    setForm((prev: ProfileUpdate) => ({ ...prev, [name as keyof ProfileUpdate]: num }))
    
    // Валидация в реальном времени
    const error = validateField(name, value)
    setErrors(prev => ({
      ...prev,
      [name]: error
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Проверяем ошибки валидации в реальном времени
    const hasFieldErrors = Object.values(errors).some(error => error !== '')
    if (hasFieldErrors) {
      toast({
        variant: 'destructive',
        title: 'Ошибки валидации',
        description: 'Исправьте ошибки в полях формы'
      })
      return
    }

    // Подготавливаем payload для отправки
    const payload: ProfileUpdate = { ...form }
    
    // Обрабатываем строковые поля - отправляем пустые строки как есть
    // Преобразуем favorite_colors и favorite_brands в массив строк
    if (typeof payload.favorite_colors === 'string') {
      payload.favorite_colors = payload.favorite_colors
        .split(',')
        .map(s => s.trim())
        .filter(s => s !== '') // Оставляем пустые элементы для очистки
    }
    if (typeof payload.favorite_brands === 'string') {
      payload.favorite_brands = payload.favorite_brands
        .split(',')
        .map(s => s.trim())
        .filter(s => s !== '') // Оставляем пустые элементы для очистки
    }

    setSubmitting(true)
    try {
      const updated = await updateProfile(payload)
      updateUser(updated)
      toast({ title: 'Профиль обновлен' })
      navigate('/profile')
    } catch (error: any) {
      let msg = error?.response?.data?.detail || 'Не удалось обновить профиль'
      // Если detail — массив (422), собрать сообщения
      if (Array.isArray(error?.response?.data?.detail)) {
        msg = error.response.data.detail.map((d: any) => d.msg).join('. ')
      }
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: msg,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Вы уверены, что хотите удалить аккаунт? Это действие необратимо.')) return
    setDeleting(true)
    try {
      await deleteProfile()
      await logout()
      navigate('/')
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось удалить аккаунт',
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleFilesAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    setAvatarUploading(true)
    try {
      const updated = await uploadAvatar(file)
      setForm((prev) => ({ ...prev, avatar: updated.avatar }))
      updateUser(updated)
      toast({ title: 'Аватар обновлен' })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось загрузить аватар' })
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleDeleteAvatar = async () => {
    if (!form.avatar) return
    if (!confirm('Удалить аватар?')) return
    setAvatarUploading(true)
    try {
      const updated = await deleteAvatar()
      setForm((prev) => ({ ...prev, avatar: '' }))
      updateUser(updated)
      toast({ title: 'Аватар удален' })
    } catch (err: any) {
      console.error('Error deleting avatar:', err)
      let msg = 'Не удалось удалить аватар'
      if (err?.response?.data?.detail) {
        msg = err.response.data.detail
      }
      toast({ variant: 'destructive', title: 'Ошибка', description: msg })
    } finally {
      setAvatarUploading(false)
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
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="container mx-auto max-w-3xl px-4 py-12"
    >
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground">Настройки профиля</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold text-foreground">Основная информация</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <Label htmlFor="first_name" className="text-sm font-medium text-muted-foreground">
                Имя
              </Label>
              <Input
                id="first_name"
                name="first_name"
                value={form.first_name || ''}
                onChange={handleChange}
                placeholder="Имя"
                className={`focus:ring-1 focus:ring-primary ${
                  errors.first_name ? 'border-red-500 focus:border-red-500' : 'focus:border-primary'
                }`}
              />
              {errors.first_name && (
                <p className="text-sm text-red-500">{errors.first_name}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="last_name" className="text-sm font-medium text-muted-foreground">
                Фамилия
              </Label>
              <Input
                id="last_name"
                name="last_name"
                value={form.last_name || ''}
                onChange={handleChange}
                placeholder="Фамилия"
                className={`focus:ring-1 focus:ring-primary ${
                  errors.last_name ? 'border-red-500 focus:border-red-500' : 'focus:border-primary'
                }`}
              />
              {errors.last_name && (
                <p className="text-sm text-red-500">{errors.last_name}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="phone_number" className="text-sm font-medium text-muted-foreground">
                Телефон
              </Label>
              <Input
                id="phone_number"
                name="phone_number"
                value={form.phone_number || ''}
                onChange={handleChange}
                placeholder="+77071234567"
                className={`focus:ring-1 focus:ring-primary ${
                  errors.phone_number ? 'border-red-500 focus:border-red-500' : 'focus:border-primary'
                }`}
              />
              {errors.phone_number && (
                <p className="text-sm text-red-500">{errors.phone_number}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="date_of_birth" className="text-sm font-medium text-muted-foreground">
                Дата рождения
              </Label>
              <Input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                value={form.date_of_birth || ''}
                onChange={handleChange}
                className={`focus:ring-1 focus:ring-primary ${
                  errors.date_of_birth ? 'border-red-500 focus:border-red-500' : 'focus:border-primary'
                }`}
              />
              {errors.date_of_birth && (
                <p className="text-sm text-red-500">{errors.date_of_birth}</p>
              )}
            </div>
            <div className="space-y-3 md:col-span-2 order-first">
              <Label className="text-sm font-medium text-muted-foreground">Аватар</Label>
              <div className="flex items-center gap-4">
                <div className="relative h-24 w-24 overflow-hidden rounded-full border">
                  {form.avatar ? (
                    <>
                      <img src={form.avatar} alt="avatar" className="h-full w-full rounded-full object-cover" />
                      <button
                        type="button"
                        onClick={handleDeleteAvatar}
                        disabled={avatarUploading}
                        className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition"
                      >
                        {avatarUploading ? (
                          <Loader2 className="h-6 w-6 animate-spin text-red-500" />
                        ) : (
                          <Trash2 className="h-6 w-6 text-red-500" />
                        )}
                      </button>
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Нет</div>
                  )}
                </div>
                {/* hidden real file input */}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFilesAvatar}
                  className="hidden"
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm" disabled={avatarUploading} className="flex items-center gap-2">
                      {avatarUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
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
                        // basic validation
                        if (!/^https?:\/\//.test(url)) {
                          toast({ variant: 'destructive', title: 'Ошибка', description: 'URL должен начинаться с http:// или https://' })
                          return
                        }
                        setForm((prev) => ({ ...prev, avatar: url }))
                      }}
                      className="flex items-center gap-2"
                    >
                      <LinkIcon className="h-4 w-4" /> Ссылка
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold text-foreground">Параметры тела</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-3">
              <Label htmlFor="height" className="text-sm font-medium text-muted-foreground">
                Рост (см)
              </Label>
              <Input
                id="height"
                name="height"
                type="number"
                value={form.height ?? ''}
                onChange={handleNumberChange}
                placeholder="e.g. 180"
                className={`focus:ring-1 focus:ring-primary ${
                  errors.height ? 'border-red-500 focus:border-red-500' : 'focus:border-primary'
                }`}
              />
              {errors.height && (
                <p className="text-sm text-red-500">{errors.height}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="weight" className="text-sm font-medium text-muted-foreground">
                Вес (кг)
              </Label>
              <Input
                id="weight"
                name="weight"
                type="number"
                value={form.weight ?? ''}
                onChange={handleNumberChange}
                placeholder="e.g. 75"
                className={`focus:ring-1 focus:ring-primary ${
                  errors.weight ? 'border-red-500 focus:border-red-500' : 'focus:border-primary'
                }`}
              />
              {errors.weight && (
                <p className="text-sm text-red-500">{errors.weight}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="chest" className="text-sm font-medium text-muted-foreground">
                Грудь (см)
              </Label>
              <Input
                id="chest"
                name="chest"
                type="number"
                value={form.chest ?? ''}
                onChange={handleNumberChange}
                placeholder="e.g. 96"
                className={`focus:ring-1 focus:ring-primary ${
                  errors.chest ? 'border-red-500 focus:border-red-500' : 'focus:border-primary'
                }`}
              />
              {errors.chest && (
                <p className="text-sm text-red-500">{errors.chest}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="waist" className="text-sm font-medium text-muted-foreground">
                Талия (см)
              </Label>
              <Input
                id="waist"
                name="waist"
                type="number"
                value={form.waist ?? ''}
                onChange={handleNumberChange}
                placeholder="e.g. 78"
                className={`focus:ring-1 focus:ring-primary ${
                  errors.waist ? 'border-red-500 focus:border-red-500' : 'focus:border-primary'
                }`}
              />
              {errors.waist && (
                <p className="text-sm text-red-500">{errors.waist}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="hips" className="text-sm font-medium text-muted-foreground">
                Бедра (см)
              </Label>
              <Input
                id="hips"
                name="hips"
                type="number"
                value={form.hips ?? ''}
                onChange={handleNumberChange}
                placeholder="e.g. 100"
                className={`focus:ring-1 focus:ring-primary ${
                  errors.hips ? 'border-red-500 focus:border-red-500' : 'focus:border-primary'
                }`}
              />
              {errors.hips && (
                <p className="text-sm text-red-500">{errors.hips}</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold text-foreground">Предпочтения</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <Label htmlFor="favorite_colors" className="text-sm font-medium text-muted-foreground">
                Любимые цвета (через запятую)
              </Label>
              <Textarea
                id="favorite_colors"
                name="favorite_colors"
                value={Array.isArray(form.favorite_colors) ? form.favorite_colors.join(', ') : (form.favorite_colors || '')}
                onChange={handleChange}
                placeholder="Красный, Черный, Белый"
                className="resize-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="favorite_brands" className="text-sm font-medium text-muted-foreground">
                Любимые бренды (через запятую)
              </Label>
              <Textarea
                id="favorite_brands"
                name="favorite_brands"
                value={Array.isArray(form.favorite_brands) ? form.favorite_brands.join(', ') : (form.favorite_brands || '')}
                onChange={handleChange}
                placeholder="Nike, Adidas, Zara"
                className="resize-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* PWA Status */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold text-foreground">Приложение</h2>
          <PWAStatus showDetails={true} />
        </div>

        <div className="flex justify-between gap-4">
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Удалить аккаунт
          </Button>
          <Button type="submit" disabled={submitting} className="flex items-center gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {!submitting && <Save className="h-4 w-4" />}
            {submitting ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </form>
    </motion.section>
  )
}

export default Settings 
