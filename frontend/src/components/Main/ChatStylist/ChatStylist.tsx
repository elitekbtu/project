import { useState, useRef, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import { sendChatMessage, type ChatStylistItem } from '../../../api/chatStylist'
import { Card, CardContent } from '../../ui/card'
import { Input } from '../../ui/input'
import { Button } from '../../ui/button'
import { Avatar, AvatarFallback } from '../../ui/avatar'
import { MessageCircle, User, Bot, X, ShoppingBag } from 'lucide-react'
import { AuthContext } from '../../../context/AuthContext'

const AVATAR_AI = <AvatarFallback className="bg-muted text-muted-foreground"><Bot className="w-5 h-5" /></AvatarFallback>
const AVATAR_USER = <AvatarFallback className="bg-muted text-muted-foreground"><User className="w-5 h-5" /></AvatarFallback>

interface ChatMessage {
  role: 'user' | 'ai'
  text: string
  items?: ChatStylistItem[]
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const auth = useContext(AuthContext)
  const user = auth && typeof auth === 'object' && auth !== null && 'user' in auth ? (auth as any).user : undefined;

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
    const resp = await sendChatMessage(input, user)
    // Парсим совет по размеру, если он есть (например, ищем строку после "Совет по размеру:")
    let reply = resp.reply
    let sizeAdvice = ''
    const sizeMatch = reply.match(/Совет по размеру:([^\n]+)/i)
    if (sizeMatch) {
      sizeAdvice = sizeMatch[1].trim()
      reply = reply.replace(sizeMatch[0], '').trim()
    }
    setMessages(msgs => [...msgs, { role: 'ai', text: reply + (sizeAdvice ? `\n\n👕 Совет по размеру: ${sizeAdvice}` : ''), items: resp.items }])
    setInput('')
    setLoading(false)
  }

  // Функция для очистки чата
  const handleClearChat = () => {
    setMessages([])
    sessionStorage.removeItem(SESSION_KEY)
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
          <Button variant="ghost" size="icon" onClick={handleClearChat} className="text-muted-foreground" title="Очистить чат">
            🗑️
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="text-muted-foreground">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>
      {/* User info */}
      {user && (
        <div className="px-4 py-2 text-xs text-muted-foreground border-b bg-muted/10">
          Ваши параметры: рост {user.height || '-'} см, вес {user.weight || '-'} кг, грудь {user.chest || '-'} см, талия {user.waist || '-'} см, бёдра {user.hips || '-'} см
        </div>
      )}
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-background">
        {messages.length === 0 && (
          <div className="text-muted-foreground text-center mt-8 text-sm">Задайте вопрос стилисту...</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="flex items-end gap-2 max-w-[80%]">
              {msg.role === 'ai' && (
                <Avatar className="h-8 w-8 border border-slate-200 bg-muted">{AVATAR_AI}</Avatar>
              )}
              <Card className={`rounded-2xl border bg-white shadow-sm ${msg.role === 'user' ? 'ml-auto' : ''} w-full`}>
                <CardContent className="p-3">
                  <div className="text-sm text-foreground whitespace-pre-line mb-2">{msg.text}</div>
                  {msg.items && msg.items.length > 0 && (
                    <div className="grid grid-cols-1 gap-3 mt-2">
                      {msg.items.map(item => (
                        <Link key={item.id} to={`/items/${item.id}`} className="block">
                          <Card className="flex flex-row items-center gap-3 border bg-muted/30 p-2 hover:bg-muted/50 transition-colors cursor-pointer">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-14 h-14 object-cover rounded-md border" />
                            ) : (
                              <Avatar className="h-8 w-8 border border-slate-200 bg-muted">
                                <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                              </Avatar>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate" title={item.name}>{item.name}</div>
                              {item.brand && <div className="text-xs text-muted-foreground truncate">{item.brand}</div>}
                              <div className="flex items-center gap-2 mt-1">
                                {item.price !== undefined && item.price !== null && (
                                  <span className="text-sm font-semibold">{item.price.toLocaleString()} ₸</span>
                                )}
                                {item.category && (
                                  <span className="text-xs text-muted-foreground">{item.category}</span>
                                )}
                              </div>
                            </div>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              {msg.role === 'user' && (
                <Avatar className="h-8 w-8 border border-slate-200 bg-muted">{AVATAR_USER}</Avatar>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {/* Input */}
      <form onSubmit={e => { e.preventDefault(); handleSend() }} className="flex gap-2 p-4 border-t border-slate-200 bg-white">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ваш вопрос..." className="flex-1" autoFocus={open} />
        <Button type="submit" disabled={loading || !input.trim()} className="shrink-0">Отправить</Button>
      </form>
    </div>
  )
}

export default ChatStylist 