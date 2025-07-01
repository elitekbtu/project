import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Loader2, LogIn, AlertCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { useToast } from '../ui/use-toast'

const RequireAuth: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const location = useLocation()
  const { user, loading } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!loading && !user) {
      setShowWarning(true)
      toast({
        title: 'Требуется авторизация',
        description: 'Для доступа к этой странице необходимо войти в систему',
        variant: 'destructive',
      })
    }
  }, [user, loading, toast])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <Navigate to="/login" state={{ from: location }} replace />
        {showWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
              <div className="flex flex-col items-center gap-4 text-center">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <div>
                  <h3 className="text-lg font-bold">Требуется авторизация</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Пожалуйста, войдите в систему для доступа к этой странице
                  </p>
                </div>
                <div className="mt-4 flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowWarning(false)}
                  >
                    Закрыть
                  </Button>
                  <Button asChild>
                    <a href="/login" className="flex items-center">
                      <LogIn className="mr-2 h-4 w-4" />
                      Войти
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return children
}

export default RequireAuth