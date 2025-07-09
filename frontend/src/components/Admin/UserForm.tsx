import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, ArrowLeft, Save } from 'lucide-react'
import { getUser, createUser, updateUser } from '../../api/users'
import { type UserCreateAdmin, type UserUpdateAdmin } from '../../api/schemas'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { useToast } from '../../components/ui/use-toast'
import { cn } from '../../lib/utils'

const emptyUser: UserCreateAdmin = {
  email: '',
  password: '',
  is_admin: false,
  is_moderator: false,
  is_active: true,
}

const UserForm = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const isEdit = !!id

  const [form, setForm] = useState<UserCreateAdmin>(emptyUser)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (isEdit) {
          const user = await getUser(Number(id))
          setForm({
            email: user.email,
            password: '',
            is_admin: !!user.is_admin,
            is_moderator: !!user.is_moderator,
            is_active: !!user.is_active,
          })
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: 'Не удалось загрузить данные пользователя',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [id, isEdit, toast])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev: UserCreateAdmin) => ({ ...prev, [name]: value }))
  }

  const handleToggle = (name: keyof UserCreateAdmin) => {
    setForm((prev: UserCreateAdmin) => ({ ...prev, [name]: !prev[name] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Client-side validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Некорректный email' })
      return
    }
    if (!isEdit && form.password.length < 8) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Пароль должен содержать минимум 8 символов' })
      return
    }

    setSubmitting(true)

    try {
      if (isEdit) {
        const payload: UserUpdateAdmin = {
          email: form.email,
          password: form.password || undefined,
          is_admin: form.is_admin,
          is_moderator: form.is_moderator,
          is_active: form.is_active,
        }
        await updateUser(Number(id), payload)
        toast({
          title: 'Успешно',
          description: 'Пользователь успешно обновлен',
          className: 'border-0 bg-green-500 text-white shadow-lg',
        })
      } else {
        await createUser(form)
        toast({
          title: 'Успешно',
          description: 'Пользователь успешно создан',
          className: 'border-0 bg-green-500 text-white shadow-lg',
        })
      }
      navigate('/admin/users')
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Произошла ошибка при сохранении',
        className: 'shadow-lg',
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
      className="container mx-auto max-w-2xl px-4 py-8"
    >
      <div className="mb-8 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin/users')}
          className="shrink-0 hover:bg-accent/50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {isEdit ? 'Редактирование пользователя' : 'Создание нового пользователя'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-gray-50">
            Основная информация
          </h2>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Email*
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="user@example.com"
                className="focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {!isEdit ? (
              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Пароль*
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  className="focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Новый пароль
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Оставьте пустым, чтобы не менять"
                  className="focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-gray-50">
            Настройки
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50">
              <div>
                <Label htmlFor="is_admin" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Администратор
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Дает полный доступ к панели управления
                </p>
              </div>
              <Switch
                id="is_admin"
                checked={form.is_admin}
                onCheckedChange={() => handleToggle('is_admin')}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-700"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50">
              <div>
                <Label htmlFor="is_moderator" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Модератор
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Может создавать товары и управлять своими товарами
                </p>
              </div>
              <Switch
                id="is_moderator"
                checked={!!form.is_moderator}
                onCheckedChange={() => handleToggle('is_moderator')}
                className="data-[state=checked]:bg-yellow-500 data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-700"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50">
              <div>
                <Label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Активный
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Позволяет пользователю входить в систему
                </p>
              </div>
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={() => handleToggle('is_active')}
                className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-700"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/users')}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Отмена
          </Button>
          <Button 
            type="submit" 
            disabled={submitting}
            className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg"
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

export default UserForm