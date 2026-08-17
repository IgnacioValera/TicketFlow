const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/

export const PRIORITY_DEFAULT_COLORS: Record<string, string> = {
  LOW: '#64748B',
  MEDIUM: '#0F766E',
  HIGH: '#D97706',
  CRITICAL: '#DC2626',
}

export function isHexColor(value: string) {
  return HEX_COLOR.test(value)
}

export function normalizeHexColor(value: string) {
  return value.trim().toUpperCase()
}
