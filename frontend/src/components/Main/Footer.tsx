import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'

const MainFooter = () => {
  const currentYear = new Date().getFullYear()

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <motion.footer
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="border-t bg-background/50 py-8 backdrop-blur-sm hidden md:block"
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* About */}
          <motion.div variants={itemVariants}>
            <h3 className="mb-4 font-display text-lg font-semibold">TRC</h3>
            <p className="text-sm text-muted-foreground">
              Платформа для создания стильных образов и управления гардеробом
            </p>
          </motion.div>

          {/* Links */}
          <motion.div variants={itemVariants}>
            <h3 className="mb-4 font-display text-lg font-semibold">Навигация</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/home" className="transition-colors hover:text-foreground">
                  Главная
                </Link>
              </li>
              <li>
                <Link to="/items" className="transition-colors hover:text-foreground">
                  Товары
                </Link>
              </li>
              <li>
                <Link to="/outfits" className="transition-colors hover:text-foreground">
                  Образы
                </Link>
              </li>
              <li>
                <Link to="/profile" className="transition-colors hover:text-foreground">
                  Профиль
                </Link>
              </li>
            </ul>
          </motion.div>

          {/* Legal */}
          <motion.div variants={itemVariants}>
            <h3 className="mb-4 font-display text-lg font-semibold">Правовая информация</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="#" className="transition-colors hover:text-foreground">
                  Условия использования
                </Link>
              </li>
              <li>
                <Link to="#" className="transition-colors hover:text-foreground">
                  Политика конфиденциальности
                </Link>
              </li>
              <li>
                <Link to="#" className="transition-colors hover:text-foreground">
                  Cookie-файлы
                </Link>
              </li>
            </ul>
          </motion.div>

          {/* Contact */}
          <motion.div variants={itemVariants}>
            <h3 className="mb-4 font-display text-lg font-semibold">Контакты</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>support@trc.com</li>
              <li>+7 (777) 123-45-67</li>
              <li>г. Алматы, Казахстан</li>
            </ul>
          </motion.div>
        </div>

        {/* Copyright */}
        <motion.div
          variants={itemVariants}
          className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-6 md:flex-row"
        >
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            © {currentYear} TRC. Все права защищены.
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            Сделано с <Heart className="h-4 w-4 fill-primary text-primary" /> в Казахстане
          </div>
        </motion.div>
      </div>
    </motion.footer>
  )
}

export default MainFooter