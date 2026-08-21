export interface ScoreInput {
  ticketRatings: number[]
  crmNpsScores: number[]
  wonCount: number
  lostCount: number
  completedActivities90d: number
  totalActivities: number
  closedTickets: number
  totalTickets: number
  ageDays: number
}

export interface ScoreFactor {
  key: 'satisfaction' | 'won' | 'activity' | 'tickets' | 'seniority'
  label: string
  description: string
  weight: number
  value: number | null
  points: number
  hasData: boolean
}

export interface ClientScoreResult {
  score: number | null
  insufficient: boolean
  factors: ScoreFactor[]
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function factor(
  key: ScoreFactor['key'],
  label: string,
  description: string,
  weight: number,
  hasData: boolean,
  raw: number,
): ScoreFactor {
  const value = hasData ? clamp(raw) : null
  return {
    key,
    label,
    description,
    weight,
    hasData,
    value,
    points: value == null ? 0 : Math.round((value * weight) / 100),
  }
}

export function calculateClientScore(input: ScoreInput): ClientScoreResult {
  const satisfactionParts: number[] = []
  if (input.ticketRatings.length) {
    satisfactionParts.push((input.ticketRatings.reduce((sum, rating) => sum + rating, 0) / input.ticketRatings.length / 5) * 100)
  }
  if (input.crmNpsScores.length) {
    satisfactionParts.push((input.crmNpsScores.reduce((sum, score) => sum + score, 0) / input.crmNpsScores.length) * 10)
  }

  const closedOpps = input.wonCount + input.lostCount
  const factors: ScoreFactor[] = [
    factor(
      'satisfaction',
      'Satisfacción',
      'Promedio de encuestas de tickets (0-5) y NPS de CRM (0-10).',
      30,
      satisfactionParts.length > 0,
      satisfactionParts.reduce((sum, part) => sum + part, 0) / Math.max(1, satisfactionParts.length),
    ),
    factor(
      'won',
      'Oportunidades',
      'Porcentaje de oportunidades ganadas sobre las cerradas.',
      25,
      closedOpps > 0,
      (input.wonCount / Math.max(1, closedOpps)) * 100,
    ),
    factor(
      'activity',
      'Actividad comercial',
      'Actividades completadas en los últimos 90 días (meta de 8).',
      20,
      input.totalActivities > 0,
      (input.completedActivities90d / 8) * 100,
    ),
    factor(
      'tickets',
      'Relación y seguimiento',
      'Tickets resueltos o cerrados sobre el total del cliente.',
      15,
      input.totalTickets > 0,
      (input.closedTickets / Math.max(1, input.totalTickets)) * 100,
    ),
    factor(
      'seniority',
      'Antigüedad',
      'Tiempo como cliente, hasta 24 meses.',
      10,
      input.ageDays >= 1,
      (input.ageDays / 730) * 100,
    ),
  ]

  const insufficient = factors.every((item) => !item.hasData)
  const score = insufficient ? null : Math.max(0, Math.min(100, factors.reduce((sum, item) => sum + item.points, 0)))
  return { score, insufficient, factors }
}
