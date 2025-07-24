import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import GoogleLoginButton from './GoogleLoginButton'
import { Alert, AlertDescription } from '../ui/alert'
import { InfoCircledIcon } from '@radix-ui/react-icons' 

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    // Client-side validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Некорректный email')
      return
    }
    if (password.length < 8) {
      setError('Пароль должен содержать минимум 8 символов')
      return
    }

    setIsLoading(true)
    
    try {
      await login(email, password)
      navigate('/home')
    } catch (err) {
      let errorMessage = 'Не удалось войти. Пожалуйста, проверьте данные'
      
      if (err instanceof Error) {
        if (err.message.includes('Invalid credentials')) {
          errorMessage = 'Неверный email или пароль'
        } else if (err.message.includes('User not found')) {
          errorMessage = 'Пользователь не найден'
        } else if (err.message.includes('Incorrect password')) {
          errorMessage = 'Неверный пароль'
        } else {
          errorMessage = err.message || errorMessage
        }
      } else if (typeof err === 'string') {
        errorMessage = err
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-lg"> 
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="font-display text-2xl">Добро пожаловать</CardTitle>
            <CardDescription>
              Войдите в свой аккаунт, чтобы продолжить покупки
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Ваш email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Input
                  id="password"
                  type="password"
                  placeholder="Пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? 'Вход...' : 'Войти'}
              </Button>
              {error && (
              <Alert variant="default" className="bg-blue-50 border-blue-200">
                <InfoCircledIcon className="h-4 w-4 text-blue-600" /> 
                <AlertDescription className="text-blue-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            </form>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">или</span>
              </div>
            </div>
            
            <GoogleLoginButton />
            
            <p className="text-center text-sm text-muted-foreground">
              Нет аккаунта?{' '}
              <Link 
                to="/register" 
                className="font-medium text-primary hover:underline"
                onClick={() => setError(null)}
              >
                Зарегистрируйтесь
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Login