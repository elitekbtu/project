import { createContext, useContext, useEffect, useState } from 'react'
import { loginApi, registerApi, logoutApi } from '../api/auth'
import { getStoredTokens, clearStoredTokens } from '../api/client'
import api from '../api/client'
import { type ProfileOut } from '../api/schemas'

interface AuthContextProps {
  user?: ProfileOut
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isAdmin: boolean
  isModerator: boolean
  hasPanelAccess: boolean
  /** Обновить данные пользователя в контексте (после изменения профиля) */
  updateUser: (data?: ProfileOut) => void
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ProfileOut | undefined>(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      try {
        return JSON.parse(stored) as ProfileOut
      } catch {
        return undefined
      }
    }
    return undefined
  })
  const [loading, setLoading] = useState(true)

  const fetchMe = async () => {
    try {
      const resp = await api.get<ProfileOut>('/api/me')
      setUser(resp.data)
      persistUser(resp.data)
    } catch {
      clearStoredTokens()
      setUser(undefined)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const { access } = getStoredTokens()
    if (access) {
      fetchMe()
    } else {
      setLoading(false)
    }
  }, [])

  const persistUser = (u?: ProfileOut) => {
    if (u) {
      localStorage.setItem('user', JSON.stringify(u))
    } else {
      localStorage.removeItem('user')
    }
  }

  const updateUser = (data?: ProfileOut) => {
    setUser(data)
    persistUser(data)
  }

  const login = async (email: string, password: string) => {
    setLoading(true)
    const data = await loginApi(email, password)
    setUser(data.user)
    persistUser(data.user)
    setLoading(false)
  }

  const register = async (email: string, password: string) => {
    setLoading(true)
    const data = await registerApi(email, password)
    setUser(data.user)
    persistUser(data.user)
    setLoading(false)
  }

  const logout = async () => {
    setLoading(true)
    await logoutApi(getStoredTokens().refresh)
    setUser(undefined)
    persistUser(undefined)
    setLoading(false)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAdmin: !!user?.is_admin,
        isModerator: !!(user as any)?.is_moderator,
        hasPanelAccess: !!(user?.is_admin || (user as any)?.is_moderator),
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
} 