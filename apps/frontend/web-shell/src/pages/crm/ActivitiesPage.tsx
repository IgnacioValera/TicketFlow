import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ActivityStatusBadge, ActivityTypeBadge } from '@/components/common/CrmBadge'
import { DataTable, type Column } from '@/components/common/DataTable'
import { FormField } from '@/components/common/FormField'
import { Modal } from '@/components/common/Modal'
import { PageHeader } from '@/components/common/PageHeader'
import { PrimaryButton, SecondaryButton, SelectInput, TextArea, TextInput } from '@/components/common/UiControls'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import * as crm from '@/services/crm.service'
import type { ActivityType, CrmActivity, CrmClient } from '@/types/crm.types'
import { ACTIVITY_TYPE_LABELS, formatDateTime } from '@/utils/labels'

export function ActivitiesPage() {
  const { hasPermission } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<CrmActivity[]>([])
  const [clients, setClients] = useState<CrmClient[]>([])
  const [meta, setMeta] = useState({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ clientId: '', type: 'CALL' as ActivityType, subject: '', body: '', dueAt: '' })

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
    })
    setItems(response.data)
    if (response.meta) setMeta(response.meta)
  }, [page, perPage, search])
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
            <button
              type="button"
              className="text-sm font-medium text-brand-teal hover:underline"
              onClick={() => void crm.completeActivity(row.id).then(load)}
            >
              Completar
            </button>
          ) : (
            '—'
          ),
      },
    ],
    [hasPermission, load],
  )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    await crm.createActivity({ ...form, dueAt: form.dueAt || undefined })
    setOpen(false)
    await load()
  }

  return (
    <div className="space-y-4">
      <PageHeader
        kicker="CRM"
        title="Actividades"
        description="Llamadas, reuniones, tareas y notas de seguimiento comercial."
        actions={
          hasPermission(PERMISSIONS.CRM_ACTIVITY_CREATE) ? (
            <PrimaryButton onClick={() => setOpen(true)}>+ Nueva actividad</PrimaryButton>
          ) : undefined
        }
      />
      <TextInput
        className="max-w-xs"
        placeholder="Buscar actividades..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(1)
        }}
      />
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
        emptyDescription="No hay actividades pendientes."
        emptyAction={
          hasPermission(PERMISSIONS.CRM_ACTIVITY_CREATE) ? (
            <PrimaryButton onClick={() => setOpen(true)}>Crear actividad</PrimaryButton>
          ) : undefined
        }
      />
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva actividad">
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
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
