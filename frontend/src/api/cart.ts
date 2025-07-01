import api from './client'
import { type CartItemOut, type CartStateOut } from './schemas'

export const listCartItems = async () => {
  const resp = await api.get<CartItemOut[]>('/api/cart/')
  return resp.data
}

export const getCartState = async () => {
  const resp = await api.get<CartStateOut>('/api/cart/')
  return resp.data
}

export const addToCart = async (variantId: number, quantity = 1) => {
  const resp = await api.post<CartStateOut>(`/api/cart/${variantId}`, null, {
    params: { qty: quantity },
  })
  return resp.data
}

export const updateCartItem = async (variantId: number, quantity: number) => {
  const resp = await api.put<CartStateOut>(`/api/cart/${variantId}`, { quantity })
  return resp.data
}

export const removeCartItem = async (variantId: number) => {
  await api.delete(`/api/cart/${variantId}`)
}

export const clearCart = async () => {
  await api.delete('/api/cart/')
} 