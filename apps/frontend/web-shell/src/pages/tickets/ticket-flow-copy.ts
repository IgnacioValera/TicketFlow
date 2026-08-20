export const TICKET_FLOW_COPY = {
  conversation: 'Conversación',
  timeline: 'Cronología',
  assignment: 'Asignación',
  attention: 'Atención',
  technicalAnalysis: 'Análisis técnico',
  duration: 'Duración',
  only: 'Sólo',
  loadingHistory: 'Cargando historial…',
  errorHistory: 'No se pudo cargar el historial del ticket.',
  emptyEvents: 'Este ticket todavía no tiene eventos registrados.',
  selectTicket: 'Selecciona un ticket para consultar su flujo.',
  searchTicket: 'Buscar por folio o título...',
  noSearchResults: 'Ningún ticket coincide con la búsqueda.',
  noFilterResults: 'No hay tickets que coincidan con este filtro.',
  viewAll: 'Ver todos',
  statusFilter: 'Estado',
  eventType: 'Tipo de evento',
  currentState: 'Estado actual',
  goToCurrent: 'Ir al estado actual',
  fitView: 'Ajustar vista',
} as const

export function assignmentDescription(assigneeName: string | null | undefined) {
  return assigneeName
    ? `${assigneeName} asumió la responsabilidad operativa del caso.`
    : 'El ticket permanece disponible para asignación.'
}
