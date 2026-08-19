import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ActivityStatusBadge, ActivityTypeBadge } from '@/components/common/CrmBadge'
import { AppIcon } from '@/components/common/AppIcon'
import { DataTable, type Column } from '@/components/common/DataTable'
import { FormField } from '@/components/common/FormField'
import { Modal } from '@/components/common/Modal'
import { PageHeader } from '@/components/common/PageHeader'
import { TableActionButton } from '@/components/common/TableActionButton'
import { PrimaryButton, SecondaryButton, SelectInput, TextArea, TextInput } from '@/components/common/UiControls'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import * as crm from '@/services/crm.service'
import * as usersService from '@/services/users.service'
import type { ActivityStatus, ActivityType, CrmActivity, CrmClient, CrmContact, CrmOpportunity } from '@/types/crm.types'
import type { User } from '@/types/user.types'
import { ACTIVITY_STATUS_LABELS, ACTIVITY_TYPE_LABELS, formatDateTime } from '@/utils/labels'

type ActivityForm = { clientId: string; opportunityId: string; contactId: string; ownerId: string; type: ActivityType; subject: string; body: string; dueAt: string }
const emptyForm: ActivityForm = { clientId: '', opportunityId: '', contactId: '', ownerId: '', type: 'CALL', subject: '', body: '', dueAt: '' }

function toLocalDate(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function ActivitiesPage() {
  const { hasPermission } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<CrmActivity[]>([])
  const [clients, setClients] = useState<CrmClient[]>([])
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([])
  const [contacts, setContacts] = useState<CrmContact[]>([])
  const [owners, setOwners] = useState<User[]>([])
  const [meta, setMeta] = useState({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ search: '', type: '', status: '', clientId: '', ownerId: '', dueFrom: '', dueTo: '' })
  const [form, setForm] = useState<ActivityForm>(emptyForm)
  const [editing, setEditing] = useState<CrmActivity | null>(null)
  const [detail, setDetail] = useState<CrmActivity | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const canEdit = hasPermission(PERMISSIONS.CRM_ACTIVITY_EDIT)

  const load = useCallback(async () => {
    const query = Object.fromEntries(Object.entries(filters).filter(([, value]) => value))
    const response = await crm.getActivities({ page, perPage: 10, ...query })
    setItems(response.data)
    if (response.meta) setMeta(response.meta)
    setOwners((current) => {
      const known = new Map(current.map((owner) => [owner.id, owner]))
      response.data.forEach((activity) => {
        if (activity.ownerId && activity.ownerName) known.set(activity.ownerId, { id: activity.ownerId, fullName: activity.ownerName } as User)
      })
      return [...known.values()]
    })
  }, [filters, page])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    void crm.getClients({ perPage: 100 }).then((response) => setClients(response.data))
    void crm.getOpportunities({ perPage: 100 }).then((response) => setOpportunities(response.data))
    void crm.getContacts({ perPage: 100 }).then((response) => setContacts(response.data))
    void usersService.getAssignableUsers().then((response) => setOwners(response.data)).catch(() => undefined)
  }, [])
  useEffect(() => {
    if (searchParams.get('nuevo') !== '1') return
    openCreate()
    const next = new URLSearchParams(searchParams)
    next.delete('nuevo')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  function openCreate() { setEditing(null); setForm(emptyForm); setError(''); setOpen(true) }
  function openEdit(activity: CrmActivity) {
    setEditing(activity)
    setForm({ clientId: activity.clientId, opportunityId: activity.opportunityId ?? '', contactId: activity.contactId ?? '', ownerId: activity.ownerId ?? '', type: activity.type, subject: activity.subject, body: activity.body, dueAt: toLocalDate(activity.dueAt) })
    setError('')
    setOpen(true)
  }
  function updateForm(values: Partial<ActivityForm>) { setForm((current) => ({ ...current, ...values })) }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!form.subject.trim()) { setError('El asunto es obligatorio.'); return }
    if (!form.clientId) { setError('Selecciona un cliente.'); return }
    const payload = { ...form, opportunityId: form.opportunityId || undefined, contactId: form.contactId || undefined, ownerId: form.ownerId || undefined, dueAt: form.dueAt || undefined }
    try {
      if (editing) await crm.updateActivity(editing.id, payload)
      else await crm.createActivity(payload)
      setOpen(false)
      await load()
    } catch { setError('No se pudo guardar la actividad. Revisa los datos e inténtalo nuevamente.') }
  }

  async function runAction(action: () => Promise<unknown>, message: string) {
    setError('')
    try { await action(); await load() } catch { setError(message) }
  }

  const filteredOpportunities = opportunities.filter((item) => item.clientId === form.clientId)
  const filteredContacts = contacts.filter((item) => item.clientId === form.clientId)
  const columns: Column<CrmActivity>[] = [
    { key: 'subject', header: 'Asunto', render: (row) => <span className="font-medium">{row.subject}</span> },
    { key: 'type', header: 'Tipo', render: (row) => <ActivityTypeBadge type={row.type} /> },
    { key: 'status', header: 'Estado', render: (row) => <ActivityStatusBadge status={row.status} /> },
    { key: 'clientName', header: 'Cliente' },
    { key: 'ownerName', header: 'Responsable', render: (row) => row.ownerName ?? '—' },
    { key: 'dueAt', header: 'Vence', render: (row) => formatDateTime(row.dueAt) },
    { key: 'actions', header: 'Acciones', render: (row) => <div className="flex flex-wrap gap-2">
      <TableActionButton label="Detalle" icon="eye" onClick={() => setDetail(row)} />
      {canEdit && row.status === 'PENDING' && <>
        <TableActionButton label="Editar" icon="edit" onClick={() => openEdit(row)} />
        <TableActionButton label="Completar" icon="check" variant="success" onClick={() => { if (window.confirm('¿Completar esta actividad?')) void runAction(() => crm.completeActivity(row.id), 'No se pudo completar la actividad.') }} />
        <TableActionButton label="Cancelar" icon="trash" variant="danger" onClick={() => { if (window.confirm('¿Cancelar esta actividad?')) void runAction(() => crm.cancelActivity(row.id), 'No se pudo cancelar la actividad.') }} />
      </>}
    </div> },
  ]

  return <div className="space-y-4">
    <PageHeader kicker="CRM" title="Actividades" description="Llamadas, reuniones, tareas y notas de seguimiento comercial." actions={hasPermission(PERMISSIONS.CRM_ACTIVITY_CREATE) ? <PrimaryButton onClick={openCreate}>+ Nueva actividad</PrimaryButton> : undefined} />
    <div className="grid gap-3 md:grid-cols-4">
      <TextInput placeholder="Buscar actividades..." value={filters.search} onChange={(e) => { setPage(1); setFilters({ ...filters, search: e.target.value }) }} />
      <SelectInput value={filters.type} onChange={(e) => { setPage(1); setFilters({ ...filters, type: e.target.value }) }}><option value="">Todos los tipos</option>{Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectInput>
      <SelectInput value={filters.status} onChange={(e) => { setPage(1); setFilters({ ...filters, status: e.target.value }) }}><option value="">Todos los estados</option>{Object.entries(ACTIVITY_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectInput>
      <SelectInput value={filters.clientId} onChange={(e) => { setPage(1); setFilters({ ...filters, clientId: e.target.value }) }}><option value="">Todos los clientes</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</SelectInput>
      <SelectInput value={filters.ownerId} onChange={(e) => { setPage(1); setFilters({ ...filters, ownerId: e.target.value }) }}><option value="">Todos los responsables</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.fullName}</option>)}</SelectInput>
      <div className="flex min-w-0 items-center gap-2">
        <label className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand-navy">Desde <AppIcon name="calendar" className="h-3.5 w-3.5 text-slate-400" /></label>
        <TextInput className="w-full min-w-0 max-w-[190px] text-xs" type="datetime-local" aria-label="Desde qué fecha" value={filters.dueFrom} onChange={(e) => { setPage(1); setFilters({ ...filters, dueFrom: e.target.value }) }} />
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <label className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand-navy">Hasta <AppIcon name="calendar" className="h-3.5 w-3.5 text-slate-400" /></label>
        <TextInput className="w-full min-w-0 max-w-[190px] text-xs" type="datetime-local" aria-label="Hasta qué fecha" value={filters.dueTo} onChange={(e) => { setPage(1); setFilters({ ...filters, dueTo: e.target.value }) }} />
      </div>
      <SecondaryButton onClick={() => { setPage(1); setFilters({ search: '', type: '', status: '', clientId: '', ownerId: '', dueFrom: '', dueTo: '' }) }}>Limpiar filtros</SecondaryButton>
    </div>
    {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    <DataTable columns={columns} data={items} pagination={meta} onPageChange={setPage} rowKey={(row) => row.id} emptyMessage="No hay actividades" emptyDescription="No hay actividades con los filtros seleccionados." emptyAction={hasPermission(PERMISSIONS.CRM_ACTIVITY_CREATE) ? <PrimaryButton onClick={openCreate}>Crear actividad</PrimaryButton> : undefined} />
    <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar actividad' : 'Nueva actividad'}><form onSubmit={(event) => void submit(event)} className="space-y-3">
      <FormField label="Cliente" required><SelectInput required disabled={Boolean(editing)} value={form.clientId} onChange={(e) => updateForm({ clientId: e.target.value, opportunityId: '', contactId: '' })}><option value="">Seleccionar cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</SelectInput></FormField>
      <FormField label="Oportunidad"><SelectInput value={form.opportunityId} onChange={(e) => updateForm({ opportunityId: e.target.value })}><option value="">Sin oportunidad</option>{filteredOpportunities.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</SelectInput></FormField>
      <FormField label="Contacto"><SelectInput value={form.contactId} onChange={(e) => updateForm({ contactId: e.target.value })}><option value="">Sin contacto</option>{filteredContacts.map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}</SelectInput></FormField>
      <FormField label="Responsable"><SelectInput value={form.ownerId} onChange={(e) => updateForm({ ownerId: e.target.value })}><option value="">Responsable actual</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.fullName}</option>)}</SelectInput></FormField>
      <FormField label="Tipo"><SelectInput value={form.type} onChange={(e) => updateForm({ type: e.target.value as ActivityType })}>{Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectInput></FormField>
      <FormField label="Asunto" required><TextInput required maxLength={200} value={form.subject} onChange={(e) => updateForm({ subject: e.target.value })} /></FormField>
      <FormField label="Descripción"><TextArea maxLength={5000} value={form.body} onChange={(e) => updateForm({ body: e.target.value })} /></FormField>
      <FormField label="Fecha estimada"><TextInput type="datetime-local" value={form.dueAt} onChange={(e) => updateForm({ dueAt: e.target.value })} /></FormField>
      <div className="flex justify-end gap-2 pt-2"><SecondaryButton onClick={() => setOpen(false)}>Cancelar</SecondaryButton><PrimaryButton type="submit">Guardar</PrimaryButton></div>
    </form></Modal>
    <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title="Detalle de actividad">{detail && <div className="space-y-3 text-sm"><p><strong>Asunto:</strong> {detail.subject}</p><p><strong>Cliente:</strong> {detail.clientName}</p><p><strong>Oportunidad:</strong> {detail.opportunityTitle ?? '—'}</p><p><strong>Responsable:</strong> {detail.ownerName ?? '—'}</p><p><strong>Estado:</strong> {ACTIVITY_STATUS_LABELS[detail.status as ActivityStatus]}</p><p><strong>Fecha:</strong> {formatDateTime(detail.dueAt)}</p><p><strong>Descripción:</strong> {detail.body || '—'}</p><div><strong>Historial</strong>{detail.history?.length ? <ul className="mt-1 list-disc pl-5">{detail.history.map((entry, index) => <li key={`${entry.createdAt}-${index}`}>{entry.action} · {formatDateTime(entry.createdAt)} · {entry.changedBy ?? 'Sistema'}</li>)}</ul> : <p>Sin historial disponible.</p>}</div></div>}</Modal>
  </div>
}
