import api from './client'
import {
  type ItemOut,
  type OutfitOut,
  type UserCreateAdmin,
  type UserOut as User,
  type UserUpdateAdmin,
} from './schemas'

export const listUsers = async () => {
  const resp = await api.get<User[]>('/api/users/')
  return resp.data
}

export const createUser = async (data: UserCreateAdmin) => {
  const resp = await api.post<User>('/api/users/', data)
  return resp.data
}

export const getUser = async (id: number) => {
  const resp = await api.get<User>(`/api/users/${id}`)
  return resp.data
}

export const updateUser = async (id: number, data: UserUpdateAdmin) => {
  const resp = await api.patch<User>(`/api/users/${id}`, data)
  return resp.data
}

export const deleteUser = async (id: number) => {
  await api.delete(`/api/users/${id}`)
}

// User-specific content
export const listUserOutfits = async (userId: number) => {
  const resp = await api.get<OutfitOut[]>(`/api/users/${userId}/outfits`)
  return resp.data
}

export const toggleFavorite = async (userId: number, itemId: number) => {
  await api.post(`/api/users/${userId}/favorites/${itemId}`)
}

export const listFavorites = async (userId: number) => {
  const resp = await api.get<ItemOut[]>(`/api/users/${userId}/favorites`)
  return resp.data
}

export const userHistory = async (userId: number, limit?: number) => {
  const resp = await api.get<ItemOut[]>(`/api/users/${userId}/history`, { params: { limit } })
  return resp.data
} 