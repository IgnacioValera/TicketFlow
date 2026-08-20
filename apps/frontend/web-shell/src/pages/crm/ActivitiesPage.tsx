import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppIcon } from '@/components/common/AppIcon'
import { ActivityStatusBadge, ActivityTypeBadge } from '@/components/common/CrmBadge'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ConfirmToast } from '@/components/common/FeedbackAlert'
import { FormField } from '@/components/common/FormField'
import { Modal } from '@/components/common/Modal'
import { TableActionButton } from '@/components/common/TableActionButton'
import { SearchableSelect } from '@/components/common/SearchableSelect'
import { PrimaryButton, SecondaryButton, SelectInput, TextArea, TextInput } from '@/components/common/UiControls'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import * as crm from '@/services/crm.service'
import type { ActivityStatus, ActivityType, CrmActivity, CrmClient } from '@/types/crm.types'
import { ACTIVITY_STATUS_LABELS, ACTIVITY_TYPE_LABELS, formatDateTime } from '@/utils/labels'

export function ActivitiesPage() {
  const { hasPermission } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<CrmActivity[]>([])
  const [clients, setClients] = useState<CrmClient[]>([])
  const [meta, setMeta] = useState({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ clientId: '', type: 'CALL' as ActivityType, subject: '', body: '', dueAt: '' })
  const [clientError, setClientError] = useState('')
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 6000)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (searchParams.get('nuevo') !== '1') return
    setOpen(true)
    const next = new URLSearchParams(searchParams)
    next.delete('nuevo')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const load = useCallback(async () => {
    const response = await crm.getActivities({
      page,
      perPage,
      search: search || undefined,
      status: status || undefined,
    })
    setItems(response.data)
    if (response.meta) setMeta(response.meta)
  }, [page, perPage, search, status])
  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => {
    void crm.getClients({ perPage: 100 }).then((r) => setClients(r.data))
  }, [])

  const columns: Column<CrmActivity>[] = useMemo(
    () => [
      { key: 'subject', header: 'Asunto', render: (row) => <span className="font-medium">{row.subject}</span> },
      { key: 'type', header: 'Tipo', render: (row) => <ActivityTypeBadge type={row.type} /> },
      { key: 'status', header: 'Estado', render: (row) => <ActivityStatusBadge status={row.status} /> },
      { key: 'clientName', header: 'Cliente' },
      { key: 'dueAt', header: 'Vence', render: (row) => formatDateTime(row.dueAt) },
      {
        key: 'actions',
        header: 'Acciones',
        render: (row) =>
          row.status === 'PENDING' && hasPermission(PERMISSIONS.CRM_ACTIVITY_EDIT) ? (
            <TableActionButton
              label={`Completar actividad ${row.subject}`}
              icon="check"
              variant="success"
              onClick={() => void crm.completeActivity(row.id).then(load)}
            />
          ) : (
            '—'
          ),
      },
    ],
    [hasPermission, load],
  )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.clientId) {
      setClientError('Selecciona un cliente')
      return
    }
    const created = await crm.createActivity({ ...form, dueAt: form.dueAt || undefined })
    setOpen(false)
    setForm({ clientId: '', type: 'CALL', subject: '', body: '', dueAt: '' })
    await load()
    setToast({
      title: 'Actividad creada',
      message: `${created.subject} se agregó al seguimiento comercial.`,
    })
  }

  return (
    <div className="space-y-4">
      <ConfirmToast open={Boolean(toast)} title={toast?.title ?? ''} message={toast?.message ?? ''} />
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full max-w-xs">
          <TextInput
            placeholder="Buscar actividades..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="w-44">
          <SelectInput
            aria-label="Estado"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Todos los estados</option>
            {(Object.keys(ACTIVITY_STATUS_LABELS) as ActivityStatus[]).map((item) => (
              <option key={item} value={item}>
                {ACTIVITY_STATUS_LABELS[item]}
              </option>
            ))}
          </SelectInput>
        </div>
        {hasPermission(PERMISSIONS.CRM_ACTIVITY_CREATE) && (
          <div className="ml-auto">
            <PrimaryButton onClick={() => setOpen(true)}>
              <AppIcon name="plus" className="h-4 w-4" />
              Nueva actividad
            </PrimaryButton>
          </div>
        )}
      </div>
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
        emptyMessage="No hay actividades"
        emptyDescription={
          search || status
            ? 'No hay actividades que coincidan con los filtros.'
            : 'No hay actividades pendientes.'
        }
        emptyAction={
          search || status
            ? undefined
            : hasPermission(PERMISSIONS.CRM_ACTIVITY_CREATE) ? (
            <PrimaryButton onClick={() => setOpen(true)}>
              <AppIcon name="plus" className="h-4 w-4" />
              Crear actividad
            </PrimaryButton>
          ) : undefined
        }
      />
      <Modal
        open={open}
        onClose={() => {
          setOpen(false)
          setClientError('')
        }}
        title="Nueva actividad"
      >
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <FormField label="Cliente" htmlFor="activity-client" required error={clientError}>
            <SearchableSelect
              id="activity-client"
              value={form.clientId}
              onChange={(clientId) => {
                setForm((c) => ({ ...c, clientId }))
                setClientError('')
              }}
              options={clients.map((client) => ({ value: client.id, label: client.name }))}
              placeholder="Seleccionar cliente"
              searchPlaceholder="Buscar cliente..."
              emptyMessage="No hay clientes disponibles"
              noResultsMessage="Ningún cliente coincide con la búsqueda"
            />
          </FormField>
          <FormField label="Tipo">
            <SelectInput
              value={form.type}
              onChange={(e) => setForm((c) => ({ ...c, type: e.target.value as ActivityType }))}
            >
              {(Object.keys(ACTIVITY_TYPE_LABELS) as ActivityType[]).map((type) => (
                <option key={type} value={type}>
                  {ACTIVITY_TYPE_LABELS[type]}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <FormField label="Asunto" required>
            <TextInput required value={form.subject} onChange={(e) => setForm((c) => ({ ...c, subject: e.target.value }))} />
          </FormField>
          <FormField label="Descripción">
            <TextArea value={form.body} onChange={(e) => setForm((c) => ({ ...c, body: e.target.value }))} />
          </FormField>
          <FormField label="Fecha estimada">
            <TextInput type="datetime-local" value={form.dueAt} onChange={(e) => setForm((c) => ({ ...c, dueAt: e.target.value }))} />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton onClick={() => setOpen(false)}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit">Guardar</PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
