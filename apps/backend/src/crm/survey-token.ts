import { createHash, randomBytes } from 'crypto'

export function hashSurveyToken(raw: string) {
  return createHash('sha256').update(raw).digest('hex')
}

export function createSurveyToken() {
  const raw = randomBytes(32).toString('hex')
  return { raw, hash: hashSurveyToken(raw) }
}

export function invitationExpiry(from = new Date(), days = 30) {
  return new Date(from.getTime() + days * 24 * 3600 * 1000)
}
