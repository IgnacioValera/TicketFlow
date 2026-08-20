const PREFIX = 'ticketflow-navflash:'

export function setNavFlash<T>(key: string, value: T): void {
  sessionStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value))
}

export function consumeNavFlash<T>(key: string): T | null {
  const raw = sessionStorage.getItem(`${PREFIX}${key}`)
  if (!raw) return null
  sessionStorage.removeItem(`${PREFIX}${key}`)
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
