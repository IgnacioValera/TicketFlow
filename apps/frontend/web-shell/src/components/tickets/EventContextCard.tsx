import { AppIcon, type AppIconName } from '@/components/common/AppIcon'
import type { EventContextModel, EventContextVariant } from '@/utils/ticket-event-context'
import { displayValue, formatFlowDate, formatFlowTime } from '@/utils/ticket-flow'

const VARIANT_UI: Record<
  EventContextVariant,
  { wrap: string; icon: AppIconName; iconClass: string; iconLabel: string }
> = {
  resolve: {
    wrap: 'border-l-4 border-l-success bg-success/10',
    icon: 'message-square',
    iconClass: 'text-success',
    iconLabel: 'Motivo escrito por un usuario',
  },
  close: {
    wrap: 'border-l-4 border-l-success bg-success/10',
    icon: 'message-square',
    iconClass: 'text-success',
    iconLabel: 'Motivo escrito por un usuario',
  },
  escalate: {
    wrap: 'border-l-4 border-l-warning bg-warning/10',
    icon: 'message-square',
    iconClass: 'text-warning',
    iconLabel: 'Motivo escrito por un usuario',
  },
  reopen: {
    wrap: 'border-l-4 border-l-primary bg-primary/10',
    icon: 'message-square',
    iconClass: 'text-primary',
    iconLabel: 'Motivo escrito por un usuario',
  },
  waiting: {
    wrap: 'border-l-4 border-l-warning bg-warning/10',
    icon: 'message-square',
    iconClass: 'text-warning',
    iconLabel: 'Motivo escrito por un usuario',
  },
  cancel: {
    wrap: 'border-l-4 border-l-slate-400 bg-slate-50',
    icon: 'message-square',
    iconClass: 'text-slate-600',
    iconLabel: 'Motivo escrito por un usuario',
  },
  status: {
    wrap: 'border-l-4 border-l-primary bg-primary/10',
    icon: 'message-square',
    iconClass: 'text-primary',
    iconLabel: 'Motivo escrito por un usuario',
  },
  ai: {
    wrap: 'border-l-4 border-l-primary bg-primary/10',
    icon: 'sparkles',
    iconClass: 'text-primary',
    iconLabel: 'Asignación automática',
  },
  manual: {
    wrap: 'border-l-4 border-l-slate-400 bg-slate-50',
    icon: 'user-check',
    iconClass: 'text-slate-600',
    iconLabel: 'Asignación manual',
  },
}

export function EventContextPreviewBadge({ automatic = false }: { automatic?: boolean }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
      {automatic ? 'Asignación por IA' : 'Incluye motivo'}
    </span>
  )
}

export function EventContextPreviewText({ text }: { text: string }) {
  return (
    <p className="mt-1 line-clamp-2 min-w-0 overflow-hidden break-words text-[11px] leading-4 text-text [overflow-wrap:anywhere]">
      {text}
    </p>
  )
}

export function EventContextCard({
  context,
  density = 'full',
}: {
  context: EventContextModel
  density?: 'full' | 'preview'
}) {
  if (!context.show || (density === 'preview' && !context.showPreview && !context.automatic)) return null
  if (density === 'preview' && !context.showPreview && !context.body) return null

  const ui = VARIANT_UI[context.variant]
  const when =
    context.occurredAt != null
      ? `${formatFlowDate(context.occurredAt)} · ${formatFlowTime(context.occurredAt)}`
      : displayValue(null)

  if (density === 'preview') {
    return (
      <div className="mt-1 min-w-0">
        <EventContextPreviewBadge automatic={context.automatic && context.variant === 'ai'} />
        {context.showPreview || context.body ? <EventContextPreviewText text={context.body} /> : null}
      </div>
    )
  }

  return (
    <article className={`min-w-0 overflow-hidden rounded-lg p-3 ${ui.wrap}`}>
      <div className="flex min-w-0 items-start gap-2">
        <span className={`mt-0.5 shrink-0 ${ui.iconClass}`} title={ui.iconLabel}>
          <AppIcon name={ui.icon} className="h-4 w-4" />
          <span className="sr-only">{ui.iconLabel}</span>
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-brand-navy">{context.title}</h4>
          {context.automatic ? (
            <p className="mt-0.5 text-[11px] font-medium text-primary">Decisión automática</p>
          ) : null}
          {context.assigneeName ? (
            <p className="mt-1 text-xs text-text [overflow-wrap:anywhere]">
              Agente seleccionado: <strong>{context.assigneeName}</strong>
            </p>
          ) : null}
          {context.body ? (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-text [overflow-wrap:anywhere]">
              {context.body}
            </p>
          ) : null}
          {context.factors.length > 0 ? (
            <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-text">
              {context.factors.map((factor) => (
                <li key={factor} className="[overflow-wrap:anywhere]">
                  {factor}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-2 text-[11px] text-muted [overflow-wrap:anywhere]">
            {displayValue(context.actorName)} · {when}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">{context.actionLabel}</p>
        </div>
      </div>
    </article>
  )
}
