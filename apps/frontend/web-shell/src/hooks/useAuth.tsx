import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  updateOwnProfile: (payload: { fullName: string }) => Promise<User>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function normalizeUser(user: User): User {
  const permissions =
    user.permissions?.length > 0 ? user.permissions : (ROLE_PERMISSIONS[user.role] ?? [])
  return { ...user, permissions, mustChangePassword: Boolean(user.mustChangePassword) }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const profileEpoch = useRef(0)

  const logout = useCallback(async () => {
    profileEpoch.current += 1
    await authService.logout()
    setUser(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    const epoch = profileEpoch.current
    const profile = await authService.getProfile()
    if (epoch !== profileEpoch.current) return
    setUser(normalizeUser(profile))
  }, [])

  const updateOwnProfile = useCallback(async (payload: { fullName: string }) => {
    profileEpoch.current += 1
    const epoch = profileEpoch.current
    const profile = await authService.updateOwnProfile(payload)
    const normalized = normalizeUser(profile)
    if (epoch === profileEpoch.current) setUser(normalized)
    return normalized
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
      updateOwnProfile,
    }),
    [user, isLoading, login, logout, refreshProfile, updateOwnProfile],
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
