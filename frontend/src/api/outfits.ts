import api from './client'
import {
  type OutfitCommentCreate,
  type OutfitCommentOut,
  type OutfitCreate,
  type OutfitOut,
  type OutfitUpdate,
  type VirtualTryOnRequest,
  type VirtualTryOnResponse,
} from './schemas'

export interface ListOutfitsParams {
  page?: number
  q?: string
  style?: string
  collection?: string
  min_price?: number
  max_price?: number
  sort_by?: string
}

export const listOutfits = async (params: ListOutfitsParams = {}) => {
  const resp = await api.get<OutfitOut[]>('/api/outfits/', { params })
  return resp.data
}

export const getOutfit = async (id: number) => {
  const resp = await api.get<OutfitOut>(`/api/outfits/${id}`)
  return resp.data
}

export const createOutfit = async (data: OutfitCreate) => {
  const resp = await api.post<OutfitOut>('/api/outfits/', data)
  return resp.data
}

export const updateOutfit = async (id: number, data: OutfitUpdate) => {
  const resp = await api.put<OutfitOut>(`/api/outfits/${id}`, data)
  return resp.data
}

export const deleteOutfit = async (id: number) => {
  await api.delete(`/api/outfits/${id}`)
}

// ---------- Trending ----------

export const trendingOutfits = async (limit?: number) => {
  const resp = await api.get<OutfitOut[]>('/api/outfits/trending', { params: { limit } })
  return resp.data
}

// ---------- Favorites ----------

export const toggleFavoriteOutfit = async (id: number) => {
  await api.post(`/api/outfits/${id}/favorite`)
}

export const listFavoriteOutfits = async (page = 1) => {
  const resp = await api.get<OutfitOut[]>('/api/outfits/favorites', { params: { page } })
  return resp.data
}

// ---------- View History ----------

export const viewedOutfits = async (page = 1) => {
  const resp = await api.get<OutfitOut[]>('/api/outfits/history', { params: { page } })
  return resp.data
}

export const clearOutfitViewHistory = async () => {
  await api.delete('/api/outfits/history')
}

// ---------- Comments ----------

export const listOutfitComments = async (outfitId: number) => {
  const resp = await api.get<OutfitCommentOut[]>(`/api/outfits/${outfitId}/comments`)
  return resp.data
}

export const addOutfitComment = async (outfitId: number, data: OutfitCommentCreate) => {
  const resp = await api.post<OutfitCommentOut>(`/api/outfits/${outfitId}/comments`, data)
  return resp.data
}

export const likeOutfitComment = async (outfitId: number, commentId: number) => {
  await api.post(`/api/outfits/${outfitId}/comments/${commentId}/like`)
}

// ---------- Delete Comment ----------

export const deleteOutfitComment = async (outfitId: number, commentId: number) => {
  await api.delete(`/api/outfits/${outfitId}/comments/${commentId}`)
}

// ---------- Virtual Tryon ----------

export const generateVirtualTryon = async (data: VirtualTryOnRequest) => {
  const resp = await api.post<VirtualTryOnResponse>('/api/outfits/virtual-tryon', data)
  return resp.data
}

