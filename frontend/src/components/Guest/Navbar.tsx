import { Link } from 'react-router-dom'
import { ShoppingBag, LogIn, UserPlus } from 'lucide-react'
import { Button } from '../ui/button'

const GuestNavbar = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div>
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight hover:text-primary transition-colors">
            <ShoppingBag className="h-6 w-6" />
            TRC
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <div>
              <Button variant="ghost" asChild className="px-3 py-1.5 text-sm">
                <Link to="/login" className="flex items-center gap-1.5">
                  <LogIn className="h-4 w-4" />
                  Войти
                </Link>
              </Button>
            </div>
            <div>
              <Button asChild className="px-3 py-1.5 text-sm">
                <Link to="/register" className="flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4" />
                  Регистрация
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default GuestNavbar