const ACCESS_TOKEN_KEY = 'helpdesk_access_token'
const REFRESH_TOKEN_KEY = 'helpdesk_refresh_token'
const LOGIN_NOTICE_KEY = 'ticketflow-login-notice'

function canUseBrowserStorage(kind: 'localStorage' | 'sessionStorage'): boolean {
  return typeof window !== 'undefined' && typeof window[kind] !== 'undefined'
}

export const tokenStorage = {
  getAccessToken(): string | null {
    if (!canUseBrowserStorage('localStorage')) return null
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },
  setAccessToken(token: string): void {
    if (!canUseBrowserStorage('localStorage')) return
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
  },
  getRefreshToken(): string | null {
    if (!canUseBrowserStorage('localStorage')) return null
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },
  setRefreshToken(token: string): void {
    if (!canUseBrowserStorage('localStorage')) return
    localStorage.setItem(REFRESH_TOKEN_KEY, token)
  },
  clearTokens(): void {
    if (!canUseBrowserStorage('localStorage')) return
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },
}

export function setLoginNotice(message: string) {
  if (!canUseBrowserStorage('sessionStorage')) return
  sessionStorage.setItem(LOGIN_NOTICE_KEY, message)
}

export function peekLoginNotice() {
  if (!canUseBrowserStorage('sessionStorage')) return null
  return sessionStorage.getItem(LOGIN_NOTICE_KEY)
}

export function clearLoginNotice() {
  if (!canUseBrowserStorage('sessionStorage')) return
  sessionStorage.removeItem(LOGIN_NOTICE_KEY)
}
