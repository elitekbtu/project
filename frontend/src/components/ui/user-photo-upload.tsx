import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, User, Camera } from 'lucide-react'
import { Button } from './button'
import { useToast } from './use-toast'
import { getStoredTokens } from '../../api/client'

interface UserPhotoUploadProps {
  onPhotoSelected: (photoUrl: string) => void
  currentPhoto?: string
  className?: string
}

export const UserPhotoUpload: React.FC<UserPhotoUploadProps> = ({
  onPhotoSelected,
  currentPhoto,
  className = ''
}) => {
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    // Валидация файла
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Неверный тип файла',
        description: 'Пожалуйста, выберите изображение'
      })
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast({
        variant: 'destructive',
        title: 'Файл слишком большой',
        description: 'Максимальный размер файла - 10MB'
      })
      return
    }

    setUploading(true)
    try {
      // Создаем FormData для загрузки
      const formData = new FormData()
      formData.append('file', file)

      // Получаем access token из localStorage
      const { access: accessToken } = getStoredTokens()

      // Отправляем файл на сервер
      const options: RequestInit = {
        method: 'POST',
        body: formData,
      }
      if (accessToken) {
        options.headers = { 'Authorization': `Bearer ${accessToken}` }
      }

      const response = await fetch('/api/profile/upload-photo', options)

      if (!response.ok) {
        throw new Error('Ошибка загрузки файла')
      }

      const data = await response.json()
      onPhotoSelected(data.photo_url)
      
      toast({
        title: 'Фото загружено',
        description: 'Ваше фото успешно загружено'
      })
    } catch (error) {
      console.error('Ошибка загрузки:', error)
      toast({
        variant: 'destructive',
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить фото'
      })
    } finally {
      setUploading(false)
    }
  }, [onPhotoSelected, toast])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    disabled: uploading
  })

  const handleRemovePhoto = () => {
    onPhotoSelected('')
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Ваше фото</h3>
        <p className="text-sm text-gray-600">
          Загрузите свое фото для виртуальной примерки
        </p>
      </div>

      {currentPhoto ? (
        <div className="relative">
          <div className="w-full max-w-sm mx-auto">
            <img
              src={currentPhoto}
              alt="Ваше фото"
              className="w-full h-auto max-h-96 object-cover rounded-lg border border-gray-200"
            />
            <button
              onClick={handleRemovePhoto}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="mt-4 space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('photo-input')?.click()}
              className="w-full"
            >
              <Camera className="w-4 h-4 mr-2" />
              Заменить фото
            </Button>
            
            <input
              id="photo-input"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onDrop([file])
              }}
              className="hidden"
            />
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              {uploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              ) : (
                <Upload className="w-8 h-8 text-gray-400" />
              )}
            </div>
            
            <div>
              <p className="text-base font-medium text-gray-900">
                {uploading ? 'Загрузка...' : 'Загрузите свое фото'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {isDragActive ? 'Отпустите файл здесь' : 'Перетащите файл сюда или нажмите для выбора'}
              </p>
            </div>
            
            <div className="text-xs text-gray-400">
              Поддерживаются форматы: JPEG, PNG, WebP (до 10MB)
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <User className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">Советы для лучшего результата:</p>
            <ul className="mt-1 space-y-1 text-xs">
              <li>• Используйте фото в полный рост на светлом фоне</li>
              <li>• Встаньте прямо, руки по швам</li>
              <li>• Избегайте слишком широкой или облегающей одежды</li>
              <li>• Фото должно быть четким и хорошо освещенным</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 