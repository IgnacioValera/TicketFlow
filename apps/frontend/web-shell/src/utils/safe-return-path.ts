/** Only allow same-origin relative paths (open redirect protection). */
export function sanitizeReturnPath(value: string | null | undefined, fallback = '/'): string {
  if (!value) return fallback
  if (!value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}
