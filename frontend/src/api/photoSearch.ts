import api from './client'

export const searchByPhoto = async (file: File, userProfile?: any) => {
  const formData = new FormData()
  formData.append('file', file)
  if (userProfile) {
    formData.append('user_profile', JSON.stringify(userProfile))
  }
  const resp = await api.post('/api/items/search-by-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return resp.data // Item[]
} 