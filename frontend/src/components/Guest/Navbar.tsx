import { Link } from 'react-router-dom'
import { ShoppingBag, LogIn, UserPlus } from 'lucide-react'
import { Button } from '../ui/button'
import { motion } from 'framer-motion'

const GuestNavbar = () => {
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

        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button variant="ghost" asChild className="px-3 py-1.5 text-sm">
                <Link to="/login" className="flex items-center gap-1.5">
                  <LogIn className="h-4 w-4" />
                  Войти
                </Link>
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button asChild className="px-3 py-1.5 text-sm">
                <Link to="/register" className="flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4" />
                  Регистрация
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.header>
  )
}

export default GuestNavbar