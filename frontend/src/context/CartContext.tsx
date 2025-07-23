import React, { createContext, useContext, useEffect, useState } from 'react'
import { getCartState, addToCart, updateCartItem as apiUpdate, removeCartItem as apiRemove, clearCart as apiClear } from '../api/cart'
import { useAuth } from './AuthContext'

interface CartItem {
  id: number            // variant id (primary key for cart actions)
  item_id: number       // parent item id
  name: string
  price: number
  quantity: number
  size?: string
  color?: string
  image_url?: string | null
  stock?: number
}

interface CartContextState {
  items: CartItem[]
  totalItems: number
  totalPrice: number
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => Promise<void>
  removeItem: (id: number) => Promise<void>
  updateQuantity: (id: number, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
}

const CartContext = createContext<CartContextState | undefined>(undefined)

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()

  const [items, setItems] = useState<CartItem[]>([])

  // Sync local storage for guests
  useEffect(() => {
    if (!user) {
      localStorage.setItem('cart', JSON.stringify(items))
    }
  }, [items, user])

  // Load initial cart
  useEffect(() => {
    const init = async () => {
      if (user) {
        try {
          const data = await getCartState()
          setItems(
            data.items.map((ci) => ({
              id: ci.variant_id,
              item_id: ci.item_id,
              name: ci.name,
              price: ci.price || 0,
              quantity: ci.quantity,
              image_url: ci.image_url,
              size: ci.size,
              color: ci.color,
              stock: ci.stock,
            }))
          )
        } catch (err) {
          console.error(err)
        }
      } else {
        const stored = localStorage.getItem('cart')
        setItems(stored ? (JSON.parse(stored) as CartItem[]) : [])
      }
    }
    init()
  }, [user])

  const addItem: CartContextState['addItem'] = async (item) => {
    if (user) {
      try {
        await addToCart(item.id, item.quantity ?? 1)
      } catch (err) {
        console.error(err)
      }
    }
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      const increment = item.quantity ?? 1
      if (existing) {
        const maxQty = existing.stock ?? (existing.quantity + increment)
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: Math.min(i.quantity + increment, maxQty) } : i
        )
      }
      return [...prev, { ...item, quantity: increment }]
    })
  }

  const removeItem: CartContextState['removeItem'] = async (id) => {
    if (user) {
      try {
        await apiRemove(id)
      } catch (err) { console.error(err) }
    }
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const updateQuantity: CartContextState['updateQuantity'] = async (id, quantity) => {
    if (quantity <= 0) return removeItem(id)
    if (user) {
      try {
        await apiUpdate(id, quantity)
      } catch (err) { console.error(err) }
    }
    setItems((prev) => prev.map((i) => {
      if (i.id !== id) return i
      const maxQty = i.stock ?? quantity
      return { ...i, quantity: Math.min(quantity, maxQty) }
    }))
  }

  const clearCart = async () => {
    if (user) {
      try { await apiClear() } catch (err) { console.error(err) }
    }
    setItems([])
  }

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const totalPrice = items.reduce((sum, i) => sum + i.quantity * i.price, 0)

  return (
    <CartContext.Provider value={{ items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
} 