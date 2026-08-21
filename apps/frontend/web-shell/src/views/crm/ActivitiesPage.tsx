import { useAppSearchParams } from '@/hooks/useAppSearchParams'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AppIcon } from '@/components/common/AppIcon'
import { ActivityStatusBadge, ActivityTypeBadge } from '@/components/common/CrmBadge'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ConfirmToast } from '@/components/common/FeedbackAlert'
import { FormField } from '@/components/common/FormField'
import { ConfirmModal, Modal } from '@/components/common/Modal'
import { TableActionButton } from '@/components/common/TableActionButton'
import { SearchableSelect } from '@/components/common/SearchableSelect'
import { PrimaryButton, SecondaryButton, SelectInput, TextArea, TextInput } from '@/components/common/UiControls'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import * as crm from '@/services/crm.service'
import type { ActivityStatus, ActivityType, CrmActivity, CrmClient } from '@/types/crm.types'
import { ACTIVITY_STATUS_LABELS, ACTIVITY_TYPE_LABELS, formatDateTime } from '@/utils/labels'
import { getErrorMessages } from '@/utils/errors'

export function ActivitiesPage() {
  const { hasPermission } = usePermissions()
  const [searchParams, setSearchParams] = useAppSearchParams()
  const [items, setItems] = useState<CrmActivity[]>([])
  const [clients, setClients] = useState<CrmClient[]>([])
  const [meta, setMeta] = useState({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<CrmActivity | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CrmActivity | null>(null)
  const [deleting, setDeleting] = useState(false)
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

  const canEdit = hasPermission(PERMISSIONS.CRM_ACTIVITY_EDIT)

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
        render: (row) => (
          <div className="flex flex-wrap gap-1.5">
            <TableActionButton
              label={`Ver actividad ${row.subject}`}
              icon="eye"
              onClick={() => setDetail(row)}
            />
            {row.status === 'PENDING' && canEdit ? (
              <TableActionButton
                label={`Completar actividad ${row.subject}`}
                icon="check"
                variant="success"
                onClick={() => void crm.completeActivity(row.id).then(load)}
              />
            ) : null}
            {canEdit && row.status !== 'CANCELLED' ? (
              <TableActionButton
                label={`Eliminar actividad ${row.subject}`}
                icon="trash"
                variant="danger"
                onClick={() => setDeleteTarget(row)}
              />
            ) : null}
          </div>
        ),
      },
    ],
    [canEdit, load],
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

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try {
      await crm.deleteActivity(deleteTarget.id)
      setToast({
        title: 'Actividad eliminada',
        message: `${deleteTarget.subject} se eliminó del seguimiento.`,
      })
      setDeleteTarget(null)
      if (detail?.id === deleteTarget.id) setDetail(null)
      await load()
    } catch (err: unknown) {
      setToast({
        title: 'No se pudo eliminar',
        message: getErrorMessages(err, 'No se pudo eliminar la actividad.')[0],
      })
    } finally {
      setDeleting(false)
    }
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

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title="Detalle de actividad">
        {detail ? (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Asunto</p>
              <p className="mt-0.5 font-medium text-brand-navy">{detail.subject}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Tipo</p>
                <div className="mt-1">
                  <ActivityTypeBadge type={detail.type} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Estado</p>
                <div className="mt-1">
                  <ActivityStatusBadge status={detail.status} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Cliente</p>
                <p className="mt-0.5 text-brand-navy">{detail.clientName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Vence</p>
                <p className="mt-0.5 text-brand-navy">{formatDateTime(detail.dueAt)}</p>
              </div>
            </div>
            {detail.opportunityTitle ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Oportunidad</p>
                <p className="mt-0.5 text-brand-navy">{detail.opportunityTitle}</p>
              </div>
            ) : null}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Descripción</p>
              <p className="mt-0.5 whitespace-pre-wrap text-brand-navy">{detail.body?.trim() || 'Sin descripción'}</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              {canEdit && detail.status !== 'CANCELLED' ? (
                <SecondaryButton
                  onClick={() => {
                    setDeleteTarget(detail)
                  }}
                >
                  Eliminar
                </SecondaryButton>
              ) : null}
              <PrimaryButton onClick={() => setDetail(null)}>Cerrar</PrimaryButton>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        title="Eliminar actividad"
        message={
          deleteTarget
            ? `¿Eliminar “${deleteTarget.subject}”? Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        loading={deleting}
        loadingLabel="Eliminando…"
      />
    </div>
  )
}
