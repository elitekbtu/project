import { useState, useRef, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import { 
  sendChatMessage, 
  resetConversation,
  getConversationStats,
  type ChatStylistItem,
  type ChatStylistResponse 
} from '../../../api/chatStylist'
import { Input } from '../../ui/input'
import { Button } from '../../ui/button'
import { Avatar, AvatarFallback } from '../../ui/avatar'
import { Badge } from '../../ui/badge'
import { 
  MessageCircle, 
  User, 
  Bot, 
  X, 
  ShoppingBag, 
  RefreshCw, 
  BarChart3,
  Zap,
  Clock,
  Target,
  ExternalLink,
  ShoppingCart,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { AuthContext } from '../../../context/AuthContext'
import { useCart } from '../../../context/CartContext'

const AVATAR_AI = <AvatarFallback className="bg-muted text-muted-foreground"><Bot className="w-5 h-5" /></AvatarFallback>
const AVATAR_USER = <AvatarFallback className="bg-muted text-muted-foreground"><User className="w-5 h-5" /></AvatarFallback>

interface ChatMessage {
  role: 'user' | 'ai'
  text: string
  items?: ChatStylistItem[]
  intent_type?: string
  confidence?: number
  processing_time?: number
}

const ChatStylist = () => {
  // Ключ для sessionStorage
  const SESSION_KEY = 'chat_stylist_history'
  // Загружаем историю из sessionStorage при инициализации
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY)
      return stored ? (JSON.parse(stored) as ChatMessage[]) : []
    } catch {
      return []
    }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const auth = useContext(AuthContext)
  const user = auth && typeof auth === 'object' && auth !== null && 'user' in auth ? (auth as any).user : undefined;
  const { addItem } = useCart()

  // Сохраняем историю в sessionStorage при изменении
  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  const handleSend = async () => {
    if (!input.trim()) return
    setMessages([...messages, { role: 'user', text: input }])
    setLoading(true)
    
    try {
      const resp: ChatStylistResponse = await sendChatMessage(input, user)
      
      // Логируем информацию о найденных товарах
      if (resp.items && resp.items.length > 0) {
        console.log(`Найдено ${resp.items.length} товаров в чат-стилисте`)
      }
      
      // Парсим совет по размеру, если он есть
      let reply = resp.reply
      let sizeAdvice = ''
      const sizeMatch = reply.match(/Совет по размеру:([^\n]+)/i)
      if (sizeMatch) {
        sizeAdvice = sizeMatch[1].trim()
        reply = reply.replace(sizeMatch[0], '').trim()
      }
      
      const aiMessage: ChatMessage = {
        role: 'ai',
        text: reply + (sizeAdvice ? `\n\n👕 Совет по размеру: ${sizeAdvice}` : ''),
        items: resp.items,
        intent_type: resp.intent_type,
        confidence: resp.confidence,
        processing_time: resp.processing_time
      }
      
      setMessages(msgs => [...msgs, aiMessage])
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error)
      setMessages(msgs => [...msgs, { 
        role: 'ai', 
        text: 'Извините, произошла ошибка при обработке вашего запроса. Попробуйте еще раз.' 
      }])
    } finally {
      setInput('')
      setLoading(false)
    }
  }

  // Функция для очистки чата
  const handleClearChat = async () => {
    try {
      if (user?.id) {
        await resetConversation(user.id)
      }
      setMessages([])
      sessionStorage.removeItem(SESSION_KEY)
    } catch (error) {
      console.error('Ошибка сброса диалога:', error)
      // Fallback - очищаем локально
      setMessages([])
      sessionStorage.removeItem(SESSION_KEY)
    }
  }

  // Функция для загрузки статистики
  const loadStats = async () => {
    if (!user?.id) return
    
    setLoadingStats(true)
    try {
      const statsData = await getConversationStats(user.id)
      setStats(statsData)
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  // Функция для добавления товара в корзину
  const handleAddToCart = async (item: ChatStylistItem) => {
    try {
      await addItem({
        id: item.id,
        item_id: item.id,
        name: item.name || 'Товар',
        price: item.price || 0,
        image_url: item.image_url,
        quantity: 1,
      })
    } catch (error) {
      console.error('Ошибка добавления в корзину:', error)
    }
  }

  // Функция для переключения отображения всех товаров
  const toggleExpandedItems = (messageIndex: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageIndex)) {
        newSet.delete(messageIndex)
      } else {
        newSet.add(messageIndex)
      }
      return newSet
    })
  }

  // Функция для отображения метаданных сообщения
  const renderMessageMetadata = (message: ChatMessage) => {
    if (message.role !== 'ai' || !message.intent_type) return null

    return (
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        {message.intent_type && (
          <Badge variant="outline" className="text-xs">
            <Target className="w-3 h-3 mr-1" />
            {message.intent_type}
          </Badge>
        )}
        {message.confidence && (
          <Badge variant="outline" className="text-xs">
            <Zap className="w-3 h-3 mr-1" />
            {Math.round(message.confidence * 100)}%
          </Badge>
        )}
        {message.processing_time && (
          <Badge variant="outline" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {message.processing_time.toFixed(2)}s
          </Badge>
        )}
      </div>
    )
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-6 right-6 z-40 shadow-md border bg-white md:bottom-6 md:right-6 bottom-[80px] right-6 md:bottom-6 sm:bottom-6 lg:bottom-6 xl:bottom-6"
        onClick={() => setOpen(true)}
        aria-label="Открыть чат-стилист"
      >
        <MessageCircle className="w-6 h-6 text-muted-foreground" />
      </Button>
    )
  }

  return (
    <div className="fixed bottom-0 right-0 z-40 w-full max-w-md sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl h-[45vh] sm:h-[55vh] md:h-[65vh] lg:h-[75vh] xl:h-[80vh] bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col animate-fade-in md:bottom-0 md:mb-0 mb-[60px] md:mb-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white rounded-t-2xl">
        <span className="text-base font-semibold text-foreground">ИИ чат-стилист</span>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              setShowStats(!showStats)
              if (!showStats && !stats) {
                loadStats()
              }
            }} 
            className="text-muted-foreground" 
            title="Статистика"
          >
            <BarChart3 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClearChat} className="text-muted-foreground" title="Очистить чат">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="text-muted-foreground">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Statistics Panel */}
      {showStats && (
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          {loadingStats ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Загрузка статистики...
            </div>
          ) : stats ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Взаимодействий:</span>
                <span className="font-medium">{stats.interaction_count || 0}</span>
              </div>
              {stats.current_state && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Состояние:</span>
                  <Badge variant="outline" className="text-xs">
                    {stats.current_state}
                  </Badge>
                </div>
              )}
              {stats.conversation_duration && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Длительность:</span>
                  <span className="font-medium">{Math.round(stats.conversation_duration)}с</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Статистика недоступна
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Привет! Я ваш ИИ-стилист. Задайте мне любой вопрос о моде, стиле или товарах!</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'ai' && (
                <Avatar className="w-8 h-8">
                  {AVATAR_AI}
                </Avatar>
              )}
              <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                <div className={`rounded-lg px-3 py-2 ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                </div>
                
                {/* Метаданные сообщения */}
                {renderMessageMetadata(message)}
                
                {/* Товары */}
                {message.items && message.items.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground">Найденные товары: ({message.items.length})</p>
                    <div className="grid grid-cols-1 gap-2 max-w-full">
                      {message.items.slice(0, expandedItems.has(index) ? message.items.length : 3).map((item) => (
                        <div 
                          key={item.id} 
                          className="flex items-center gap-2 p-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors overflow-hidden"
                        >
                          <Link 
                            to={`/items/${item.id}`}
                            className="flex items-center gap-2 flex-1 min-w-0"
                          >
                            {item.image_url ? (
                              <img 
                                src={item.image_url} 
                                alt={item.name || 'Товар'} 
                                className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate text-gray-900">
                                {item.name || 'Название не указано'}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {item.brand && `${item.brand} • `}
                                {item.price ? `${item.price} ₸` : 'Цена не указана'}
                              </p>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8 text-green-600 hover:text-green-700 hover:bg-green-50 flex-shrink-0"
                            onClick={() => handleAddToCart(item)}
                            title="Добавить в корзину"
                          >
                            <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    {/* Кнопка "Показать больше/меньше" */}
                    {message.items.length > 3 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => toggleExpandedItems(index)}
                      >
                        {expandedItems.has(index) ? (
                          <>
                            <ChevronUp className="w-3 h-3 mr-1" />
                            Показать меньше
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3 mr-1" />
                            Показать еще {message.items.length - 3} товаров
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {message.role === 'user' && (
                <Avatar className="w-8 h-8">
                  {AVATAR_USER}
                </Avatar>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Напишите сообщение..."
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <MessageCircle className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ChatStylist 