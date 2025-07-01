import { Link } from 'react-router-dom'
import { motion, useAnimation } from 'framer-motion'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { Button } from '../ui/button'
import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'

const Hero = () => {
  const bgControls = useAnimation()
  
  const partners = [
    { name: "MEGA", logo: "https://mega.kz/media/2021/10/1/1633104265.png" },
    { name: "Almaly", logo: "https://almaly.kz/upload/iblock/12f/up7f.jpg" },
    { name: "Dostyk Plaza", logo: "https://dostykplaza.kz/local/templates/slonworks/img/svg/logo-dp-upd.svg" },
    { name: "GOOD", logo: "https://good.kz/wp-content/uploads/2024/01/7-1-1.webp" },
    { name: "Forum", logo: "https://forum-api.interattiva.kz//%2Fstorage%2Fuploads%2F2019%2F11%2F24%2F5dda4727ebab6logo_noshadow-01.svg" },
  ]

  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: false
  })

  useEffect(() => {
    const bgAnimation = async () => {
      await bgControls.start({
        backgroundPosition: ["0% 0%", "100% 100%"],
        transition: {
          duration: 30,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "linear"
        }
      })
    }
    bgAnimation()
  }, [bgControls])

  const partnerAnimation = useAnimation()
  
  useEffect(() => {
    if (inView) {
      partnerAnimation.start({
        opacity: 1,
        y: 0,
        transition: {
          staggerChildren: 0.1
        }
      })
    }
  }, [inView, partnerAnimation])

  return (
    <div className="relative overflow-hidden">
      {/* Анимированные элементы фона */}
      <motion.div
        className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-primary/10 blur-3xl"
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.2, 1]
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-accent/10 blur-3xl"
        animate={{
          x: [0, -40, 0],
          y: [0, -20, 0],
          rotate: [0, 10, 0]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <div className="container mx-auto px-4 py-16 md:py-24 lg:py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Бейдж */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-6 inline-block"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground backdrop-blur-sm border border-muted/30 shadow-sm hover:bg-muted/70 transition-colors">
              <span>Новая коллекция уже здесь</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </motion.div>

          {/* Заголовок */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mb-6 font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
          >
            <span className="block">Стиль, который</span>
            <span className="relative inline-block mt-2">
              <span className="relative z-10 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                говорит
              </span>
              <motion.span 
                className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/0"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.2, delay: 0.8 }}
              />
            </span>
            <span className="block mt-2">за вас</span>
          </motion.h1>

          {/* Подзаголовок */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground leading-relaxed"
          >
            Откройте для себя уникальные образы и создайте свой неповторимый стиль. 
            Качественная одежда для тех, кто ценит индивидуальность и комфорт.
          </motion.p>

          {/* Кнопки */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col gap-4 sm:flex-row sm:justify-center"
          >
            <Button asChild size="lg" className="group shadow-lg hover:shadow-primary/20">
              <Link to="/register">
                <span className="flex items-center">
                  Начать покупки
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </Button>
            
            <Button asChild variant="outline" size="lg" className="group shadow-sm">
              <Link to="/login">
                <span className="flex items-center">
                  Войти в аккаунт
                  <ChevronRight className="ml-2 h-4 w-4 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1" />
                </span>
              </Link>
            </Button>
          </motion.div>

          {/* Карусель логотипов партнёров */}
          <div ref={ref} className="mt-10">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={partnerAnimation}
              className="text-center text-sm uppercase tracking-wider text-muted-foreground mb-4"
            >
              Наши партнёры
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={partnerAnimation}
              className="relative overflow-hidden py-4"
            >
              <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent z-10" />
              <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent z-10" />
              
              <motion.div
                className="flex gap-8 md:gap-12 items-center"
                animate={{ 
                  x: ['0%', `-${100 - 100 / partners.length}%`] 
                }}
                transition={{ 
                  duration: 20, 
                  ease: 'linear', 
                  repeat: Infinity, 
                  repeatType: 'loop' 
                }}
              >
                {[...partners, ...partners].map((partner, i) => (
                  <motion.div
                    key={`${partner.name}-${i}`}
                    className="flex-shrink-0 bg-background/80 backdrop-blur-sm px-4 md:px-6 py-2 md:py-3 rounded-lg border border-muted/20 hover:border-primary/30 transition-colors"
                    whileHover={{ scale: 1.05 }}
                  >
                    <img
                      src={partner.logo}
                      alt={partner.name}
                      className="h-12 md:h-16 w-auto object-contain"
                      loading="lazy"
                    />
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Категории (только на десктопе) */}
        <div className="hidden md:block mt-20">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6"
          >
            {[
              { 
                name: "Женская одежда", 
                image: "https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?auto=compress&cs=tinysrgb&w=800"
              },
              { 
                name: "Мужская одежда", 
                image: "https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800"
              },
              { 
                name: "Аксессуары", 
                image: "https://images.pexels.com/photos/1927259/pexels-photo-1927259.jpeg?auto=compress&cs=tinysrgb&w=800"
              }
            ].map((category, index) => (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                className="group relative overflow-hidden rounded-2xl bg-card border border-muted/20 hover:border-primary/20 transition-colors shadow-lg hover:shadow-xl"
                whileHover={{ y: -8 }}
              >
                <div className="aspect-[4/5] overflow-hidden">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute inset-0 flex items-end p-6">
                  <h3 className="font-display text-2xl font-semibold text-white">
                    {category.name}
                  </h3>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default Hero