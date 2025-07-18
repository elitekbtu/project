import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, PlusCircle, Pencil, Trash2 } from 'lucide-react'
import api from '../../api/client'
import { Button } from '../../components/ui/button'
import { useToast } from '../../components/ui/use-toast'

interface Outfit {
  id: number
  name: string
  style: string
  // Убрано поле collection
  total_price?: number | null
}

const OutfitsAdmin = () => {
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const { toast } = useToast()

  const fetchOutfits = async (pageToLoad = 1, append = false, q?: string) => {
    try {
      if (append) setLoadingMore(true)
      else setLoading(true)
      const params: any = { page: pageToLoad }
      if (q) params.q = q
      const resp = await api.get<Outfit[]>('/api/outfits/', { params })
      setOutfits(prev => append ? [...prev, ...resp.data] : resp.data)
      setHasMore(resp.data.length === 20)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось загрузить список образов',
      })
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    setPage(1)
    fetchOutfits(1, false, searchQuery)
  }, [searchQuery])

  useEffect(() => {
    if (page === 1) return
    fetchOutfits(page, true, searchQuery)
  }, [page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setOutfits([])
    setHasMore(true)
    setSearchQuery(search)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот образ?')) return
    
    setDeletingId(id)
    try {
      await api.delete(`/api/outfits/${id}`)
      setOutfits((prev) => prev.filter((outfit) => outfit.id !== id))
      toast({
        title: 'Успешно',
        description: 'Образ успешно удален',
        className: 'border-0 bg-green-500 text-white shadow-lg',
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось удалить образ',
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Управление образами</h1>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Поиск по названию..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded px-2 py-1"
          />
          <Button type="submit">Поиск</Button>
        </form>
        <Button asChild>
          <Link to="/admin/outfits/new" className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Добавить образ
          </Link>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <table className="min-w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">ID</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Название</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Стиль</th>
              {/* Убрано поле коллекции */}
              <th className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Цена</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {outfits.length > 0 ? (
              outfits.map((outfit) => (
                <motion.tr 
                  key={outfit.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50"
                >
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {outfit.id}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {outfit.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {outfit.style}
                  </td>
                  {/* Убрано поле коллекции */}
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {outfit.total_price ? `${outfit.total_price} ₽` : '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="border-gray-300 dark:border-gray-700"
                      >
                        <Link to={`/admin/outfits/${outfit.id}/edit`} className="flex items-center gap-1">
                          <Pencil className="h-3 w-3" />
                          <span>Редактировать</span>
                        </Link>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(outfit.id)}
                        disabled={deletingId === outfit.id}
                        className="flex items-center gap-1"
                      >
                        {deletingId === outfit.id ? (
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
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  Нет доступных образов
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

export default OutfitsAdmin