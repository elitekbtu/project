import { motion, useAnimation } from 'framer-motion'
import { Sparkles, Users, Smartphone, Shield, Phone, Mail, MapPin, Facebook, Instagram, Twitter, Youtube, ArrowRight, ChevronRight, Star, Heart, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/button'
import { useState, useEffect } from 'react'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'

const About = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const bgControls = useAnimation()

  const features = [
    {
      icon: <Sparkles className="h-8 w-8" />,
      title: "Виртуальная примерка",
      description: "Попробуйте одежду виртуально с помощью передовых технологий",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Создание образов",
      description: "Собирайте стильные комплекты из вашего гардероба",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Smartphone className="h-8 w-8" />,
      title: "Удобное приложение",
      description: "Работает на всех устройствах как веб-приложение",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Безопасность",
      description: "Ваши данные защищены современными технологиями",
      color: "from-orange-500 to-red-500"
    }
  ]

  const stats = [
    { number: "10K+", label: "Пользователей", icon: <Users className="h-5 w-5" /> },
    { number: "50K+", label: "Образов создано", icon: <Sparkles className="h-5 w-5" /> },
    { number: "99%", label: "Удовлетворенность", icon: <Heart className="h-5 w-5" /> },
    { number: "24/7", label: "Поддержка", icon: <Zap className="h-5 w-5" /> }
  ]

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    
    setTimeout(() => {
      console.log('Форма отправлена:', formData)
      alert('Спасибо! Ваше сообщение успешно отправлено. Мы ответим вам в ближайшее время.')
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      })
      setIsSubmitting(false)
    }, 1500)
  }

  return (
    <div className="relative overflow-hidden">
      {/* Анимированные элементы фона */}
      <motion.div
        className="absolute top-1/4 left-1/3 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none"
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
        className="absolute bottom-1/3 right-1/3 w-80 h-80 rounded-full bg-accent/10 blur-3xl pointer-events-none"
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

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="relative z-10 container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-6 inline-block relative z-10"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground backdrop-blur-sm border border-muted/30 shadow-sm hover:bg-muted/70 transition-colors cursor-default select-none">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span>Инновационная платформа моды</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mb-6 font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
            >
              <span className="block">О проекте</span>
              <span className="relative inline-block mt-2">
                <span className="relative z-10 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  TRC
                </span>
                <motion.span 
                  className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/0"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 1.2, delay: 0.8 }}
                />
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground leading-relaxed"
            >
              Современная платформа для виртуальной примерки одежды и создания стильных образов. 
              Мы используем передовые технологии, чтобы сделать шоппинг более удобным и интерактивным.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center group"
              >
                <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-6 border border-muted/20 hover:border-primary/30 transition-colors shadow-lg hover:shadow-xl">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-primary to-primary/80 rounded-xl text-primary-foreground mb-4 group-hover:scale-110 transition-transform">
                    {stat.icon}
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-2">{stat.number}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center mb-16"
            >
              <h2 className="mb-4 font-display text-3xl font-bold tracking-tight lg:text-4xl">
                Наши возможности
              </h2>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                TRC предлагает комплексное решение для управления гардеробом и создания стильных образов
              </p>
            </motion.div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                  className="group"
                >
                  <div className="bg-card rounded-2xl p-8 shadow-lg border border-border hover:border-primary/20 transition-all duration-300 group-hover:-translate-y-2">
                    <div className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r ${feature.color} text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-center"
            >
              <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-12 text-primary-foreground relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-white/10"></div>
                <div className="relative z-10">
                  <h2 className="mb-6 font-display text-3xl font-bold tracking-tight lg:text-4xl">
                    Наша миссия
                  </h2>
                  <p className="mb-8 text-lg leading-relaxed text-primary-foreground/90">
                    Мы стремимся революционизировать способ покупки одежды, делая его более интерактивным, 
                    удобным и персонализированным. Наша цель - помочь каждому найти свой уникальный стиль 
                    и уверенно выражать себя через одежду.
                  </p>
                  <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                    <Button asChild size="lg" className="bg-background text-primary hover:bg-background/90 font-semibold shadow-lg">
                      <Link to="/register" className="flex items-center">
                        Начать использовать
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="border-background text-background hover:bg-background hover:text-primary">
                      <Link to="/">
                        Вернуться на главную
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-center mb-16"
            >
              <h2 className="mb-4 font-display text-3xl font-bold tracking-tight lg:text-4xl">
                Свяжитесь с нами
              </h2>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                Есть вопросы? Напишите нам, и мы ответим в течение 24 часов
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Contact Form */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="bg-card rounded-2xl shadow-xl p-8 border border-border"
              >
                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-8">Форма обратной связи</h3>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="name" className="text-sm font-semibold text-foreground mb-2 block">
                      Ваше имя
                    </Label>
                    <Input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-background"
                      placeholder="Введите ваше имя"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email" className="text-sm font-semibold text-foreground mb-2 block">
                      Электронная почта
                    </Label>
                    <Input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-background"
                      placeholder="example@email.com"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="subject" className="text-sm font-semibold text-foreground mb-2 block">
                      Тема
                    </Label>
                    <Input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-background"
                      placeholder="Тема сообщения"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="message" className="text-sm font-semibold text-foreground mb-2 block">
                      Сообщение
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows={5}
                      required
                      className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-background resize-none"
                      placeholder="Введите ваше сообщение..."
                    />
                  </div>
                  
                  <div>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex justify-center items-center py-4 px-6 text-lg font-semibold shadow-lg hover:shadow-primary/20 transition-all duration-300 rounded-xl"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Отправляется...
                        </span>
                      ) : (
                        'Отправить сообщение'
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
              
              {/* Contact Info */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="bg-card rounded-2xl shadow-xl p-8 border border-border"
              >
                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-8">Контактная информация</h3>
                
                <div className="space-y-8">
                  {/* Contact Item 1 */}
                  <div className="flex items-start group">
                    <div className="flex-shrink-0 bg-gradient-to-r from-primary to-primary/80 p-4 rounded-2xl text-primary-foreground group-hover:scale-110 transition-transform duration-300">
                      <Phone className="h-6 w-6" />
                    </div>
                    <div className="ml-6">
                      <h4 className="text-xl font-bold text-foreground mb-2">Телефон</h4>
                      <p className="text-lg text-muted-foreground mb-1">+7 (777) 123-45-67</p>
                      <p className="text-sm text-muted-foreground">Понедельник-Пятница, 09:00 - 18:00</p>
                    </div>
                  </div>
                  
                  {/* Contact Item 2 */}
                  <div className="flex items-start group">
                    <div className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-2xl text-white group-hover:scale-110 transition-transform duration-300">
                      <Mail className="h-6 w-6" />
                    </div>
                    <div className="ml-6">
                      <h4 className="text-xl font-bold text-foreground mb-2">Электронная почта</h4>
                      <p className="text-lg text-muted-foreground mb-1">info@trc.works</p>
                      <p className="text-lg text-muted-foreground mb-1">support@trc.works</p>
                      <p className="text-sm text-muted-foreground">Ответим в течение 24 часов</p>
                    </div>
                  </div>
                  
                  {/* Contact Item 3 */}
                  <div className="flex items-start group">
                    <div className="flex-shrink-0 bg-gradient-to-r from-green-500 to-emerald-500 p-4 rounded-2xl text-white group-hover:scale-110 transition-transform duration-300">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <div className="ml-6">
                      <h4 className="text-xl font-bold text-foreground mb-2">Офис</h4>
                      <p className="text-lg text-muted-foreground mb-1">Казахстан, Алматы</p>
                      <p className="text-lg text-muted-foreground mb-1">ул. Абая 8, 3-й этаж</p>
                      <p className="text-sm text-muted-foreground">Рабочие часы: 09:00 - 18:00</p>
                    </div>
                  </div>
                  
                  {/* Social Media */}
                  <div className="pt-6">
                    <h4 className="text-xl font-bold text-foreground mb-6">Социальные сети</h4>
                    <div className="flex space-x-4">
                      <a href="#" className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 rounded-xl text-white hover:scale-110 transition-transform duration-300" aria-label="Facebook">
                        <Facebook className="h-6 w-6" />
                      </a>
                      <a href="#" className="bg-gradient-to-r from-pink-500 to-purple-500 p-3 rounded-xl text-white hover:scale-110 transition-transform duration-300" aria-label="Instagram">
                        <Instagram className="h-6 w-6" />
                      </a>
                      <a href="#" className="bg-gradient-to-r from-blue-400 to-blue-500 p-3 rounded-xl text-white hover:scale-110 transition-transform duration-300" aria-label="Twitter">
                        <Twitter className="h-6 w-6" />
                      </a>
                      <a href="#" className="bg-gradient-to-r from-red-500 to-red-600 p-3 rounded-xl text-white hover:scale-110 transition-transform duration-300" aria-label="YouTube">
                        <Youtube className="h-6 w-6" />
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="rounded-2xl overflow-hidden shadow-xl border border-border"
          >
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2906.776530500682!2d76.91521531548404!3d43.23502187913778!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38836e7d16c5cbab%3A0x3d44668fad986d76!2sAbay%20St%208%2C%20Almaty%20050000!5e0!3m2!1sen!2skz!4v1636546787899!5m2!1sen!2skz" 
              width="100%" 
              height="450" 
              style={{ border: 0 }} 
              allowFullScreen 
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default About 