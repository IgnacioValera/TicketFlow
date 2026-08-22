export function postgresSsl(dbSsl = process.env.DB_SSL) {
  return dbSsl === 'true' ? { rejectUnauthorized: false } : false
}

/** pg treats URL sslmode=require as verify-full and fails against RDS lab CAs. */
export function postgresUrlWithoutSslMode(url: string | undefined): string | undefined {
  if (!url) {
    return url
  }

  try {
    const parsed = new URL(url)
    parsed.searchParams.delete('sslmode')
    return parsed.toString()
  } catch {
    return url.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '')
  }
}
