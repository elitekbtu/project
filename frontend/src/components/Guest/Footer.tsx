import { motion } from 'framer-motion'
import { Instagram, Linkedin, Github } from 'lucide-react'
import { Link } from 'react-router-dom'

const GuestFooter = () => {
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
      className="border-t bg-background/50 py-8 backdrop-blur-sm"
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* About */}
          <motion.div variants={itemVariants}>
            <h3 className="mb-4 font-display text-lg font-semibold">TRC</h3>
            <p className="text-sm text-muted-foreground">
              Платформа для создания стильных образов и управления гардеробом
            </p>
          </motion.div>

          {/* Guest Links */}
          <motion.div variants={itemVariants}>
            <h3 className="mb-4 font-display text-lg font-semibold">Для гостей</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/login" className="transition-colors hover:text-foreground">
                  Войти
                </Link>
              </li>
              <li>
                <Link to="/register" className="transition-colors hover:text-foreground">
                  Регистрация
                </Link>
              </li>
              <li>
                <Link to="#" className="transition-colors hover:text-foreground">
                  Возможности
                </Link>
              </li>
            </ul>
          </motion.div>

          {/* Legal */}
          <motion.div variants={itemVariants}>
            <h3 className="mb-4 font-display text-lg font-semibold">Информация</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="#" className="transition-colors hover:text-foreground">
                  Условия использования
                </Link>
              </li>
              <li>
                <Link to="#" className="transition-colors hover:text-foreground">
                  Конфиденциальность
                </Link>
              </li>
              <li>
                <Link to="#" className="transition-colors hover:text-foreground">
                  Контакты
                </Link>
              </li>
            </ul>
            {/* Social Media Icons */}
            <div className="mt-4 flex gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
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
        </motion.div>
      </div>
    </motion.footer>
  )
}

export default GuestFooter