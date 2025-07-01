import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { setStoredTokens } from '../../api/client'
import { type TokensUserOut } from '../../api/schemas'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorMessage } from '../../components/ui/ErrorMessage' 

const GoogleCallback = () => {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setIsLoading(true)
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        
        if (!code) {
          throw new Error('Authorization code not found')
        }

        const resp = await api.get<TokensUserOut>('/api/auth/google/callback', {
          params: { code },
        })
        
        const { access_token, refresh_token, user } = resp.data
        
        // Сохраняем токены
        setStoredTokens(access_token, refresh_token)
        
        // Временное сохранение пользователя
        localStorage.setItem('user', JSON.stringify(user))
        
        // Перенаправляем с полной перезагрузкой для инициализации приложения
        window.location.href = '/home'
      } catch (err) {
        console.error('Google callback error:', err)
        setError(
          err instanceof Error 
            ? err.message 
            : 'Произошла ошибка при входе через Google. Пожалуйста, попробуйте снова.'
        )
        // Перенаправляем на страницу входа с сообщением об ошибке
        navigate('/login', {
          state: { 
            error: 'Не удалось войти через Google' 
          },
          replace: true
        })
      } finally {
        setIsLoading(false)
      }
    }

    handleCallback()
  }, [navigate])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Завершаем вход через Google...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <ErrorMessage 
          message={error} 
          onRetry={() => window.location.reload()} 
        />
      </div>
    )
  }

  return null
}

export default GoogleCallback