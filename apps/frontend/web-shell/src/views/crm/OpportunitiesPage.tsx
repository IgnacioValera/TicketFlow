import { useAppSearchParams } from '@/hooks/useAppSearchParams'
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { AppIcon } from '@/components/common/AppIcon'
import { OpportunityStageBadge } from '@/components/common/CrmBadge'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ConfirmToast } from '@/components/common/FeedbackAlert'
import { ErrorState } from '@/components/common/ErrorState'
import { FormField } from '@/components/common/FormField'
import { Modal } from '@/components/common/Modal'
import { TableActionButton } from '@/components/common/TableActionButton'
import { SearchableSelect } from '@/components/common/SearchableSelect'
import { PrimaryButton, SecondaryButton, SelectInput, TextArea, TextInput } from '@/components/common/UiControls'
import { OpportunitySurveyCard } from '@/components/crm/OpportunitySurveyCard'
import { SurveyInvitationModal } from '@/components/crm/SurveyInvitationModal'
import { PERMISSIONS } from '@/constants/permissions'
import { LIMITS } from '@/constants/validation'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import * as crm from '@/services/crm.service'
import type { CrmClient, CrmContact, CrmOpportunity, CrmSurvey, OpportunityStage } from '@/types/crm.types'
import { PROBABILITY_BY_STAGE } from '@/types/crm.types'
import { getErrorMessages } from '@/utils/errors'
import { invitationRequestSurveyId, type CreatedSurveyInvitation, type SurveyInvitationCard } from '@/utils/opportunity-survey'
import {
  ALL_STAGES,
  EMPTY_OPPORTUNITY_FORM,
  buildOpportunityPayload,
  formFromOpportunity,
  formatAmountInput,
  mapOpportunityApiError,
  opportunityStatus,
  summarizeOpportunities,
  validateLostReason,
  validateOpportunityForm,
  validateReopenReason,
  type OpportunityFormErrors,
  type OpportunityFormValues,
} from '@/utils/opportunity-form'
import {
  formatDate,
  formatMoney,
  getOpportunityStageLabel,
  getOpportunityStatusLabel,
  OPPORTUNITY_STAGE_LABELS,
  OPPORTUNITY_STATUS_LABELS,
} from '@/utils/labels'

export function OpportunitiesPage() {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const [searchParams, setSearchParams] = useAppSearchParams()
  const [items, setItems] = useState<CrmOpportunity[]>([])
  const [clients, setClients] = useState<CrmClient[]>([])
  const [contacts, setContacts] = useState<CrmContact[]>([])
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [meta, setMeta] = useState({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CrmOpportunity | null>(null)
  const [lostFor, setLostFor] = useState<{ item: CrmOpportunity; stage: OpportunityStage } | null>(null)
  const [reopenFor, setReopenFor] = useState<{ item: CrmOpportunity; stage: OpportunityStage } | null>(null)
  const [lostReason, setLostReason] = useState('')
  const [reopenReason, setReopenReason] = useState('')
  const [createdInvitation, setCreatedInvitation] = useState<CreatedSurveyInvitation | null>(null)
  const [detail, setDetail] = useState<CrmOpportunity | null>(null)
  const [manualSurveys, setManualSurveys] = useState<CrmSurvey[]>([])
  const [selectedManualId, setSelectedManualId] = useState('')
  const [generating, setGenerating] = useState(false)
  const movingRef = useRef(false)
  const savingRef = useRef(false)
  const [form, setForm] = useState<OpportunityFormValues>(EMPTY_OPPORTUNITY_FORM)
  const [fieldErrors, setFieldErrors] = useState<OpportunityFormErrors>({})
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<OpportunityStage | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null)

  const canCreate = hasPermission(PERMISSIONS.CRM_OPPORTUNITY_CREATE)
  const canEdit = hasPermission(PERMISSIONS.CRM_OPPORTUNITY_EDIT)
  const canMove = hasPermission(PERMISSIONS.CRM_OPPORTUNITY_MOVE)

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 6000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const load = useCallback(async () => {
    try {
      const response = await crm.getOpportunities({
        page: view === 'kanban' ? 1 : page,
        perPage: view === 'kanban' ? 100 : perPage,
        search: search || undefined,
        stage: stageFilter || undefined,
        status: statusFilter || undefined,
        clientId: clientFilter || undefined,
        ownerId: ownerFilter || undefined,
      })
      setItems(response.data)
      if (response.meta) setMeta(response.meta)
      setError('')
    } catch (err: unknown) {
      setError(getErrorMessages(err, 'No se pudo cargar la información.')[0])
    }
  }, [view, page, perPage, search, stageFilter, statusFilter, clientFilter, ownerFilter])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void crm.getClients({ perPage: 100 }).then((response) => setClients(response.data))
  }, [])

  useEffect(() => {
    if (!form.clientId) {
      setContacts([])
      return
    }
    void crm.getContacts({ clientId: form.clientId, perPage: 100 }).then((response) => setContacts(response.data))
  }, [form.clientId])

  const resetForm = () => {
    setOpen(false)
    setEditing(null)
    setForm({ ...EMPTY_OPPORTUNITY_FORM, ownerId: user?.id ?? '' })
    setFieldErrors({})
  }

  const openCreate = (clientId = '') => {
    setEditing(null)
    setForm({ ...EMPTY_OPPORTUNITY_FORM, clientId, ownerId: user?.id ?? '' })
    setFieldErrors({})
    setOpen(true)
  }

  const openEdit = (item: CrmOpportunity) => {
    setEditing(item)
    setForm(formFromOpportunity(item))
    setFieldErrors({})
    setOpen(true)
  }

  const openDetail = async (item: CrmOpportunity) => {
    const fresh = await crm.getOpportunity(item.id)
    setDetail(fresh)
    const surveys = await crm.getSurveys({ status: 'PUBLISHED', perPage: 100 })
    setManualSurveys(surveys.data.filter((survey) => survey.trigger === 'MANUAL'))
    setSelectedManualId('')
  }

  const generateFromDetail = async (confirmRegenerate = false) => {
    if (!detail || generating) return
    const card = detail.surveyInvitation
    const cardSurveyId = card && 'surveyId' in card ? card.surveyId ?? undefined : undefined
    const surveyId = invitationRequestSurveyId({
      selectedManualId,
      stage: detail.stage,
      cardSurveyId,
      confirmRegenerate,
    })
    if (!confirmRegenerate && !surveyId && detail.stage !== 'WON') {
      setError('Selecciona una encuesta manual activa. La de Oportunidad ganada se envía al marcarla como Ganada.')
      return
    }
    setGenerating(true)
    try {
      const result = await crm.createSurveyInvitation(detail.id, {
        surveyId,
        confirmRegenerate,
      })
      if (result.created && result.responseUrl) {
        setDetail(null)
        setCreatedInvitation(result)
      }
      else {
        const fresh = await crm.getOpportunity(detail.id)
        setDetail(fresh)
      }
    } catch (err: unknown) {
      setError(getErrorMessages(err, 'No se pudo generar la encuesta.')[0])
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    if (searchParams.get('nuevo') === '1') {
      openCreate(searchParams.get('cliente') ?? '')
      const next = new URLSearchParams(searchParams)
      next.delete('nuevo')
      next.delete('cliente')
      setSearchParams(next, { replace: true })
      return
    }
    const editId = searchParams.get('editar')
    if (!editId) return
    const found = items.find((item) => item.id === editId)
    if (found) {
      openEdit(found)
      const next = new URLSearchParams(searchParams)
      next.delete('editar')
      setSearchParams(next, { replace: true })
      return
    }
    void crm.getOpportunities({ perPage: 100 }).then((response) => {
      const match = response.data.find((item) => item.id === editId)
      if (match) openEdit(match)
      const next = new URLSearchParams(searchParams)
      next.delete('editar')
      setSearchParams(next, { replace: true })
    })
  }, [searchParams, setSearchParams, items, user?.id])

  const owners = useMemo(() => {
    const map = new Map<string, string>()
    for (const client of clients) {
      if (client.ownerId) map.set(client.ownerId, client.ownerName || client.ownerId)
    }
    for (const item of items) {
      if (item.ownerId) map.set(item.ownerId, item.ownerName || item.ownerId)
    }
    if (user?.id) map.set(user.id, user.fullName)
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [clients, items, user])

  const totals = useMemo(() => summarizeOpportunities(items), [items])
  const listedCount = view === 'list' ? meta.total : totals.count
  const hasFilters = Boolean(searchInput || stageFilter || statusFilter || clientFilter || ownerFilter)

  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setStageFilter('')
    setStatusFilter('')
    setClientFilter('')
    setOwnerFilter('')
    setPage(1)
  }

  const move = async (
    id: string,
    stage: OpportunityStage,
    extra?: { lostReason?: string; reopen?: boolean; reopenReason?: string },
  ) => {
    if (movingRef.current) return
    movingRef.current = true
    try {
      const updated = await crm.changeStage(id, { stage, ...extra })
      const invitation = updated.surveyInvitation
      if (invitation && 'created' in invitation && invitation.created && invitation.responseUrl) {
        setDetail(null)
        setCreatedInvitation(invitation)
      } else if (invitation && 'message' in invitation && invitation.message) {
        setToast({ title: 'Etapa actualizada', message: invitation.message })
      }
      await load()
      const item = items.find((entry) => entry.id === id)
      if (!(invitation && 'message' in invitation && invitation.message && !invitation.created)) {
        setToast({
          title: 'Etapa actualizada',
          message: `${item?.title ?? 'La oportunidad'} pasó a ${getOpportunityStageLabel(stage)} (${updated.probability}%).`,
        })
      }
    } finally {
      movingRef.current = false
    }
  }

  const requestMove = async (item: CrmOpportunity, stage: OpportunityStage) => {
    if (item.stage === stage || !canMove) return
    if (opportunityStatus(item.stage) !== 'OPEN') {
      if (stage === 'WON' || stage === 'LOST') {
        setError('Reabre la oportunidad a una etapa abierta')
        return
      }
      setReopenFor({ item, stage })
      return
    }
    if (stage === 'LOST') {
      setLostFor({ item, stage })
      return
    }
    await move(item.id, stage)
  }

  const onDrop = async (event: DragEvent<HTMLElement>, stage: OpportunityStage) => {
    event.preventDefault()
    setOverStage(null)
    setDraggingId(null)
    const id = event.dataTransfer.getData('text/plain')
    const current = items.find((item) => item.id === id)
    if (!current) return
    try {
      await requestMove(current, stage)
    } catch (err: unknown) {
      setError(getErrorMessages(err, 'No se pudo cambiar la etapa.')[0])
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (saving || savingRef.current) return
    const nextErrors = validateOpportunityForm(form)
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      const payload = buildOpportunityPayload(form)
      const wasEditing = Boolean(editing)
      let skipGenericToast = false
      if (editing) {
        const stageChanged = payload.stage !== editing.stage
        if (stageChanged && !canMove) throw new Error('No tienes permiso para cambiar la etapa.')
        const { stage, ...rest } = payload
        await crm.updateOpportunity(editing.id, rest)
        if (stageChanged) {
          const updated = await crm.changeStage(editing.id, {
            stage,
            reopen: opportunityStatus(editing.stage) !== 'OPEN',
            reopenReason: opportunityStatus(editing.stage) !== 'OPEN' ? 'Actualización de la oportunidad' : undefined,
          })
          const invitation = updated.surveyInvitation
          if (invitation && 'created' in invitation && invitation.created && invitation.responseUrl) {
            setCreatedInvitation(invitation)
            skipGenericToast = true
          } else if (invitation && 'created' in invitation && invitation.message) {
            setToast({ title: 'Etapa actualizada', message: invitation.message })
            skipGenericToast = true
          }
        }
      } else {
        await crm.createOpportunity(payload)
      }
      resetForm()
      await load()
      if (!skipGenericToast) {
        setToast({
          title: wasEditing ? 'Oportunidad actualizada' : 'Oportunidad creada',
          message: wasEditing
            ? `${payload.title} se actualizó correctamente.`
            : `${payload.title} se asoció a la cartera.`,
        })
      }
    } catch (err: unknown) {
      const mapped = mapOpportunityApiError((err as { message?: unknown }).message)
      if (Object.keys(mapped).length) setFieldErrors(mapped)
      else setError(getErrorMessages(err, 'Se produjo un error al guardar.')[0])
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const columns: Column<CrmOpportunity>[] = useMemo(
    () => [
      { key: 'title', header: 'Oportunidad', render: (row) => <span className="font-medium">{row.title}</span> },
      { key: 'clientName', header: 'Cliente' },
      { key: 'contactName', header: 'Contacto', render: (row) => row.contactName || '—' },
      { key: 'amount', header: 'Importe', render: (row) => formatMoney(row.amount, row.currency) },
      { key: 'stage', header: 'Etapa', render: (row) => <OpportunityStageBadge stage={row.stage} /> },
      {
        key: 'status',
        header: 'Estado',
        render: (row) => getOpportunityStatusLabel(opportunityStatus(row.stage)),
      },
      { key: 'probability', header: 'Probabilidad', render: (row) => `${row.probability}%` },
      { key: 'ownerName', header: 'Responsable', render: (row) => row.ownerName || '—' },
      { key: 'expectedCloseDate', header: 'Cierre estimado', render: (row) => formatDate(row.expectedCloseDate) },
      {
        key: 'actions',
        header: 'Acciones',
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <TableActionButton
                label={`Editar oportunidad ${row.title}`}
                icon="edit"
                onClick={(event) => {
                  event.stopPropagation()
                  openEdit(row)
                }}
              />
            )}
            <TableActionButton
              label={`Ver detalle de ${row.title}`}
              icon="eye"
              onClick={(event) => {
                event.stopPropagation()
                void openDetail(row)
              }}
            />
          </div>
        ),
      },
    ],
    [canEdit],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-brand-slate/30 pb-2">
        <div className="min-w-[16rem] max-w-md flex-1">
          <TextInput
            placeholder="Buscar oportunidades..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex rounded border border-slate-300 bg-white p-0.5">
            <button
              type="button"
              className={`rounded px-3 py-1.5 text-sm font-medium ${view === 'list' ? 'bg-brand-teal text-white' : 'text-brand-navy hover:bg-brand-cream/50'}`}
              onClick={() => {
                setView('list')
                setPage(1)
              }}
            >
              Lista
            </button>
            <button
              type="button"
              className={`rounded px-3 py-1.5 text-sm font-medium ${view === 'kanban' ? 'bg-brand-teal text-white' : 'text-brand-navy hover:bg-brand-cream/50'}`}
              onClick={() => {
                setView('kanban')
                setPage(1)
              }}
            >
              Kanban
            </button>
          </div>
          {canCreate && (
            <PrimaryButton onClick={() => openCreate()}>
              <AppIcon name="plus" className="h-4 w-4" />
              Nueva oportunidad
            </PrimaryButton>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SelectInput
          aria-label="Etapa"
          value={stageFilter}
          onChange={(e) => {
            setStageFilter(e.target.value)
            setPage(1)
          }}
          className="w-44"
        >
          <option value="">Todas las etapas</option>
          {ALL_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {OPPORTUNITY_STAGE_LABELS[stage]}
            </option>
          ))}
        </SelectInput>
        <SelectInput
          aria-label="Estado"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="w-40"
        >
          <option value="">Todos los estados</option>
          {(Object.keys(OPPORTUNITY_STATUS_LABELS) as Array<keyof typeof OPPORTUNITY_STATUS_LABELS>).map((status) => (
            <option key={status} value={status}>
              {OPPORTUNITY_STATUS_LABELS[status]}
            </option>
          ))}
        </SelectInput>
        <SelectInput
          aria-label="Cliente"
          value={clientFilter}
          onChange={(e) => {
            setClientFilter(e.target.value)
            setPage(1)
          }}
          className="w-44"
        >
          <option value="">Todos los clientes</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </SelectInput>
        <SelectInput
          aria-label="Responsable"
          value={ownerFilter}
          onChange={(e) => {
            setOwnerFilter(e.target.value)
            setPage(1)
          }}
          className="w-44"
        >
          <option value="">Todos los responsables</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name}
            </option>
          ))}
        </SelectInput>
        {hasFilters && <SecondaryButton onClick={clearFilters}>Limpiar filtros</SecondaryButton>}
      </div>
      <p className="text-sm text-muted">
        {listedCount} oportunidades · {formatMoney(totals.amount)} · ponderado {formatMoney(totals.weighted)}
      </p>
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {view === 'list' ? (
        <DataTable
          columns={columns}
          data={items}
          pagination={{ ...meta, page, perPage }}
          onPageChange={setPage}
          onPerPageChange={(value) => {
            setPerPage(value)
            setPage(1)
          }}
          rowKey={(row) => row.id}
          onRowClick={canEdit ? openEdit : undefined}
          emptyMessage="No hay oportunidades"
          emptyDescription={
            hasFilters
              ? 'No hay oportunidades que coincidan con los filtros.'
              : 'Aún no hay oportunidades registradas.'
          }
        />
      ) : (
        <div className="-mx-1 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3 px-1">
            {ALL_STAGES.map((stage) => {
              const columnItems = items.filter((item) => item.stage === stage)
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
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                      {getOpportunityStageLabel(stage)}
                    </p>
                    <p className="text-xs text-muted">
                      {columnItems.length} · {formatMoney(total)}
                    </p>
                  </header>
                  <div className="flex min-h-48 flex-col gap-2 p-2">
                    {columnItems.length === 0 && (
                      <p className="px-2 py-6 text-center text-xs text-muted">Sin oportunidades</p>
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
                          <div className="mb-1 flex items-center gap-1 text-muted">
                            <AppIcon name="grip" className="h-3.5 w-3.5" />
                            <span className="text-[10px] uppercase tracking-wide">Arrastrar</span>
                          </div>
                        )}
                        <p className="text-xs text-muted">{item.clientName}</p>
                        <p className="font-semibold text-text">{item.title}</p>
                        <p className="mt-1 text-sm font-medium text-text">{formatMoney(item.amount, item.currency)}</p>
                        <p className="text-xs text-muted">
                          {item.probability}% · {item.ownerName || 'Sin responsable'}
                        </p>
                        <p className="text-xs text-muted">{formatDate(item.expectedCloseDate)}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {canEdit && (
                            <TableActionButton
                              label={`Editar oportunidad ${item.title}`}
                              icon="edit"
                              onClick={() => openEdit(item)}
                            />
                          )}
                          <TableActionButton
                            label={`Ver detalle de ${item.title}`}
                            icon="eye"
                            onClick={() => void openDetail(item)}
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      )}

      <ConfirmToast open={Boolean(toast)} title={toast?.title ?? ''} message={toast?.message ?? ''} />
      <SurveyInvitationModal
        invitation={createdInvitation}
        onClose={() => {
          setCreatedInvitation(null)
        }}
      />
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.title ?? 'Oportunidad'}
        size="lg"
      >
        {detail ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {detail.clientName} · {formatMoney(detail.amount, detail.currency)} · {getOpportunityStageLabel(detail.stage)}
            </p>
            <OpportunitySurveyCard
              card={detail.surveyInvitation as SurveyInvitationCard | null}
              stage={detail.stage}
              manualSurveys={manualSurveys}
              selectedManualId={selectedManualId}
              onManualChange={setSelectedManualId}
              generating={generating}
              onGenerate={(confirm) => void generateFromDetail(confirm)}
            />
          </div>
        ) : null}
      </Modal>
      <Modal open={open} onClose={() => !saving && resetForm()} title={editing ? 'Editar oportunidad' : 'Nueva oportunidad'}>
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Información general</p>
          <FormField label="Nombre de oportunidad" required error={fieldErrors.title}>
            <TextInput
              maxLength={LIMITS.OPPORTUNITY_TITLE}
              value={form.title}
              onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Cliente" htmlFor="opportunity-client" required error={fieldErrors.clientId}>
              <SearchableSelect
                id="opportunity-client"
                ariaLabel="Cliente"
                value={form.clientId}
                onChange={(clientId) => setForm((c) => ({ ...c, clientId, contactId: '' }))}
                options={clients.map((client) => ({ value: client.id, label: client.name }))}
                placeholder="Seleccionar cliente"
                searchPlaceholder="Buscar cliente..."
                emptyMessage="No hay clientes disponibles"
                noResultsMessage="Ningún cliente coincide con la búsqueda"
              />
            </FormField>
            <FormField label="Contacto" htmlFor="opportunity-contact" error={fieldErrors.contactId}>
              <SearchableSelect
                id="opportunity-contact"
                ariaLabel="Contacto"
                value={form.contactId}
                onChange={(contactId) => setForm((c) => ({ ...c, contactId }))}
                options={contacts.map((contact) => ({
                  value: contact.id,
                  label: `${contact.firstName} ${contact.lastName}`.trim(),
                  description: contact.email,
                }))}
                placeholder="Sin contacto"
                searchPlaceholder="Buscar contacto..."
                emptyMessage={form.clientId ? 'Este cliente no tiene contactos' : 'Selecciona un cliente primero'}
                noResultsMessage="Ningún contacto coincide con la búsqueda"
                disabled={!form.clientId}
                allowEmpty
                emptyLabel="Sin contacto"
              />
            </FormField>
          </div>
          <FormField label="Responsable">
            <SelectInput value={form.ownerId} onChange={(e) => setForm((c) => ({ ...c, ownerId: e.target.value }))}>
              <option value="">Sin asignar</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Importe" htmlFor="opportunity-amount" required error={fieldErrors.amount}>
              <TextInput
                id="opportunity-amount"
                inputMode="numeric"
                aria-label="Importe"
                value={form.amount}
                onChange={(e) => setForm((c) => ({ ...c, amount: formatAmountInput(e.target.value) }))}
              />
            </FormField>
            <FormField label="Etapa" htmlFor="opportunity-stage">
              <SelectInput
                id="opportunity-stage"
                value={form.stage}
                onChange={(e) => {
                  const stage = e.target.value as OpportunityStage
                  setForm((c) => ({ ...c, stage, probability: String(PROBABILITY_BY_STAGE[stage]) }))
                }}
              >
                {(editing?.stage === 'LOST' ? ALL_STAGES : ALL_STAGES.filter((stage) => stage !== 'LOST')).map((stage) => (
                  <option key={stage} value={stage}>
                    {OPPORTUNITY_STAGE_LABELS[stage]}
                  </option>
                ))}
              </SelectInput>
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Probabilidad" error={fieldErrors.probability}>
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
          <FormField label="Descripción" error={fieldErrors.notes}>
            <TextArea
              maxLength={LIMITS.NOTES}
              value={form.notes}
              onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton onClick={resetForm} disabled={saving}>
              Cancelar
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={saving || (editing ? !canEdit : !canCreate)}>
              {saving ? 'Guardando...' : 'Guardar'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>
      <Modal open={Boolean(lostFor)} onClose={() => setLostFor(null)} title="Motivo de pérdida">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const reasonError = validateLostReason(lostReason)
            if (reasonError) {
              setFieldErrors({ lostReason: reasonError })
              return
            }
            if (!lostFor) return
            void move(lostFor.item.id, 'LOST', { lostReason }).then(() => {
              setLostFor(null)
              setLostReason('')
              setFieldErrors({})
            })
          }}
          className="space-y-3"
        >
          <FormField label="Descripción" required error={fieldErrors.lostReason}>
            <TextArea
              maxLength={LIMITS.LOST_REASON}
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={() => setLostFor(null)}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit">Marcar perdida</PrimaryButton>
          </div>
        </form>
      </Modal>
      <Modal open={Boolean(reopenFor)} onClose={() => setReopenFor(null)} title="Reabrir oportunidad">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const reasonError = validateReopenReason(reopenReason)
            if (reasonError) {
              setFieldErrors({ reopenReason: reasonError })
              return
            }
            if (!reopenFor) return
            void move(reopenFor.item.id, reopenFor.stage, { reopen: true, reopenReason })
              .then(() => {
                setReopenFor(null)
                setReopenReason('')
                setFieldErrors({})
              })
              .catch((err: unknown) => setError(getErrorMessages(err, 'No se pudo reabrir.')[0]))
          }}
          className="space-y-3"
        >
          <p className="text-sm text-muted">
            {reopenFor?.item.title} está {reopenFor ? getOpportunityStatusLabel(opportunityStatus(reopenFor.item.stage)).toLowerCase() : ''}.
            Indica el motivo para moverla a {reopenFor ? getOpportunityStageLabel(reopenFor.stage) : ''}.
          </p>
          <FormField label="Motivo de reapertura" required error={fieldErrors.reopenReason}>
            <TextArea
              maxLength={LIMITS.LOST_REASON}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={() => setReopenFor(null)}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit">Reabrir</PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
