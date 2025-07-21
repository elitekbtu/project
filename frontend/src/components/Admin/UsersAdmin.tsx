import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, PlusCircle, Pencil, Trash2, Shield, UserCheck, UserX, Star } from 'lucide-react'
import api from '../../api/client'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { useToast } from '../../components/ui/use-toast'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../../components/ui/select'
import { Switch } from '../../components/ui/switch'
import { Popover, PopoverTrigger, PopoverContent } from '../../components/ui/popover'
import { Label } from '../../components/ui/label'

interface User {
  id: number
  email: string
  is_admin: boolean
  is_moderator: boolean
  is_active: boolean
}

const UsersAdmin = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const { toast } = useToast()
  const [role, setRole] = useState<string | undefined>(undefined)
  const [onlyActive, setOnlyActive] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const filterUsers = (data: User[]) => {
    let filtered = data
    if (role && role !== 'all') {
      if (role === 'admin') filtered = filtered.filter(u => u.is_admin)
      else if (role === 'moderator') filtered = filtered.filter(u => u.is_moderator && !u.is_admin)
      else if (role === 'user') filtered = filtered.filter(u => !u.is_admin && !u.is_moderator)
    }
    if (onlyActive) {
      filtered = filtered.filter(u => u.is_active)
    }
    return filtered
  }

  const fetchUsers = async (pageToLoad = 1, append = false, q?: string) => {
    try {
      if (append) setLoadingMore(true)
      else setLoading(true)
      const params: any = { page: pageToLoad }
      if (q) params.q = q
      const resp = await api.get<User[]>('/api/users/', { params })
      const filtered = filterUsers(resp.data)
      setUsers(prev => append ? [...prev, ...filtered] : filtered)
      setHasMore(filtered.length === 20)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось загрузить список пользователей',
      })
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    setPage(1)
    fetchUsers(1, false, searchQuery)
  }, [searchQuery])

  useEffect(() => {
    if (page === 1) return
    fetchUsers(page, true, searchQuery)
  }, [page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setUsers([])
    setHasMore(true)
    setSearchQuery(search)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return
    
    setDeletingId(id)
    try {
      await api.delete(`/api/users/${id}`)
      setUsers((prev) => prev.filter((user) => user.id !== id))
      toast({
        title: 'Успешно',
        description: 'Пользователь успешно удален',
        className: 'border-0 bg-green-500 text-white shadow-lg',
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось удалить пользователя',
      })
    } finally {
      setDeletingId(null)
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
      className="container mx-auto px-4 py-8"
    >
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Управление пользователями</h1>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Поиск по email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded px-2 py-1"
          />
          <Button type="submit">Поиск</Button>
        </form>
        <div className="flex gap-2">
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline">Фильтры</Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="flex flex-col gap-4">
                <div>
                  <Label className="mb-1 block">Роль</Label>
                  <Select value={role || 'all'} onValueChange={v => setRole(v === 'all' ? undefined : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Все роли" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все роли</SelectItem>
                      <SelectItem value="admin">Админ</SelectItem>
                      <SelectItem value="moderator">Модератор</SelectItem>
                      <SelectItem value="user">Пользователь</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="only-active-switch">Только активные</Label>
                  <Switch id="only-active-switch" checked={onlyActive} onCheckedChange={setOnlyActive} />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button asChild>
            <Link to="/admin/users/new" className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              Добавить пользователя
            </Link>
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <table className="min-w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">ID</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Email</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Статус</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {users.length > 0 ? (
              users.map((user) => (
                <motion.tr 
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50"
                >
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {user.id}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user.email}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      {user.is_admin ? (
                        <Badge variant="default" className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          <span>Админ</span>
                        </Badge>
                      ) : user.is_moderator ? (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          <span>Модератор</span>
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Пользователь</Badge>
                      )}
                      <Badge 
                        variant={user.is_active ? "default" : "destructive"} 
                        className="flex items-center gap-1"
                      >
                        {user.is_active ? (
                          <>
                            <UserCheck className="h-3 w-3" />
                            <span>Активен</span>
                          </>
                        ) : (
                          <>
                            <UserX className="h-3 w-3" />
                            <span>Неактивен</span>
                          </>
                        )}
                      </Badge>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="border-gray-300 dark:border-gray-700"
                      >
                        <Link to={`/admin/users/${user.id}/edit`} className="flex items-center gap-1">
                          <Pencil className="h-3 w-3" />
                          <span>Редактировать</span>
                        </Link>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(user.id)}
                        disabled={deletingId === user.id}
                        className="flex items-center gap-1"
                      >
                        {deletingId === user.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        <span>Удалить</span>
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  Нет зарегистрированных пользователей
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Кнопка загрузки */}
      {!loading && hasMore && (
        <div className="flex justify-center my-4">
          <Button onClick={() => setPage(p => p + 1)} disabled={loadingMore}>
            {loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
          </Button>
        </div>
      )}
    </motion.div>
  )
}

export default UsersAdmin