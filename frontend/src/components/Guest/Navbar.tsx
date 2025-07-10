import { Link, useLocation } from 'react-router-dom'
import { Menu, ShoppingBag, User, LogIn, UserPlus } from 'lucide-react'
import { Button } from '../ui/button'
import { motion } from 'framer-motion'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

const GuestNavbar = () => {
  const location = useLocation()
  
  const isActive = (path: string) => location.pathname === path
  
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
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight hover:text-primary transition-colors">
            <ShoppingBag className="h-6 w-6" />
            TRC
          </Link>
        </motion.div>
        
        <nav className="hidden gap-8 md:flex">
          <Link 
            to="/catalog" 
            className={`text-sm font-medium transition-all duration-200 hover:text-foreground relative group ${
              isActive('/catalog') ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            Каталог
            {isActive('/catalog') && (
              <motion.div
                layoutId="activeTab"
                className="absolute -bottom-2 left-0 right-0 h-0.5 bg-primary rounded-full"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </Link>
          <Link 
            to="/about" 
            className={`text-sm font-medium transition-all duration-200 hover:text-foreground relative group ${
              isActive('/about') ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            О нас
            {isActive('/about') && (
              <motion.div
                layoutId="activeTab"
                className="absolute -bottom-2 left-0 right-0 h-0.5 bg-primary rounded-full"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden gap-2 md:flex">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button variant="ghost" asChild>
                <Link to="/login" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Войти
                </Link>
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button asChild>
                <Link to="/register" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Регистрация
                </Link>
              </Button>
            </motion.div>
          </div>
          
          {/* Mobile menu */}
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
            <DropdownMenuContent sideOffset={4} align="end" className="w-64 p-2 md:hidden">
              <DropdownMenuItem asChild>
                <Link to="/catalog" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                  <ShoppingBag className="h-4 w-4" /> 
                  <span className="font-medium">Каталог</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/about" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                  <User className="h-4 w-4" /> 
                  <span className="font-medium">О нас</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/login" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                  <LogIn className="h-4 w-4" /> 
                  <span className="font-medium">Войти</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/register" className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary/10 transition-colors text-primary">
                  <UserPlus className="h-4 w-4" /> 
                  <span className="font-medium">Регистрация</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.header>
  )
}

export default GuestNavbar