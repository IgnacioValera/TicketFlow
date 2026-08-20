const PREFIX = 'ticketflow-navflash:'

function canUseSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined'
}

export function setNavFlash<T>(key: string, value: T): void {
  if (!canUseSessionStorage()) return
  sessionStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value))
}

export function consumeNavFlash<T>(key: string): T | null {
  if (!canUseSessionStorage()) return null
  const raw = sessionStorage.getItem(`${PREFIX}${key}`)
  if (!raw) return null
  sessionStorage.removeItem(`${PREFIX}${key}`)
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
