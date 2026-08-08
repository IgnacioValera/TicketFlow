import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppIcon, type AppIconName } from '@/components/common/AppIcon'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import * as ticketService from '@/services/ticket.service'
import type {
  Ticket,
  TicketSlaStatus,
  TicketStatus,
  TicketStatusHistory,
} from '@/types/ticket.types'

type StageState = 'completed' | 'active' | 'pending' | 'optional' | 'cancelled'
type ViewMode = 'map' | 'timeline'

interface Stage {
  id: string
  lane: 'main' | 'alternate'
  eyebrow: string
  title: string
  subtitle: string
  time: string
  actor: string
  state: StageState
  icon: AppIconName
  description: string
  technicalEvent: string
  businessRule: string
  source: string
  duration: string
}

const stagePosition: Record<string, string> = {
  received: 'left-[28px] top-[230px]',
  classified: 'left-[230px] top-[230px]',
  sla: 'left-[432px] top-[230px]',
  assigned: 'left-[634px] top-[230px]',
  diagnosis: 'left-[836px] top-[230px]',
  waiting: 'left-[1038px] top-[405px]',
  escalated: 'left-[1240px] top-[405px]',
  resolved: 'left-[1240px] top-[135px]',
  validation: 'left-[1442px] top-[135px]',
  closed: 'left-[1644px] top-[135px]',
  survey: 'left-[1846px] top-[135px]',
}

const statusRank: Record<TicketStatus, number> = {
  OPEN: 2,
  ASSIGNED: 4,
  IN_PROGRESS: 5,
  WAITING_USER: 5,
  ESCALATED: 5,
  RESOLVED: 8,
  CLOSED: 10,
  CANCELLED: 10,
}

const statusLabel: Record<TicketStatus, string> = {
  OPEN: 'Ticket abierto',
  ASSIGNED: 'Agente asignado',
  IN_PROGRESS: 'Atención iniciada',
  WAITING_USER: 'Información solicitada',
  ESCALATED: 'Ticket escalado',
  RESOLVED: 'Solución registrada',
  CLOSED: 'Ticket cerrado',
  CANCELLED: 'Ticket cancelado',
}

const stateLabel: Record<StageState, string> = {
  completed: 'Completado',
  active: 'En curso',
  pending: 'Pendiente',
  optional: 'Ruta opcional',
  cancelled: 'Cancelado',
}

const slaColor: Record<TicketSlaStatus['level'], string> = {
  green: '#36a275',
  yellow: '#d6a33a',
  orange: '#d96b52',
  red: '#d4534b',
}

function formatDate(value?: string) {
  if (!value) return 'Pendiente'
  return new Date(value).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(from?: string, to?: string) {
  if (!from || !to) return 'Sin medición'
  const minutes = Math.max(
    0,
    Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000),
  )
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${hours} h${rest ? ` ${rest} min` : ''}`
}

function findHistory(ticket: Ticket, status: TicketStatus) {
  return ticket.statusHistory?.find((item) => item.newStatus === status)
}

function stateByRank(ticket: Ticket, rank: number, exactStatus?: TicketStatus): StageState {
  if (exactStatus && ticket.status === exactStatus) return 'active'
  if (statusRank[ticket.status] > rank || (exactStatus && findHistory(ticket, exactStatus)))
    return 'completed'
  return 'pending'
}

function buildStages(ticket: Ticket, sla: TicketSlaStatus | null): Stage[] {
  const open = findHistory(ticket, 'OPEN')
  const assigned = findHistory(ticket, 'ASSIGNED')
  const progress = findHistory(ticket, 'IN_PROGRESS')
  const waiting = findHistory(ticket, 'WAITING_USER')
  const escalated = findHistory(ticket, 'ESCALATED')
  const resolved = findHistory(ticket, 'RESOLVED')
  const closed = findHistory(ticket, 'CLOSED')
  const cancelled = findHistory(ticket, 'CANCELLED')
  const createdAt = open?.createdAt ?? ticket.createdAt

  return [
    {
      id: 'received',
      lane: 'main',
      eyebrow: 'Entrada',
      title: 'Ticket recibido',
      subtitle: ticket.folio,
      time: formatDate(createdAt),
      actor: open?.changedByName ?? ticket.requesterName,
      state: 'completed',
      icon: 'inbox',
      description:
        'La solicitud ingresó al sistema, recibió un folio único y quedó disponible para seguimiento.',
      technicalEvent: 'TICKET_CREATED',
      businessRule: 'Todo ticket debe tener folio, solicitante y estado inicial OPEN.',
      source: 'Portal de soporte',
      duration: 'Inicio del flujo',
    },
    {
      id: 'classified',
      lane: 'main',
      eyebrow: 'Clasificación',
      title: 'Categoría y prioridad',
      subtitle: `${ticket.categoryName} · ${ticket.priorityName}`,
      time: formatDate(ticket.createdAt),
      actor: 'Motor de reglas',
      state: 'completed',
      icon: 'tag',
      description: `El caso se clasificó dentro de ${ticket.categoryName} y recibió prioridad ${ticket.priorityName.toLowerCase()}.`,
      technicalEvent: 'TICKET_CLASSIFIED',
      businessRule: 'Categoría y prioridad deben pertenecer a catálogos activos.',
      source: 'Reglas de catálogo',
      duration: '< 1 min',
    },
    {
      id: 'sla',
      lane: 'main',
      eyebrow: 'Compromiso',
      title: 'SLA calculado',
      subtitle: `${ticket.resolutionHours} h de resolución`,
      time: formatDate(ticket.slaCreatedAt),
      actor: 'SlaService',
      state: 'completed',
      icon: 'clock',
      description: `Se fijó la fecha límite ${formatDate(ticket.slaDueAt)} conforme a la prioridad del ticket.`,
      technicalEvent: 'SLA_STARTED',
      businessRule: 'El SLA comienza al crear el ticket y usa la política vigente.',
      source: 'Política SLA',
      duration: sla ? `${Math.round(100 - sla.percentRemaining)}% consumido` : 'Calculado',
    },
    {
      id: 'assigned',
      lane: 'main',
      eyebrow: 'Responsabilidad',
      title: 'Asignación',
      subtitle: ticket.assigneeName ?? 'Sin agente',
      time: formatDate(assigned?.createdAt),
      actor: assigned?.changedByName ?? 'Supervisor',
      state: stateByRank(ticket, 4, 'ASSIGNED'),
      icon: 'user-check',
      description: ticket.assigneeName
        ? `${ticket.assigneeName} asumió la responsabilidad operativa del caso.`
        : 'El ticket permanece disponible para asignación.',
      technicalEvent: 'TICKET_ASSIGNED',
      businessRule: 'Sólo supervisor o administrador pueden asignar un agente activo.',
      source: 'Mesa de control',
      duration: formatDuration(createdAt, assigned?.createdAt),
    },
    {
      id: 'diagnosis',
      lane: 'main',
      eyebrow: 'Atención',
      title: 'Diagnóstico',
      subtitle: ticket.status === 'IN_PROGRESS' ? 'Trabajo activo' : 'Análisis técnico',
      time: formatDate(progress?.createdAt),
      actor: progress?.changedByName ?? ticket.assigneeName ?? 'Agente',
      state: stateByRank(ticket, 5, 'IN_PROGRESS'),
      icon: 'tools',
      description:
        'El agente analiza la causa, documenta avances, consulta evidencias y prepara una solución.',
      technicalEvent: 'WORK_STARTED',
      businessRule: 'Sólo el agente asignado puede iniciar y actualizar la atención.',
      source: 'Bandeja del agente',
      duration: formatDuration(assigned?.createdAt, progress?.createdAt),
    },
    {
      id: 'waiting',
      lane: 'alternate',
      eyebrow: 'Ruta alterna',
      title: 'En espera',
      subtitle: waiting ? 'Información solicitada' : 'Si faltan datos',
      time: formatDate(waiting?.createdAt),
      actor: waiting?.changedByName ?? 'Solicitante',
      state: ticket.status === 'WAITING_USER' ? 'active' : waiting ? 'completed' : 'optional',
      icon: 'pause',
      description:
        waiting?.reason ??
        'La atención puede pausarse cuando se requiere información adicional del solicitante.',
      technicalEvent: 'WAITING_USER',
      businessRule: 'Debe registrarse el motivo y conservar el responsable actual.',
      source: 'Conversación del ticket',
      duration: waiting ? formatDuration(waiting.createdAt, progress?.createdAt) : 'No utilizada',
    },
    {
      id: 'escalated',
      lane: 'alternate',
      eyebrow: 'Control',
      title: 'Escalamiento',
      subtitle: escalated ? 'Intervención requerida' : 'Bajo condición',
      time: formatDate(escalated?.createdAt),
      actor: escalated?.changedByName ?? 'Supervisor',
      state: ticket.status === 'ESCALATED' ? 'active' : escalated ? 'completed' : 'optional',
      icon: 'priority',
      description:
        escalated?.reason ??
        'Esta ruta se activa ante riesgo de SLA, severidad o necesidad de otro nivel técnico.',
      technicalEvent: 'TICKET_ESCALATED',
      businessRule: 'El escalamiento exige motivo y debe quedar en el historial.',
      source: 'Agente / Supervisor',
      duration: escalated
        ? formatDuration(progress?.createdAt, escalated.createdAt)
        : 'No utilizada',
    },
    {
      id: 'resolved',
      lane: 'main',
      eyebrow: 'Solución',
      title: 'Resolución',
      subtitle: resolved ? 'Propuesta registrada' : 'Pendiente',
      time: formatDate(resolved?.createdAt),
      actor: resolved?.changedByName ?? ticket.assigneeName ?? 'Agente',
      state: stateByRank(ticket, 8, 'RESOLVED'),
      icon: 'check',
      description:
        resolved?.reason ?? 'El agente documentará la solución, evidencia y resultado esperado.',
      technicalEvent: 'TICKET_RESOLVED',
      businessRule: 'La resolución debe estar documentada antes de solicitar el cierre.',
      source: 'Agente asignado',
      duration: formatDuration(progress?.createdAt, resolved?.createdAt),
    },
    {
      id: 'validation',
      lane: 'main',
      eyebrow: 'Cliente',
      title: 'Validación',
      subtitle:
        ticket.status === 'RESOLVED' ? 'Esperando confirmación' : 'Confirmación de solución',
      time: ticket.status === 'RESOLVED' ? 'Acción requerida' : formatDate(closed?.createdAt),
      actor: ticket.requesterName,
      state: ticket.status === 'RESOLVED' ? 'active' : closed ? 'completed' : 'pending',
      icon: 'profile',
      description:
        'El solicitante comprueba que la solución funciona antes de confirmar el cierre.',
      technicalEvent: 'SOLUTION_VALIDATION',
      businessRule:
        'El solicitante dueño valida; supervisor o administrador pueden cerrar con justificación.',
      source: 'Portal del solicitante',
      duration: formatDuration(resolved?.createdAt, closed?.createdAt),
    },
    {
      id: 'closed',
      lane: 'main',
      eyebrow: 'Finalización',
      title: ticket.status === 'CANCELLED' ? 'Cancelado' : 'Cierre',
      subtitle: closed ? 'Caso finalizado' : cancelled ? 'Flujo interrumpido' : 'Pendiente',
      time: formatDate(closed?.createdAt ?? cancelled?.createdAt ?? ticket.closedAt ?? undefined),
      actor: closed?.changedByName ?? cancelled?.changedByName ?? ticket.requesterName,
      state:
        ticket.status === 'CANCELLED'
          ? 'cancelled'
          : ticket.status === 'CLOSED'
            ? 'completed'
            : 'pending',
      icon: 'flag',
      description:
        cancelled?.reason ??
        (closed
          ? 'El ticket concluyó y sus métricas quedaron congeladas.'
          : 'El cierre formaliza la conclusión del caso.'),
      technicalEvent: ticket.status === 'CANCELLED' ? 'TICKET_CANCELLED' : 'TICKET_CLOSED',
      businessRule: 'Sólo RESOLVED puede pasar a CLOSED, salvo cierre administrativo documentado.',
      source: 'Solicitante / Supervisor',
      duration: formatDuration(createdAt, closed?.createdAt ?? cancelled?.createdAt),
    },
    {
      id: 'survey',
      lane: 'main',
      eyebrow: 'Calidad',
      title: 'Satisfacción',
      subtitle: ticket.survey ? `${ticket.survey.rating}/5 estrellas` : 'Encuesta pendiente',
      time: formatDate(ticket.survey?.submittedAt),
      actor: ticket.requesterName,
      state: ticket.survey ? 'completed' : ticket.status === 'CLOSED' ? 'active' : 'pending',
      icon: 'reports',
      description:
        ticket.survey?.comment ??
        'Después del cierre, el solicitante puede evaluar la calidad de la atención.',
      technicalEvent: 'SURVEY_SUBMITTED',
      businessRule: 'Sólo se permite una encuesta por ticket cerrado, con calificación de 1 a 5.',
      source: 'Encuesta de cierre',
      duration: formatDuration(closed?.createdAt, ticket.survey?.submittedAt),
    },
  ]
}

export function TicketFlowPage() {
  const { id: routeId } = useParams<{ id: string }>()
  const [availableTickets, setAvailableTickets] = useState<Ticket[]>([])
  const [selectedTicketId, setSelectedTicketId] = useState(routeId ?? '')
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [sla, setSla] = useState<TicketSlaStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedStageId, setSelectedStageId] = useState('received')
  const [zoom, setZoom] = useState(0.85)
  const [viewMode, setViewMode] = useState<ViewMode>('map')

  const loadTicket = useCallback(async (ticketId: string) => {
    setLoading(true)
    setError('')
    try {
      const [ticketData, slaData] = await Promise.all([
        ticketService.getTicketById(ticketId),
        ticketService.getTicketSla(ticketId),
      ])
      setTicket(ticketData)
      setSla(slaData)
      const currentStage: Partial<Record<TicketStatus, string>> = {
        OPEN: 'sla',
        ASSIGNED: 'assigned',
        IN_PROGRESS: 'diagnosis',
        WAITING_USER: 'waiting',
        ESCALATED: 'escalated',
        RESOLVED: 'validation',
        CLOSED: ticketData.survey ? 'survey' : 'closed',
        CANCELLED: 'closed',
      }
      setSelectedStageId(currentStage[ticketData.status] ?? 'received')
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'No se pudo cargar el flujo')
    } finally {
      setLoading(false)
    }
  }, [])

  const initialize = useCallback(async () => {
    if (routeId) {
      setSelectedTicketId(routeId)
      await loadTicket(routeId)
      return
    }
    setLoading(true)
    try {
      const response = await ticketService.getTickets({ page: 1, perPage: 50 })
      setAvailableTickets(response.data)
      const firstId = response.data[0]?.id
      if (firstId) {
        setSelectedTicketId(firstId)
        await loadTicket(firstId)
      } else {
        setError('No hay tickets disponibles para visualizar')
        setLoading(false)
      }
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'No se pudieron cargar los tickets')
      setLoading(false)
    }
  }, [loadTicket, routeId])

  useEffect(() => {
    void initialize()
  }, [initialize])

  const stages = useMemo(() => (ticket ? buildStages(ticket, sla) : []), [ticket, sla])
  const selectedStage = stages.find((stage) => stage.id === selectedStageId) ?? stages[0]
  const completedStages = stages.filter((stage) => stage.state === 'completed').length
  const mainStages = stages.filter((stage) => stage.lane === 'main')
  const progressPercent = Math.round(
    (mainStages.filter((stage) => stage.state === 'completed').length / mainStages.length) * 100,
  )
  const consumed = sla ? Math.max(0, Math.min(100, Math.round(100 - sla.percentRemaining))) : 0
  const remainingMs = sla ? new Date(sla.dueAt).getTime() - Date.now() : 0
  const totalElapsed = ticket
    ? formatDuration(ticket.createdAt, ticket.closedAt ?? new Date().toISOString())
    : '--'
  const assignedEvent = ticket ? findHistory(ticket, 'ASSIGNED') : undefined
  const responseTime = ticket ? formatDuration(ticket.createdAt, assignedEvent?.createdAt) : '--'
  const history = [...(ticket?.statusHistory ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )

  const handleTicketChange = async (ticketId: string) => {
    setSelectedTicketId(ticketId)
    await loadTicket(ticketId)
  }

  const setSafeZoom = (next: number) => setZoom(Math.min(1.1, Math.max(0.65, next)))

  if (loading && !ticket) return <LoadingSkeleton rows={8} />
  if (error && !ticket) return <ErrorState message={error} onRetry={() => void initialize()} />
  if (!ticket || !selectedStage) return <ErrorState message="Ticket no encontrado" />

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c8191]">
            Operación / Seguimiento
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">Flujo visual</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#756b7b]">
            Radiografía completa del ticket: decisiones, responsables, reglas, tiempos y rutas
            alternativas.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {!routeId && (
            <label className="min-w-[320px]">
              <span className="sr-only">Seleccionar ticket</span>
              <select
                value={selectedTicketId}
                onChange={(event) => void handleTicketChange(event.target.value)}
                className="w-full rounded-xl border border-[#d9d1dd] bg-white px-3.5 py-2.5 text-sm font-semibold shadow-sm"
              >
                {availableTickets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.folio} · {item.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={() => void loadTicket(ticket.id)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6f4fd8] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_22px_rgba(111,79,216,.22)] hover:bg-[#6040c8]"
          >
            <AppIcon name="refresh" className="h-4 w-4" />
            Actualizar
          </button>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-[22px] border border-[#ded7e2] bg-[#302938] p-5 text-white shadow-[0_16px_45px_rgba(48,41,56,.14)] md:p-6">
        <div className="absolute -right-12 -top-20 h-56 w-56 rounded-full bg-[#7d5ce1]/25 blur-3xl" />
        <div className="relative grid gap-5 xl:grid-cols-[1fr_auto]">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[#7654dc] shadow-lg">
              <AppIcon name="flow" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-[#d9cdfb]">{ticket.folio}</span>
                <StatusBadge status={ticket.status} className="bg-white/10 text-white" />
                <span className="rounded-full bg-[#d96b52]/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#ffb6a6]">
                  {ticket.priorityName}
                </span>
              </div>
              <h2 className="mt-2 truncate text-xl font-bold">{ticket.title}</h2>
              <p className="mt-1 text-sm text-white/55">
                {ticket.requesterName} · {ticket.assigneeName ?? 'Sin agente'} ·{' '}
                {ticket.categoryName}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[520px]">
            <DarkMetric label="Avance" value={`${progressPercent}%`} />
            <DarkMetric label="Tiempo total" value={totalElapsed} />
            <DarkMetric label="1ª asignación" value={responseTime} />
            <DarkMetric label="Eventos" value={String(ticket.statusHistory?.length ?? 0)} />
          </div>
        </div>
        <div className="relative mt-5 flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:items-center">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#8b6be5] via-[#d96b52] to-[#e8b14e]"
              style={{ width: `${Math.max(4, progressPercent)}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-white/55">
            {completedStages} etapas registradas
          </span>
          {sla && (
            <span className="text-xs font-bold" style={{ color: slaColor[sla.level] }}>
              SLA {remainingMs > 0 ? `${Math.floor(remainingMs / 3600000)} h restantes` : 'vencido'}
            </span>
          )}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard
          icon="clock"
          label="SLA consumido"
          value={`${consumed}%`}
          detail={sla ? `Límite ${formatDate(sla.dueAt)}` : 'Sin política'}
          tone={sla ? slaColor[sla.level] : '#7d5ce1'}
        />
        <InsightCard
          icon="users"
          label="Participantes"
          value={String(
            new Set(
              [
                ticket.requesterId,
                ticket.assigneeId,
                ...(ticket.comments?.map((comment) => comment.userId) ?? []),
              ].filter(Boolean),
            ).size,
          )}
          detail="Solicitante, agente y equipo"
          tone="#6f4fd8"
        />
        <InsightCard
          icon="mail"
          label="Conversación"
          value={String(ticket.comments?.length ?? 0)}
          detail={`${ticket.comments?.filter((comment) => comment.isInternal).length ?? 0} comentarios internos`}
          tone="#d96b52"
        />
        <InsightCard
          icon="inbox"
          label="Evidencias"
          value={String(ticket.attachments?.length ?? 0)}
          detail="Archivos adjuntos al caso"
          tone="#45a77e"
        />
      </section>

      <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-2xl border border-[#e2dce5] bg-white shadow-[0_14px_40px_rgba(61,45,69,.06)]">
          <div className="flex flex-col gap-3 border-b border-[#e7e1e9] bg-[#fffdfb] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#d96b52] shadow-[0_0_0_5px_rgba(217,107,82,.1)]" />
              <div>
                <p className="text-sm font-bold">Recorrido operativo</p>
                <p className="text-[11px] text-[#847a8a]">
                  La línea superior es el camino principal; la inferior concentra excepciones.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg bg-[#f2eef4] p-1">
                <ModeButton
                  active={viewMode === 'map'}
                  label="Mapa"
                  onClick={() => setViewMode('map')}
                />
                <ModeButton
                  active={viewMode === 'timeline'}
                  label="Cronología"
                  onClick={() => setViewMode('timeline')}
                />
              </div>
              {viewMode === 'map' && (
                <div className="flex items-center gap-1 rounded-lg border border-[#ddd6e1] bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setSafeZoom(zoom - 0.1)}
                    className="grid h-7 w-7 place-items-center rounded-md text-lg hover:bg-[#f2eef4]"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(0.85)}
                    className="min-w-12 rounded-md px-1 py-1 text-[11px] font-bold hover:bg-[#f2eef4]"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setSafeZoom(zoom + 0.1)}
                    className="grid h-7 w-7 place-items-center rounded-md text-lg hover:bg-[#f2eef4]"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>

          {viewMode === 'map' ? (
            <div className="ticket-flow-canvas h-[680px] overflow-auto">
              <div
                className="relative h-[650px] w-[2050px] origin-top-left transition-transform"
                style={{ transform: `scale(${zoom})` }}
              >
                <FlowConnections />
                <div className="absolute left-[26px] top-[175px] rounded-full bg-[#eee9fb] px-3 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#6f4fd8]">
                  Ruta principal
                </div>
                <div className="absolute left-[1036px] top-[350px] rounded-full bg-[#fff2dd] px-3 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#9b6c1c]">
                  Excepciones
                </div>
                {stages.map((stage) => (
                  <FlowNode
                    key={stage.id}
                    stage={stage}
                    selected={stage.id === selectedStageId}
                    className={stagePosition[stage.id]}
                    onSelect={() => setSelectedStageId(stage.id)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <TimelineView
              stages={stages}
              selectedId={selectedStageId}
              onSelect={setSelectedStageId}
            />
          )}
        </section>

        <aside className="space-y-4">
          <Inspector stage={selectedStage} />
          <section className="rounded-2xl border border-[#e2dce5] bg-[#fffdfb] p-5 shadow-[0_10px_30px_rgba(61,45,69,.05)]">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Historial real</h3>
              <Link to={`/tickets/${ticket.id}`} className="text-xs font-bold text-[#6f4fd8]">
                Abrir ticket
              </Link>
            </div>
            <ol className="mt-4 max-h-[360px] space-y-4 overflow-y-auto pr-1">
              {history.length ? (
                history.map((item) => <Activity key={item.id} item={item} />)
              ) : (
                <li className="text-sm text-[#817788]">Sin eventos registrados.</li>
              )}
            </ol>
          </section>
          <section className="rounded-2xl border border-[#ead8c1] bg-[#fff9ef] p-5">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#9a732b]">
              Siguiente acción
            </p>
            <p className="mt-2 text-sm font-bold text-[#4b4031]">{nextAction[ticket.status]}</p>
            <p className="mt-1 text-xs leading-5 text-[#82715a]">
              La acción depende del estado actual y de los permisos del usuario.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}

const nextAction: Record<TicketStatus, string> = {
  OPEN: 'Asignar un agente responsable',
  ASSIGNED: 'Iniciar el diagnóstico técnico',
  IN_PROGRESS: 'Documentar avances o registrar solución',
  WAITING_USER: 'Esperar respuesta del solicitante',
  ESCALATED: 'Intervención y decisión del supervisor',
  RESOLVED: 'Solicitante debe validar la solución',
  CLOSED: 'Responder o revisar la encuesta',
  CANCELLED: 'Revisar el motivo de cancelación',
}

function FlowConnections() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 2050 650"
      fill="none"
    >
      <defs>
        <marker
          id="detailed-arrow"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path d="M0 0L8 4L0 8Z" fill="#9d90a5" />
        </marker>
      </defs>
      <path
        d="M203 287H230 M405 287H432 M607 287H634 M809 287H836"
        stroke="#6f4fd8"
        strokeWidth="2"
        strokeDasharray="7 6"
        markerEnd="url(#detailed-arrow)"
        className="ticket-flow-line-active"
      />
      <path
        d="M1011 287C1090 287 1160 192 1240 192 M1415 192H1442 M1617 192H1644 M1819 192H1846"
        stroke="#aaa0af"
        strokeWidth="2"
        markerEnd="url(#detailed-arrow)"
      />
      <path
        d="M1011 287C1025 287 1024 462 1038 462 M1213 462H1240 M1415 462C1465 462 1185 245 1240 245"
        stroke="#c59a49"
        strokeWidth="2"
        strokeDasharray="6 7"
        markerEnd="url(#detailed-arrow)"
      />
      <circle cx="1011" cy="287" r="5" fill="#fff" stroke="#d96b52" strokeWidth="2" />
      <text x="1030" y="305" fill="#8c8191" fontSize="10" fontWeight="600">
        ¿continúa normalmente?
      </text>
    </svg>
  )
}

function FlowNode({
  stage,
  selected,
  className,
  onSelect,
}: {
  stage: Stage
  selected: boolean
  className: string
  onSelect: () => void
}) {
  const tone: Record<StageState, string> = {
    completed: 'border-[#a995e3] bg-white',
    active: 'ticket-flow-node-active border-[#d96b52] bg-[#fffaf7]',
    pending: 'border-[#d9d2dd] bg-[#fffdfb]',
    optional: 'border-[#d8c9a9] bg-[#fffcf4]',
    cancelled: 'border-[#e5a8a1] bg-[#fff6f4]',
  }
  const iconTone: Record<StageState, string> = {
    completed: 'bg-[#eee9fb] text-[#6f4fd8]',
    active: 'bg-[#fff0e8] text-[#d35f47]',
    pending: 'bg-[#f0edf1] text-[#948a99]',
    optional: 'bg-[#faf0d8] text-[#a67822]',
    cancelled: 'bg-[#fee9e5] text-[#c55249]',
  }
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`absolute w-[175px] rounded-xl border text-left shadow-[0_8px_22px_rgba(65,48,73,.08)] transition hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(65,48,73,.13)] ${tone[stage.state]} ${selected ? 'ring-2 ring-[#6f4fd8]/30' : ''} ${className}`}
    >
      <span className="absolute -left-[5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-white bg-[#9d90a5]" />
      <span className="absolute -right-[5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-white bg-[#9d90a5]" />
      <div className="border-b border-[#eee8ef] p-3">
        <span className="mb-2 block text-[9px] font-bold uppercase tracking-[.13em] text-[#978c9b]">
          {stage.eyebrow}
        </span>
        <div className="flex items-center gap-2.5">
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${iconTone[stage.state]}`}
          >
            <AppIcon name={stage.icon} className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{stage.title}</span>
            <span className="block truncate text-[10px] text-[#867c8c]">{stage.subtitle}</span>
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-[10px]">
        <span className="truncate font-semibold text-[#716677]">{stage.actor}</span>
        <span className={stage.state === 'active' ? 'font-bold text-[#d35f47]' : 'text-[#998f9d]'}>
          {stage.time}
        </span>
      </div>
    </button>
  )
}

function Inspector({ stage }: { stage: Stage }) {
  return (
    <section className="rounded-2xl border border-[#e2dce5] bg-[#fffdfb] p-5 shadow-[0_10px_30px_rgba(61,45,69,.05)]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#887d8e]">
          Inspector de etapa
        </p>
        <span
          className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${stage.state === 'active' ? 'bg-[#fff0e8] text-[#c9563f]' : stage.state === 'completed' ? 'bg-[#eee9fb] text-[#6244c0]' : 'bg-[#f0edf1] text-[#817787]'}`}
        >
          {stateLabel[stage.state]}
        </span>
      </div>
      <div className="mt-5 flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f0ebfc] text-[#6f4fd8]">
          <AppIcon name={stage.icon} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#968b9a]">
            {stage.eyebrow}
          </p>
          <h3 className="font-bold">{stage.title}</h3>
          <p className="text-xs text-[#807687]">{stage.subtitle}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#625968]">{stage.description}</p>
      <dl className="mt-5 space-y-3 border-t border-[#ebe5ed] pt-4 text-sm">
        <Meta label="Responsable" value={stage.actor} />
        <Meta label="Registro" value={stage.time} />
        <Meta label="Duración" value={stage.duration} />
        <Meta label="Origen" value={stage.source} />
      </dl>
      <div className="mt-4 rounded-xl bg-[#f5f1f7] p-3">
        <p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#8c8191]">
          Evento técnico
        </p>
        <code className="mt-1 block text-xs font-bold text-[#6244c0]">{stage.technicalEvent}</code>
      </div>
      <div className="mt-3 rounded-xl border border-[#ebe4ed] p-3">
        <p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#8c8191]">
          Regla de negocio
        </p>
        <p className="mt-1 text-xs leading-5 text-[#6e6474]">{stage.businessRule}</p>
      </div>
    </section>
  )
}

function TimelineView({
  stages,
  selectedId,
  onSelect,
}: {
  stages: Stage[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="max-h-[680px] overflow-y-auto bg-[#faf8f5] p-5 md:p-7">
      <div className="mx-auto max-w-3xl space-y-3">
        {stages.map((stage, index) => (
          <button
            type="button"
            key={stage.id}
            onClick={() => onSelect(stage.id)}
            className={`relative grid w-full gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm sm:grid-cols-[52px_1fr_auto] ${selectedId === stage.id ? 'border-[#8c70df] ring-2 ring-[#6f4fd8]/15' : 'border-[#e4dde7]'}`}
          >
            <div
              className={`grid h-11 w-11 place-items-center rounded-xl ${stage.state === 'completed' ? 'bg-[#eee9fb] text-[#6f4fd8]' : stage.state === 'active' ? 'bg-[#fff0e8] text-[#d35f47]' : 'bg-[#f0edf1] text-[#948a99]'}`}
            >
              <AppIcon name={stage.icon} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-[#9a8fa0]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="font-bold">{stage.title}</h3>
                <span className="rounded-full bg-[#f3eff5] px-2 py-0.5 text-[9px] font-bold uppercase text-[#776d7d]">
                  {stateLabel[stage.state]}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#857b8b]">{stage.description}</p>
              <p className="mt-2 text-[11px] font-semibold text-[#655a6b]">
                {stage.actor} · {stage.technicalEvent}
              </p>
            </div>
            <div className="text-right text-xs">
              <p className="font-bold text-[#63586a]">{stage.time}</p>
              <p className="mt-1 text-[#998f9d]">{stage.duration}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function Activity({ item }: { item: TicketStatusHistory }) {
  return (
    <li className="grid grid-cols-[52px_1fr] gap-3">
      <span className="pt-0.5 text-[10px] font-semibold text-[#948a99]">
        {new Date(item.createdAt).toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
      <div className="relative border-l border-[#ded6e2] pl-4">
        <span className="absolute -left-[4.5px] top-1 h-2 w-2 rounded-full bg-[#6f4fd8] ring-4 ring-[#fffdfb]" />
        <p className="text-sm font-semibold">{statusLabel[item.newStatus]}</p>
        <p className="mt-0.5 text-xs leading-5 text-[#817788]">
          {item.changedByName}
          {item.reason ? ` · ${item.reason}` : ''}
        </p>
      </div>
    </li>
  )
}

function DarkMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-[9px] font-bold uppercase tracking-[.12em] text-white/40">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-white/85">{value}</p>
    </div>
  )
}
function InsightCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: AppIconName
  label: string
  value: string
  detail: string
  tone: string
}) {
  return (
    <article className="rounded-2xl border border-[#e2dce5] bg-white p-4 shadow-[0_8px_25px_rgba(61,45,69,.04)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#918694]">{label}</p>
          <p className="mt-2 text-2xl font-extrabold" style={{ color: tone }}>
            {value}
          </p>
        </div>
        <span
          className="grid h-9 w-9 place-items-center rounded-xl"
          style={{ backgroundColor: `${tone}18`, color: tone }}
        >
          <AppIcon name={icon} className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-[11px] text-[#887d8e]">{detail}</p>
    </article>
  )
}
function ModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-[11px] font-bold ${active ? 'bg-white text-[#6244c0] shadow-sm' : 'text-[#7f7585]'}`}
    >
      {label}
    </button>
  )
}
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[#8a808f]">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  )
}
