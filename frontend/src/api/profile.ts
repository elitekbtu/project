import api from './client'
import { type ProfileOut, type ProfileUpdate } from './schemas'

export const getProfile = async () => {
  const resp = await api.get<ProfileOut>('/api/profile/')
  return resp.data
}

export const updateProfile = async (data: ProfileUpdate) => {
  const resp = await api.patch<ProfileOut>('/api/profile/', data)
  return resp.data
}

export const deleteProfile = async () => {
  await api.delete('/api/profile/')
}

// ---- Avatar ----

export const uploadAvatar = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  const resp = await api.post<ProfileOut>('/api/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return resp.data
}

export const deleteAvatar = async () => {
  await api.delete('/api/profile/avatar')
} 