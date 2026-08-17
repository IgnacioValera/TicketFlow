export const TICKET_FLOW_COPY = {
  conversation: 'Conversación',
  timeline: 'Cronología',
  assignment: 'Asignación',
  attention: 'Atención',
  technicalAnalysis: 'Análisis técnico',
  duration: 'Duración',
  only: 'Sólo',
} as const

export function assignmentDescription(assigneeName: string | null | undefined) {
  return assigneeName
    ? `${assigneeName} asumió la responsabilidad operativa del caso.`
    : 'El ticket permanece disponible para asignación.'
}
