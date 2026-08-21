export function isUniqueViolation(error: unknown) {
  return isPostgresCode(error, '23505')
}

export function isForeignKeyViolation(error: unknown) {
  return isPostgresCode(error, '23503')
}

function isPostgresCode(error: unknown, code: string) {
  if (!error || typeof error !== 'object') return false
  const candidate = error as {
    code?: string
    driverError?: { code?: string }
    driver?: { code?: string }
  }
  return candidate.driverError?.code === code || candidate.driver?.code === code || candidate.code === code
}
