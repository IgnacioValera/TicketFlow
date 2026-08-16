export function classifyNps(score: number) {
  if (score >= 9) return 'promoter' as const
  if (score >= 7) return 'passive' as const
  return 'detractor' as const
}

export function calculateNps(scores: number[]) {
  const total = scores.length
  if (!total) return { nps: 0, promoters: 0, passives: 0, detractors: 0, total: 0 }
  const promoters = scores.filter((score) => score >= 9).length
  const passives = scores.filter((score) => score >= 7 && score <= 8).length
  const detractors = scores.filter((score) => score <= 6).length
  const nps = Math.round(((promoters - detractors) / total) * 100)
  return { nps, promoters, passives, detractors, total }
}
