import { Link } from 'react-router-dom'
import { ShoppingBag, User, LogOut, Settings, Heart, ShoppingCart, Clock, Menu, Home, LayoutGrid, Sparkles, Shield } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useFavorites } from '../../context/FavoritesContext'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'

const MainNavbar = () => {
  const { user, isAdmin, isModerator } = useAuth()
  const { totalItems } = useCart()
  const { favoriteIds } = useFavorites()
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/home" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
          <ShoppingBag className="h-6 w-6" />
          TRC
        </Link>
        
        {/* Desktop nav */}
        <nav className="hidden gap-8 md:flex">
          <Link to="/home" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Главная
          </Link>
          <Link to="/items" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Каталог
          </Link>
          <Link to="/outfits" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Образы
          </Link>
          {(isAdmin || isModerator) && (
            <Link
              to={isAdmin ? "/admin/users" : "/admin/items"}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Админ
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4">
          {/* Mobile nav trigger */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent sideOffset={4} align="start" className="w-56 p-1 md:hidden">
              <DropdownMenuItem asChild>
                <Link to="/home" className="flex items-center gap-2">
                  <Home className="h-4 w-4" /> Главная
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/items" className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" /> Каталог
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/outfits" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Образы
                </Link>
              </DropdownMenuItem>
              {(isAdmin || isModerator) && (
                <DropdownMenuItem asChild>
                  <Link to={isAdmin ? "/admin/users" : "/admin/items"} className="flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Админ
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Профиль
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Настройки
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/history" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> История
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/favorites" className="flex items-center gap-2">
                  <Heart className="h-4 w-4" /> Избранное
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/cart" className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" /> Корзина
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/logout" className="flex items-center gap-2 text-destructive">
                  <LogOut className="h-4 w-4" /> Выйти
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Favorites, cart, avatar for desktop only */}
          <Link to="/favorites" className="hidden md:block">
            <Button variant="ghost" size="icon" className="relative">
              <Heart className={`h-5 w-5 ${favoriteIds.length > 0 ? 'fill-primary text-primary' : ''}`} />
            </Button>
          </Link>
          
          <Link to="/cart" className="hidden md:block">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {totalItems}
                </span>
              )}
            </Button>
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="hidden md:block">
              <Button variant="ghost" size="icon" className="rounded-full p-0 h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0">
                <Avatar className="h-full w-full">
                  <AvatarImage src={user?.avatar || undefined} alt={user?.first_name || user?.email} />
                  <AvatarFallback>
                    {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  {user?.first_name && (
                    <p className="font-medium">{user.first_name}</p>
                  )}
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Профиль
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Настройки
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/history" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  История
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/logout" className="flex items-center gap-2 text-red-600">
                  <LogOut className="h-4 w-4" />
                  Выйти
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

export default MainNavbar