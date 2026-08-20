'use client'

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

/** Survive Soft Navigation remounts of AuthProvider under Next App Router. */
let sessionUser: User | null = null

function normalizeUser(user: User): User {
  return {
    ...user,
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    mustChangePassword: Boolean(user.mustChangePassword),
    permissionsVersion: user.permissionsVersion ?? 0,
  }
}

function setSessionUser(user: User | null) {
  sessionUser = user
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(sessionUser)
  const [isLoading, setIsLoading] = useState(() => !sessionUser && Boolean(tokenStorage.getAccessToken()))
  const profileEpoch = useRef(0)

  const logout = useCallback(async () => {
    profileEpoch.current += 1
    await authService.logout()
    setSessionUser(null)
    setUser(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    const epoch = profileEpoch.current
    const profile = await authService.getProfile()
    if (epoch !== profileEpoch.current) return
    const normalized = normalizeUser(profile)
    setSessionUser(normalized)
    setUser(normalized)
  }, [])

  const updateOwnProfile = useCallback(async (payload: { fullName: string }) => {
    profileEpoch.current += 1
    const epoch = profileEpoch.current
    const profile = await authService.updateOwnProfile(payload)
    const normalized = normalizeUser(profile)
    if (epoch === profileEpoch.current) {
      setSessionUser(normalized)
      setUser(normalized)
    }
    return normalized
  }, [])

  useEffect(() => {
    setAuthHandlers(
      authService.refreshToken,
      () => {
        tokenStorage.clearTokens()
        setSessionUser(null)
        setUser(null)
      },
      () => refreshProfile(),
    )
  }, [refreshProfile])

  useEffect(() => {
    const revalidate = () => {
      if (!tokenStorage.getAccessToken()) return
      void refreshProfile()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') revalidate()
    }
    window.addEventListener('focus', revalidate)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', revalidate)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refreshProfile])

  useEffect(() => {
    if (sessionUser) {
      setIsLoading(false)
      return
    }
    const init = async () => {
      const token = tokenStorage.getAccessToken()
      if (!token) {
        setIsLoading(false)
        return
      }
      try {
        const profile = await authService.getProfile()
        const normalized = normalizeUser(profile)
        setSessionUser(normalized)
        setUser(normalized)
      } catch {
        tokenStorage.clearTokens()
        setSessionUser(null)
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
      setSessionUser(normalized)
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
