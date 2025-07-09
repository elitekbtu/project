import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Loader2, AlertCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { useToast } from '../ui/use-toast'

const RequirePanelAccess: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const location = useLocation()
  const { hasPanelAccess, loading } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!loading && !hasPanelAccess) {
      setShowWarning(true)
      toast({
        title: 'Доступ запрещен',
        description: 'Для доступа к этой странице требуются права администратора или модератора',
        variant: 'destructive',
      })
    }
  }, [hasPanelAccess, loading, toast])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    )
  }

  if (!hasPanelAccess) {
    return (
      <>
        <Navigate to="/home" state={{ from: location }} replace />
        {showWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
              <div className="flex flex-col items-center gap-4 text-center">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <div>
                  <h3 className="text-lg font-bold">Доступ ограничен</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Эта страница доступна только администраторам или модераторам системы.
                  </p>
                </div>
                <Button size="sm" onClick={() => setShowWarning(false)} className="mt-4">
                  Понятно
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return children
}

export default RequirePanelAccess 