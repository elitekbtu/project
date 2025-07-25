import api from './client'

export interface ChatStylistItem {
  id: number
  name: string
  image_url?: string | null
  brand?: string | null
  price?: number | null
  category?: string | null
}

export interface ChatStylistResponse {
  reply: string
  items: ChatStylistItem[]
}

export const sendChatMessage = async (message: string, userProfile?: any): Promise<ChatStylistResponse> => {
  const resp = await api.post<ChatStylistResponse>('/api/chat-stylist/', { message, user_profile: userProfile })
  return resp.data
} 