import { useCallback, useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppIcon } from '@/components/common/AppIcon'
import { OpportunityStageBadge } from '@/components/common/CrmBadge'
import { DataTable, type Column } from '@/components/common/DataTable'
import { FormField } from '@/components/common/FormField'
import { Modal } from '@/components/common/Modal'
import { PageHeader } from '@/components/common/PageHeader'
import { PrimaryButton, SecondaryButton, SelectInput, TextArea, TextInput } from '@/components/common/UiControls'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import * as crm from '@/services/crm.service'
import type { CrmClient, CrmOpportunity, OpportunityStage } from '@/types/crm.types'
import { PROBABILITY_BY_STAGE } from '@/types/crm.types'
import { formatDate, formatMoney, getOpportunityStageLabel, OPPORTUNITY_STAGE_LABELS } from '@/utils/labels'

const STAGES: OpportunityStage[] = ['NEW', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']
const EMPTY_FORM = {
  clientId: '',
  title: '',
  amount: '0',
  stage: 'NEW' as OpportunityStage,
  probability: '10',
  expectedCloseDate: '',
  notes: '',
}

export function OpportunitiesPage() {
  const { hasPermission } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<CrmOpportunity[]>([])
  const [clients, setClients] = useState<CrmClient[]>([])
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [lostFor, setLostFor] = useState<CrmOpportunity | null>(null)
  const [lostReason, setLostReason] = useState('')
  const [copyUrl, setCopyUrl] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<OpportunityStage | null>(null)

  useEffect(() => {
    if (searchParams.get('nuevo') !== '1') return
    setOpen(true)
    const next = new URLSearchParams(searchParams)
    next.delete('nuevo')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const load = useCallback(async () => {
    const response = await crm.getOpportunities({ page: 1, perPage: 100, stage: stageFilter || undefined })
    setItems(response.data)
  }, [stageFilter])
  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => {
    void crm.getClients({ perPage: 100 }).then((response) => setClients(response.data))
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return items
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.clientName.toLowerCase().includes(term) ||
        (item.ownerName ?? '').toLowerCase().includes(term),
    )
  }, [items, search])

  const canMove = hasPermission(PERMISSIONS.CRM_OPPORTUNITY_MOVE)

  const move = async (id: string, stage: OpportunityStage, extra?: { lostReason?: string }) => {
    const updated = await crm.changeStage(id, { stage, ...extra })
    if (updated.invitations?.length) setCopyUrl(updated.invitations[0].url)
    await load()
  }

  const onDrop = async (event: DragEvent<HTMLElement>, stage: OpportunityStage) => {
    event.preventDefault()
    setOverStage(null)
    setDraggingId(null)
    const id = event.dataTransfer.getData('text/plain')
    const current = items.find((item) => item.id === id)
    if (!current || current.stage === stage || !canMove) return
    if (stage === 'LOST') {
      setLostFor(current)
      return
    }
    await move(id, stage)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    await crm.createOpportunity({
      clientId: form.clientId,
      title: form.title,
      amount: Number(form.amount),
      stage: form.stage,
      probability: Number(form.probability),
      expectedCloseDate: form.expectedCloseDate || undefined,
      notes: form.notes || undefined,
    })
    setOpen(false)
    setForm(EMPTY_FORM)
    await load()
  }

  const columns: Column<CrmOpportunity>[] = useMemo(
    () => [
      { key: 'title', header: 'Oportunidad', render: (row) => <span className="font-medium">{row.title}</span> },
      { key: 'clientName', header: 'Cliente' },
      { key: 'amount', header: 'Importe', render: (row) => formatMoney(row.amount, row.currency) },
      { key: 'stage', header: 'Etapa', render: (row) => <OpportunityStageBadge stage={row.stage} /> },
      { key: 'probability', header: 'Probabilidad', render: (row) => `${row.probability}%` },
      { key: 'ownerName', header: 'Responsable', render: (row) => row.ownerName || '—' },
      { key: 'expectedCloseDate', header: 'Cierre estimado', render: (row) => formatDate(row.expectedCloseDate) },
    ],
    [],
  )

  return (
    <div className="space-y-4">
      <PageHeader
        kicker="CRM"
        title="Oportunidades"
        description="Embudo de ventas: sigue cada oportunidad desde nueva hasta ganada o perdida."
        actions={
          hasPermission(PERMISSIONS.CRM_OPPORTUNITY_CREATE) ? (
            <PrimaryButton onClick={() => setOpen(true)}>+ Nueva oportunidad</PrimaryButton>
          ) : undefined
        }
      />
      {copyUrl && (
        <div className="flex flex-wrap items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm">
          Enlace de encuesta:
          <code className="max-w-md truncate text-xs">{copyUrl}</code>
          <SecondaryButton onClick={() => void navigator.clipboard.writeText(copyUrl)}>Copiar</SecondaryButton>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <TextInput
          className="max-w-xs"
          placeholder="Buscar oportunidades..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SelectInput className="w-44" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
          <option value="">Todas las etapas</option>
          {STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {OPPORTUNITY_STAGE_LABELS[stage]}
            </option>
          ))}
        </SelectInput>
        <div className="ml-auto flex rounded border border-slate-300 bg-white p-0.5">
          <button
            type="button"
            className={`rounded px-3 py-1.5 text-sm ${view === 'list' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            onClick={() => setView('list')}
          >
            Lista
          </button>
          <button
            type="button"
            className={`rounded px-3 py-1.5 text-sm ${view === 'kanban' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            onClick={() => setView('kanban')}
          >
            Kanban
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(row) => row.id}
          emptyMessage="No hay oportunidades"
          emptyDescription="No hay oportunidades que coincidan con los filtros."
        />
      ) : (
        <div className="-mx-1 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3 px-1">
            {STAGES.map((stage) => {
              const columnItems = filtered.filter((item) => item.stage === stage)
              const total = columnItems.reduce((sum, item) => sum + item.amount, 0)
              const isTarget = overStage === stage
              return (
                <section
                  key={stage}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setOverStage(stage)
                  }}
                  onDragLeave={() => setOverStage((current) => (current === stage ? null : current))}
                  onDrop={(e) => void onDrop(e, stage)}
                  className={`flex w-72 shrink-0 flex-col rounded border bg-slate-50 ${isTarget ? 'border-brand-teal ring-2 ring-brand-teal/30' : 'border-slate-200'}`}
                >
                  <header className="border-b border-slate-200 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      {getOpportunityStageLabel(stage)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {columnItems.length} · {formatMoney(total)}
                    </p>
                  </header>
                  <div className="flex min-h-48 flex-col gap-2 p-2">
                    {columnItems.length === 0 && (
                      <p className="px-2 py-6 text-center text-xs text-slate-400">Sin oportunidades</p>
                    )}
                    {columnItems.map((item) => (
                      <article
                        key={item.id}
                        draggable={canMove}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', item.id)
                          setDraggingId(item.id)
                        }}
                        onDragEnd={() => {
                          setDraggingId(null)
                          setOverStage(null)
                        }}
                        className={`rounded border border-slate-200 bg-white p-3 text-sm shadow-sm transition ${canMove ? 'hover:border-brand-teal/50 hover:shadow-md' : ''} ${draggingId === item.id ? 'is-dragging opacity-50' : ''}`}
                      >
                        {canMove && (
                          <div className="mb-1 flex items-center gap-1 text-slate-400">
                            <AppIcon name="grip" className="h-3.5 w-3.5" />
                            <span className="text-[10px] uppercase tracking-wide">Arrastrar</span>
                          </div>
                        )}
                        <p className="text-xs text-slate-500">{item.clientName}</p>
                        <p className="font-semibold text-brand-navy">{item.title}</p>
                        <p className="mt-1 text-sm font-medium">{formatMoney(item.amount, item.currency)}</p>
                        <p className="text-xs text-slate-500">
                          {item.probability}% · {item.ownerName || 'Sin responsable'}
                        </p>
                        <p className="text-xs text-slate-400">{formatDate(item.expectedCloseDate)}</p>
                        {item.stage === 'WON' && (
                          <button
                            type="button"
                            className="mt-2 text-xs font-medium text-brand-teal hover:underline"
                            onClick={async () => {
                              const surveys = await crm.getSurveys({ status: 'PUBLISHED' })
                              const survey =
                                surveys.data.find((entry) => entry.trigger === 'OPPORTUNITY_WON') ??
                                surveys.data[0]
                              if (!survey) return
                              const link = await crm.copySurveyLink(item.id, survey.id)
                              setCopyUrl(link.url)
                            }}
                          >
                            Copiar enlace de encuesta
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nueva oportunidad">
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Información general</p>
          <FormField label="Nombre de oportunidad" required>
            <TextInput required value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} />
          </FormField>
          <FormField label="Cliente" required>
            <SelectInput required value={form.clientId} onChange={(e) => setForm((c) => ({ ...c, clientId: e.target.value }))}>
              <option value="">Seleccionar cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Importe" required>
              <TextInput
                required
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))}
              />
            </FormField>
            <FormField label="Etapa">
              <SelectInput
                value={form.stage}
                onChange={(e) => {
                  const stage = e.target.value as OpportunityStage
                  setForm((c) => ({ ...c, stage, probability: String(PROBABILITY_BY_STAGE[stage]) }))
                }}
              >
                {STAGES.filter((stage) => stage !== 'LOST').map((stage) => (
                  <option key={stage} value={stage}>
                    {OPPORTUNITY_STAGE_LABELS[stage]}
                  </option>
                ))}
              </SelectInput>
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Probabilidad">
              <TextInput
                type="number"
                min={0}
                max={100}
                value={form.probability}
                onChange={(e) => setForm((c) => ({ ...c, probability: e.target.value }))}
              />
            </FormField>
            <FormField label="Fecha estimada de cierre">
              <TextInput
                type="date"
                value={form.expectedCloseDate}
                onChange={(e) => setForm((c) => ({ ...c, expectedCloseDate: e.target.value }))}
              />
            </FormField>
          </div>
          <FormField label="Descripción">
            <TextArea value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton onClick={() => setOpen(false)}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit">Guardar</PrimaryButton>
          </div>
        </form>
      </Modal>
      <Modal open={Boolean(lostFor)} onClose={() => setLostFor(null)} title="Motivo de pérdida">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (lostFor)
              void move(lostFor.id, 'LOST', { lostReason }).then(() => {
                setLostFor(null)
                setLostReason('')
              })
          }}
          className="space-y-3"
        >
          <FormField label="Descripción" required>
            <TextArea required value={lostReason} onChange={(e) => setLostReason(e.target.value)} />
          </FormField>
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={() => setLostFor(null)}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit">Marcar perdida</PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
