import api from './client'
import type { ClothingType } from '../constants'
import {
  type ItemOut,
  type ItemUpdate,
  type CommentCreate,
  type CommentOut,
  type VariantOut,
  type VariantCreate,
  type VariantUpdate,
} from './schemas'

export interface ListItemsParams {
  page?: number
  q?: string
  category?: string
  style?: string
  // Убрано поле collection - коллекции больше не используются
  min_price?: number
  max_price?: number
  size?: string
  sort_by?: string
  clothing_type?: ClothingType
}

export const listItems = async (params: ListItemsParams = {}) => {
  const resp = await api.get<ItemOut[]>('/api/items/', { params })
  return resp.data
}

export const getItem = async (id: number) => {
  const resp = await api.get<ItemOut>(`/api/items/${id}`)
  return resp.data
}

export const createItem = async (data: FormData) => {
  const resp = await api.post<ItemOut>('/api/items/', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return resp.data
}

export const updateItem = async (id: number, data: ItemUpdate) => {
  const resp = await api.put<ItemOut>(`/api/items/${id}`, data)
  return resp.data
}

export const deleteItem = async (id: number) => {
  await api.delete(`/api/items/${id}`)
}

export const trendingItems = async (limit?: number) => {
  const resp = await api.get<ItemOut[]>('/api/items/trending', { params: { limit } })
  return resp.data
}

export const similarItems = async (id: number, limit?: number) => {
  const resp = await api.get<ItemOut[]>(`/api/items/${id}/similar`, { params: { limit } })
  return resp.data
}

// Убрано - коллекции больше не используются в новой системе образов

// ---------- Favorites ----------

export const toggleFavoriteItem = async (id: number) => {
  await api.post(`/api/items/${id}/favorite`)
}

export const listFavoriteItems = async (page = 1) => {
  const resp = await api.get<ItemOut[]>('/api/items/favorites', { params: { page } })
  return resp.data
}

// ---------- View History ----------

export const viewedItems = async (page = 1) => {
  const resp = await api.get<ItemOut[]>('/api/items/history', { params: { page } })
  return resp.data
}

export const clearViewHistory = async () => {
  await api.delete('/api/items/history')
}

// ---------- Comments ----------

export const listItemComments = async (itemId: number) => {
  const resp = await api.get<CommentOut[]>(`/api/items/${itemId}/comments`)
  return resp.data
}

export const addItemComment = async (itemId: number, data: CommentCreate) => {
  const resp = await api.post<CommentOut>(`/api/items/${itemId}/comments`, data)
  return resp.data
}

export const likeComment = async (itemId: number, commentId: number) => {
  await api.post(`/api/items/${itemId}/comments/${commentId}/like`)
}

// ---------- Delete Comment ----------

export const deleteItemComment = async (itemId: number, commentId: number) => {
  await api.delete(`/api/items/${itemId}/comments/${commentId}`)
}

// ---------- Variants ----------

export const listVariants = async (itemId: number) => {
  const resp = await api.get<VariantOut[]>(`/api/items/${itemId}/variants`)
  return resp.data
}

export const createVariant = async (itemId: number, data: VariantCreate) => {
  const resp = await api.post<VariantOut>(`/api/items/${itemId}/variants`, data)
  return resp.data
}

export const updateVariant = async (itemId: number, variantId: number, data: VariantUpdate) => {
  const resp = await api.put<VariantOut>(`/api/items/${itemId}/variants/${variantId}`, data)
  return resp.data
}

export const deleteVariant = async (itemId: number, variantId: number) => {
  await api.delete(`/api/items/${itemId}/variants/${variantId}`)
}

// ---------- Images ----------

export interface ItemImageOut {
  id: number
  image_url: string
  position?: number
}

export const listItemImages = async (itemId: number) => {
  const resp = await api.get<ItemImageOut[]>(`/api/items/${itemId}/images`)
  return resp.data
}

export const deleteItemImage = async (itemId: number, imageId: number) => {
  await api.delete(`/api/items/${itemId}/images/${imageId}`)
} 