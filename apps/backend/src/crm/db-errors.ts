export function isUniqueViolation(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const candidate = error as {
    code?: string
    driverError?: { code?: string }
    driver?: { code?: string }
  }
  return candidate.driverError?.code === '23505' || candidate.driver?.code === '23505' || candidate.code === '23505'
}
