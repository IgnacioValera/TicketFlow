import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'
import * as authService from '@/services/auth.service'
import { setAuthHandlers } from '@/services/apiClient'
import { ROLE_PERMISSIONS } from '@/constants/roles'
import type { LoginCredentials, User } from '@/types/user.types'
import { tokenStorage } from '@/utils/storage'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<User>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function normalizeUser(user: User): User {
  const permissions =
    user.permissions?.length > 0 ? user.permissions : (ROLE_PERMISSIONS[user.role] ?? [])
  return { ...user, permissions }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    const profile = await authService.getProfile()
    setUser(normalizeUser(profile))
  }, [])

  useEffect(() => {
    setAuthHandlers(authService.refreshToken, () => {
      tokenStorage.clearTokens()
      setUser(null)
    })
  }, [])

  useEffect(() => {
    const init = async () => {
      const token = tokenStorage.getAccessToken()
      if (!token) {
        setIsLoading(false)
        return
      }
      try {
        const profile = await authService.getProfile()
        setUser(normalizeUser(profile))
      } catch {
        tokenStorage.clearTokens()
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    void init()
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials)
    const normalized = normalizeUser(response.user)
    flushSync(() => {
      setUser(normalized)
    })
    return normalized
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      refreshProfile,
    }),
    [user, isLoading, login, logout, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
