import { Link, useLocation } from 'react-router-dom'
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
import { motion } from 'framer-motion'

const MainNavbar = () => {
  const { user, isAdmin, isModerator } = useAuth()
  const { totalItems } = useCart()
  const { favoriteIds } = useFavorites()
  const location = useLocation()
  
  const isActive = (path: string) => location.pathname.startsWith(path)
  
  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md shadow-sm"
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Link to="/home" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight hover:text-primary transition-colors">
            <ShoppingBag className="h-6 w-6" />
            TRC
          </Link>
        </motion.div>
        
        {/* Desktop nav */}
        <nav className="hidden gap-8 md:flex">
          <Link 
            to="/home" 
            className={`text-sm font-medium transition-all duration-200 hover:text-foreground relative group ${
              isActive('/home') ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            Главная
            {isActive('/home') && (
              <motion.div
                layoutId="activeTab"
                className="absolute -bottom-2 left-0 right-0 h-0.5 bg-primary rounded-full"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </Link>
          <Link 
            to="/items" 
            className={`text-sm font-medium transition-all duration-200 hover:text-foreground relative group ${
              isActive('/items') ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            Каталог
            {isActive('/items') && (
              <motion.div
                layoutId="activeTab"
                className="absolute -bottom-2 left-0 right-0 h-0.5 bg-primary rounded-full"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </Link>
          <Link 
            to="/outfits" 
            className={`text-sm font-medium transition-all duration-200 hover:text-foreground relative group ${
              isActive('/outfits') ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            Образы
            {isActive('/outfits') && (
              <motion.div
                layoutId="activeTab"
                className="absolute -bottom-2 left-0 right-0 h-0.5 bg-primary rounded-full"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </Link>
          {(isAdmin || isModerator) && (
            <Link
              to={isAdmin ? "/admin/users" : "/admin/items"}
              className={`text-sm font-medium transition-all duration-200 hover:text-foreground relative group ${
                isActive('/admin') ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              Админ
              {isActive('/admin') && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -bottom-2 left-0 right-0 h-0.5 bg-primary rounded-full"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4">
          {/* Mobile nav trigger */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="md:hidden">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </motion.div>
            </DropdownMenuTrigger>
            <DropdownMenuContent sideOffset={4} align="start" className="w-64 p-2 md:hidden">
              <DropdownMenuItem asChild>
                <Link to="/home" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                  <Home className="h-4 w-4" /> 
                  <span className="font-medium">Главная</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/items" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                  <LayoutGrid className="h-4 w-4" /> 
                  <span className="font-medium">Каталог</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/outfits" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                  <Sparkles className="h-4 w-4" /> 
                  <span className="font-medium">Образы</span>
                </Link>
              </DropdownMenuItem>
              {(isAdmin || isModerator) && (
                <DropdownMenuItem asChild>
                  <Link to={isAdmin ? "/admin/users" : "/admin/items"} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                    <Shield className="h-4 w-4" /> 
                    <span className="font-medium">Админ</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                  <User className="h-4 w-4" /> 
                  <span className="font-medium">Профиль</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                  <Settings className="h-4 w-4" /> 
                  <span className="font-medium">Настройки</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/history" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                  <Clock className="h-4 w-4" /> 
                  <span className="font-medium">История</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/favorites" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                  <Heart className="h-4 w-4" /> 
                  <span className="font-medium">Избранное</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/cart" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                  <ShoppingCart className="h-4 w-4" /> 
                  <span className="font-medium">Корзина</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/logout" className="flex items-center gap-3 p-3 rounded-lg hover:bg-destructive/10 transition-colors text-destructive">
                  <LogOut className="h-4 w-4" /> 
                  <span className="font-medium">Выйти</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Favorites, cart, avatar for desktop only */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="hidden md:block"
          >
            <Link to="/favorites">
              <Button variant="ghost" size="icon" className="relative">
                <Heart className={`h-5 w-5 transition-all duration-200 ${favoriteIds.length > 0 ? 'fill-primary text-primary' : 'hover:text-primary'}`} />
                {favoriteIds.length > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground"
                  >
                    {favoriteIds.length}
                  </motion.span>
                )}
              </Button>
            </Link>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="hidden md:block"
          >
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5 transition-all duration-200 hover:text-primary" />
                {totalItems > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground"
                  >
                    {totalItems}
                  </motion.span>
                )}
              </Button>
            </Link>
          </motion.div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="hidden md:block">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button variant="ghost" size="icon" className="rounded-full p-0 h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0">
                  <Avatar className="h-full w-full">
                    <AvatarImage src={user?.avatar || undefined} alt={user?.first_name || user?.email} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </motion.div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-2" align="end" forceMount>
              <div className="flex items-center justify-start gap-3 p-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.avatar || undefined} alt={user?.first_name || user?.email} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1 leading-none">
                  {user?.first_name && (
                    <p className="font-semibold text-sm">{user.first_name}</p>
                  )}
                  <p className="w-[200px] truncate text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Профиль</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                  <Settings className="h-4 w-4" />
                  <span className="font-medium">Настройки</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/history" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">История</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/logout" className="flex items-center gap-3 p-3 rounded-lg hover:bg-destructive/10 transition-colors text-destructive">
                  <LogOut className="h-4 w-4" />
                  <span className="font-medium">Выйти</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.header>
  )
}

export default MainNavbar