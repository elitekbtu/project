import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getProfile } from '../../api/profile'
import { type ProfileOut } from '../../api/schemas'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { useToast } from '../ui/use-toast'
import { LoadingSpinner } from '../ui/LoadingSpinner'

const Profile = () => {
  const [profile, setProfile] = useState<ProfileOut | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Helper to convert "string | string[]" to string[]
  const toArray = (value?: string | string[] | null): string[] => {
    if (!value) return []
    return Array.isArray(value) ? value : value.split(',').map((v) => v.trim()).filter(Boolean)
  }

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getProfile()
        setProfile(data)
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!profile) return null

  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Без имени'
  const initial = ((profile.first_name || profile.last_name || profile.email)[0] || '?').toUpperCase()

  const infoItem = (label: string, value?: string | number | null) => (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">
        {value || <span className="text-muted-foreground">—</span>}
      </p>
    </div>
  )

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="container mx-auto max-w-4xl px-4 py-8 space-y-8"
    >
      {/* Header section */}
      <div className="bg-background rounded-xl shadow-sm overflow-hidden border">
        <div className="h-32 w-full bg-muted" />
        <div className="px-6 pb-10 -mt-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-end gap-4">
            <Avatar className="h-32 w-32 border-4 border-background">
              <AvatarImage src={profile.avatar || undefined} alt={fullName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{fullName}</h1>
              <p className="text-muted-foreground">{profile.email}</p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link to="/settings">Редактировать профиль</Link>
          </Button>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal info card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-primary"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
              Контактная информация
            </CardTitle>
            <CardDescription>Основные сведения</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-primary"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              {infoItem('Телефон', profile.phone_number)}
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-primary"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              {infoItem(
                'Дата рождения',
                profile.date_of_birth
                  ? new Date(profile.date_of_birth).toLocaleDateString('ru-RU')
                  : undefined
              )}
            </div>
          </CardContent>
        </Card>

        {/* Body measurements card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-primary"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                  clipRule="evenodd"
                />
              </svg>
              Параметры тела
            </CardTitle>
            <CardDescription>Сантиметры / килограммы</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                {infoItem('Рост', profile.height ? `${profile.height} см` : undefined)}
              </div>
              <div className="p-4 bg-muted rounded-lg">
                {infoItem('Вес', profile.weight ? `${profile.weight} кг` : undefined)}
              </div>
              <div className="p-4 bg-muted rounded-lg">
                {infoItem('Грудь', profile.chest ? `${profile.chest} см` : undefined)}
              </div>
              <div className="p-4 bg-muted rounded-lg">
                {infoItem('Талия', profile.waist ? `${profile.waist} см` : undefined)}
              </div>
              <div className="p-4 bg-muted rounded-lg">
                {infoItem('Бедра', profile.hips ? `${profile.hips} см` : undefined)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences card - full width */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-primary"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                  clipRule="evenodd"
                />
              </svg>
              Предпочтения
            </CardTitle>
            <CardDescription>Ваш стиль и бренды</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Любимые цвета
              </h3>
              {toArray(profile.favorite_colors).length ? (
                <div className="flex flex-wrap gap-2">
                  {toArray(profile.favorite_colors).map((color: string) => (
                    <Badge
                      key={color}
                      className="px-3 py-1.5 capitalize"
                      style={{ backgroundColor: color, color: '#fff' }}
                    >
                      {color}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Не указаны</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Любимые бренды
              </h3>
              {toArray(profile.favorite_brands).length ? (
                <div className="flex flex-wrap gap-2">
                  {toArray(profile.favorite_brands).map((brand: string) => (
                    <Badge
                      key={brand}
                      variant="secondary"
                      className="px-3 py-1.5 capitalize"
                    >
                      {brand}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Не указаны</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.section>
  )
}

export default Profile