import api, { setStoredTokens, clearStoredTokens } from './client'
import { type TokensUserOut } from './schemas'

export const registerApi = async (email: string, password: string) => {
  try {
    const resp = await api.post<TokensUserOut>('/api/auth/register', { email, password })
    setStoredTokens(resp.data.access_token, resp.data.refresh_token)
    return resp.data
  } catch (error: any) {
    if (error.response) {
      if (error.response.status === 400) {
        throw new Error('Пользователь с таким email уже существует')
      }
    }
    throw new Error('Ошибка при регистрации')
  }
}

export const loginApi = async (email: string, password: string) => {
  try {
    const params = new URLSearchParams()
    params.append('username', email)
    params.append('password', password)

    const resp = await api.post<TokensUserOut>('/api/auth/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    setStoredTokens(resp.data.access_token, resp.data.refresh_token)
    return resp.data
  } catch (error: any) {
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('Неверный email или пароль')
      }
      if (error.response.status === 404) {
        throw new Error('Пользователь не найден')
      }
    }
    throw new Error('Ошибка при входе')
  }
}

export const logoutApi = async (refreshToken?: string) => {
  try {
    await api.post('/api/auth/logout', { body: { refresh_token: refreshToken } })
  } catch (err) {
    // ignore
  }
  clearStoredTokens()
}

export const googleLoginApi = () => {
  const googleLoginUrl = `${api.defaults.baseURL}/api/auth/google/login`
  window.location.href = googleLoginUrl
}

export const handleGoogleCallbackApi = async (code: string) => {
  try {
    const resp = await api.get<TokensUserOut>('/api/auth/google/callback', { params: { code } })
    setStoredTokens(resp.data.access_token, resp.data.refresh_token)
    return resp.data
  } catch (error: any) {
    throw new Error('Ошибка при аутентификации через Google')
  }
}