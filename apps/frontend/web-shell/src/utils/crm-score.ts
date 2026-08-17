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

function dim(hasData: boolean, value: number) {
  if (!hasData) return 50
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function calculateClientScore(input: ScoreInput) {
  const satisfactionParts: number[] = []
  if (input.ticketRatings.length) {
    satisfactionParts.push((input.ticketRatings.reduce((sum, rating) => sum + rating, 0) / input.ticketRatings.length / 5) * 100)
  }
  if (input.crmNpsScores.length) {
    satisfactionParts.push((input.crmNpsScores.reduce((sum, score) => sum + score, 0) / input.crmNpsScores.length) * 10)
  }
  const satisfaction = dim(satisfactionParts.length > 0, satisfactionParts.reduce((sum, part) => sum + part, 0) / Math.max(1, satisfactionParts.length))
  const closedOpps = input.wonCount + input.lostCount
  const won = dim(closedOpps > 0, (input.wonCount / closedOpps) * 100)
  const activity = dim(input.totalActivities > 0, (input.completedActivities90d / 8) * 100)
  const tickets = dim(input.totalTickets > 0, (input.closedTickets / input.totalTickets) * 100)
  const seniority = dim(input.ageDays >= 1, (input.ageDays / 730) * 100)
  return Math.max(0, Math.min(100, Math.round(satisfaction * 0.3 + won * 0.25 + activity * 0.2 + tickets * 0.15 + seniority * 0.1)))
}
