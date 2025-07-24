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
  const { login, error, clearError } = useAuth()
  const navigate = useNavigate()
  const [localError, setLocalError] = useState<string | undefined>(undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setLocalError(undefined)
    // Client-side validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setLocalError('Некорректный email');
      return;
    }
    if (password.length < 8) {
      setLocalError('Пароль должен быть не менее 8 символов');
      return;
    }
    setIsLoading(true)
    
    try {
      await login(email, password)
      navigate('/home')
    } catch (err) {
      // error уже будет установлен через AuthContext
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
                  onChange={e => { setEmail(e.target.value); setLocalError(undefined); }}
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
                  onChange={e => { setPassword(e.target.value); setLocalError(undefined); }}
                  required
                  className="h-11"
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? 'Вход...' : 'Войти'}
              </Button>
              {(localError || error) && (
              <Alert variant="default" className="bg-blue-50 border-blue-200">
                <InfoCircledIcon className="h-4 w-4 text-blue-600" /> 
                <AlertDescription className="text-blue-800">
                  {localError || error}
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
                onClick={() => clearError()}
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