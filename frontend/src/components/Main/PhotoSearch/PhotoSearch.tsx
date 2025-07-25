import { useState, useContext } from 'react'
import { searchByPhoto } from '../../../api/photoSearch'
import { UserPhotoUpload } from '../../ui/user-photo-upload'
import { Card, CardContent } from '../../ui/card'
import { AuthContext } from '../../../context/AuthContext'
import { Link } from 'react-router-dom'

const PhotoSearch = () => {
  const [photo, setPhoto] = useState<string | undefined>()
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const auth = useContext(AuthContext)
  const user = auth && typeof auth === 'object' && auth !== null && 'user' in auth ? (auth as any).user : undefined;

  const handlePhotoSelected = async (url: string, file?: File) => {
    setPhoto(url)
    if (file) {
      setLoading(true)
      const items = await searchByPhoto(file, user)
      setResults(items)
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">Поиск по фото</h1>
      {user && (
        <div className="mb-2 text-xs text-muted-foreground">Рекомендации будут персонализированы под ваши параметры: рост {user.height || '-'} см, вес {user.weight || '-'} кг, грудь {user.chest || '-'} см, талия {user.waist || '-'} см, бёдра {user.hips || '-'} см</div>
      )}
      <UserPhotoUpload onPhotoSelected={handlePhotoSelected} currentPhoto={photo} />
      {loading && <div>Загрузка...</div>}
      <div className="grid grid-cols-2 gap-4 mt-4">
        {results.map(item => (
          <Link to={`/items/${item.id}`} key={item.id} className="block">
            <Card>
              <CardContent>
                <div>{item.name}</div>
                {/* ...другие данные... */}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default PhotoSearch 