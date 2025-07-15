import api from './client'

export interface Shop {
  id: number
  name: string
  moderator_id: number
  moderator_name: string
  moderator_email: string
  avatar?: string  // Добавляем аватар
  items_count: number
  created_at: string
  updated_at: string
}

export interface ShopItemsResponse {
  items: any[]
  total: number
  page: number
  limit: number
}

export const shopsApi = {
  // Получить список всех магазинов (модераторов)
  getShops: async (): Promise<Shop[]> => {
    const response = await api.get('/api/users/moderators')
    return response.data
  },

  // Получить товары конкретного магазина
  getShopItems: async (
    moderatorId: number,
    page: number = 1,
    limit: number = 20,
    filters?: {
      category?: string
      style?: string
      min_price?: number
      max_price?: number
      size?: string
      q?: string
    }
  ): Promise<ShopItemsResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      moderator_id: moderatorId.toString(),
    })
    
    // Add filters if they exist
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString())
        }
      })
    }
    
    const response = await api.get(`/api/items?${params}`)
    return {
      items: response.data,
      total: response.headers['x-total-count'] ? parseInt(response.headers['x-total-count']) : response.data.length,
      page,
      limit
    }
  },

  // Получить информацию о конкретном магазине
  getShop: async (moderatorId: number): Promise<Shop> => {
    const response = await api.get(`/api/users/${moderatorId}`)
    return response.data
  }
} 