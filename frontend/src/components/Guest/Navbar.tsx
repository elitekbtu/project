import { Link } from 'react-router-dom'
import { Menu, ShoppingBag } from 'lucide-react'
import { Button } from '../ui/button'
import { motion } from 'framer-motion'

const GuestNavbar = () => {
  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md"
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
          <ShoppingBag className="h-6 w-6" />
          TRC
        </Link>
        
        <nav className="hidden gap-8 md:flex">
          <Link to="/catalog" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Каталог
          </Link>
          {/* Убрано - коллекции больше не используются */}
          <Link to="/about" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            О нас
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden gap-2 md:flex">
            <Button variant="ghost" asChild>
              <Link to="/login">Войти</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Регистрация</Link>
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </motion.header>
  )
}

export default GuestNavbar