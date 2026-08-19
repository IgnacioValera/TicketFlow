import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ClientSegmentBadge,
  ClientStatusBadge,
  ClientTierBadge,
} from '@/components/common/CrmBadge'
import { DataTable, type Column } from '@/components/common/DataTable'
import { AppIcon } from '@/components/common/AppIcon'
import { ConfirmToast } from '@/components/common/FeedbackAlert'
import { ErrorState } from '@/components/common/ErrorState'
import { FormField } from '@/components/common/FormField'
import { Modal } from '@/components/common/Modal'
import { PageHeader } from '@/components/common/PageHeader'
import { PrimaryButton, SecondaryButton, SelectInput, TextInput } from '@/components/common/UiControls'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import * as crm from '@/services/crm.service'
import type { ClientSegment, ClientStatus, ClientTier, CrmClient } from '@/types/crm.types'
import {
  buildClientPayload,
  mapClientApiError,
  validateClientForm,
  type ClientFormErrors,
  type ClientFormValues,
} from '@/utils/client-form'
import { getErrorMessages } from '@/utils/errors'
import {
  CLIENT_SEGMENT_LABELS,
  CLIENT_STATUS_LABELS,
  CLIENT_TIER_LABELS,
} from '@/utils/labels'

const EMPTY: ClientFormValues = {
  name: '',
  industry: '',
  region: '',
  tier: 'BRONZE',
  segment: 'SMB',
  email: '',
  phone: '',
  status: 'PROSPECT',
}

export function ClientsListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasPermission } = usePermissions()
  const [items, setItems] = useState<CrmClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CrmClient | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [fieldErrors, setFieldErrors] = useState<ClientFormErrors>({})
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null)

  useEffect(() => {
    if (searchParams.get('nuevo') === '1') {
      openCreate()
      const next = new URLSearchParams(searchParams)
      next.delete('nuevo')
      setSearchParams(next, { replace: true })
      return
    }
    const editId = searchParams.get('editar')
    if (!editId) return
    void crm.getClient(editId).then((client) => {
      openEdit(client)
      const next = new URLSearchParams(searchParams)
      next.delete('editar')
      setSearchParams(next, { replace: true })
    })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 6000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await crm.getClients({
        page,
        perPage: 10,
        search: search || undefined,
        segment: segment || undefined,
        status: status || undefined,
      })
      setItems(response.data)
      if (response.meta) setMeta(response.meta)
      setError('')
    } catch (err: unknown) {
      setError(getErrorMessages(err, 'No se pudo cargar la información.')[0])
    } finally {
      setLoading(false)
    }
  }, [page, search, segment, status])

  useEffect(() => {
    void load()
  }, [load])

  const hasFilters = Boolean(searchInput || segment || status)

  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setSegment('')
    setStatus('')
    setPage(1)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await crm.exportClientsCsv({
        search: (searchInput.trim() || search) || undefined,
        segment: segment || undefined,
        status: status || undefined,
      })
    } catch (err: unknown) {
      setError(getErrorMessages(err, 'No se pudo exportar la cartera de clientes.')[0])
    } finally {
      setExporting(false)
    }
  }

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setFieldErrors({})
    setOpen(true)
  }

  const openEdit = (client: CrmClient) => {
    setEditing(client)
    setForm({
      name: client.name,
      industry: client.industry,
      region: client.region,
      tier: client.tier,
      segment: client.segment,
      email: client.email,
      phone: client.phone,
      status: client.status,
    })
    setFieldErrors({})
    setOpen(true)
  }

  const resetForm = () => {
    setOpen(false)
    setEditing(null)
    setForm(EMPTY)
    setFieldErrors({})
  }

  const closeForm = () => {
    if (saving) return
    resetForm()
  }

  const columns: Column<CrmClient>[] = useMemo(
    () => [
      { key: 'name', header: 'Cliente', render: (row) => <span className="font-semibold">{row.name}</span> },
      { key: 'industry', header: 'Industria', render: (row) => row.industry || '—' },
      { key: 'region', header: 'Región', render: (row) => row.region || '—' },
      { key: 'segment', header: 'Segmento', render: (row) => <ClientSegmentBadge segment={row.segment} /> },
      { key: 'tier', header: 'Nivel', render: (row) => <ClientTierBadge tier={row.tier} /> },
      { key: 'ownerName', header: 'Responsable', render: (row) => row.ownerName || 'Sin asignar' },
      { key: 'score', header: 'Puntuación' },
      { key: 'status', header: 'Estado', render: (row) => <ClientStatusBadge status={row.status} /> },
      {
        key: 'actions',
        header: 'Acciones',
        render: (row) =>
          hasPermission(PERMISSIONS.CRM_CLIENT_EDIT) ? (
            <button
              type="button"
              className="text-sm font-medium text-brand-teal hover:underline"
              onClick={(event) => {
                event.stopPropagation()
                openEdit(row)
              }}
            >
              Editar
            </button>
          ) : (
            '—'
          ),
      },
    ],
    [hasPermission],
  )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (saving) return
    const nextErrors = validateClientForm(form)
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSaving(true)
    setError('')
    try {
      const payload = buildClientPayload(form)
      const wasEditing = Boolean(editing)
      if (editing) await crm.updateClient(editing.id, payload)
      else await crm.createClient(payload)
      resetForm()
      await load()
      setToast({
        title: wasEditing ? 'Cliente actualizado' : 'Cliente creado',
        message: wasEditing
          ? `${payload.name} se actualizó correctamente.`
          : `${payload.name} se agregó a la cartera.`,
      })
    } catch (err: unknown) {
      const mapped = mapClientApiError((err as { message?: unknown }).message)
      if (Object.keys(mapped).length) setFieldErrors(mapped)
      else setError(getErrorMessages(err, 'Se produjo un error al guardar.')[0])
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        kicker="CRM"
        title="Clientes"
        description="Gestiona la cartera de clientes y sus relaciones comerciales."
        actions={
          <>
            {hasPermission(PERMISSIONS.CRM_EXPORT) && (
              <SecondaryButton disabled={exporting} onClick={() => void handleExport()}>
                {exporting ? 'Exportando...' : 'Exportar'}
              </SecondaryButton>
            )}
            {hasPermission(PERMISSIONS.CRM_CLIENT_CREATE) && (
              <PrimaryButton onClick={openCreate}>+ Nuevo cliente</PrimaryButton>
            )}
          </>
        }
      />
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <TextInput
            className="max-w-xs"
            placeholder="Buscar clientes..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {hasFilters && <SecondaryButton onClick={clearFilters}>Limpiar filtros</SecondaryButton>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative min-w-0">
            <select
              aria-label="Segmento"
              value={segment}
              onChange={(e) => {
                setSegment(e.target.value)
                setPage(1)
              }}
              className="w-full appearance-none rounded-lg border border-border bg-white px-3 py-2.5 pr-9 text-sm text-brand-navy shadow-sm"
            >
              <option value="">Todos los segmentos</option>
              {(Object.keys(CLIENT_SEGMENT_LABELS) as ClientSegment[]).map((item) => (
                <option key={item} value={item}>
                  {CLIENT_SEGMENT_LABELS[item]}
                </option>
              ))}
            </select>
            <AppIcon
              name="chevron-down"
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
          </div>
          <div className="relative min-w-0">
            <select
              aria-label="Estado"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
              className="w-full appearance-none rounded-lg border border-border bg-white px-3 py-2.5 pr-9 text-sm text-brand-navy shadow-sm"
            >
              <option value="">Todos los estados</option>
              {(Object.keys(CLIENT_STATUS_LABELS) as ClientStatus[]).map((item) => (
                <option key={item} value={item}>
                  {CLIENT_STATUS_LABELS[item]}
                </option>
              ))}
            </select>
            <AppIcon
              name="chevron-down"
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>
      </div>
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        pagination={meta}
        onPageChange={setPage}
        rowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/crm/clients/${row.id}`)}
        emptyMessage="No hay clientes"
        emptyDescription={
          hasFilters
            ? 'No hay clientes que coincidan con los filtros.'
            : 'Aún no hay clientes registrados.'
        }
        emptyAction={
          hasFilters ? (
            <SecondaryButton onClick={clearFilters}>Limpiar filtros</SecondaryButton>
          ) : hasPermission(PERMISSIONS.CRM_CLIENT_CREATE) ? (
            <PrimaryButton onClick={openCreate}>Crear cliente</PrimaryButton>
          ) : undefined
        }
      />
      <ConfirmToast open={Boolean(toast)} title={toast?.title ?? ''} message={toast?.message ?? ''} />
      <Modal open={open} onClose={closeForm} title={editing ? 'Editar cliente' : 'Nuevo cliente'}>
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <FormField label="Nombre" required error={fieldErrors.name}>
            <TextInput value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Industria" required error={fieldErrors.industry}>
              <TextInput value={form.industry} onChange={(e) => setForm((c) => ({ ...c, industry: e.target.value }))} />
            </FormField>
            <FormField label="Región" required error={fieldErrors.region}>
              <TextInput value={form.region} onChange={(e) => setForm((c) => ({ ...c, region: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Correo" required error={fieldErrors.email}>
              <TextInput type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
            </FormField>
            <FormField label="Teléfono" required error={fieldErrors.phone}>
              <TextInput
                inputMode="numeric"
                maxLength={10}
                value={form.phone}
                onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value.slice(0, 10) }))}
              />
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Nivel">
              <SelectInput value={form.tier} onChange={(e) => setForm((c) => ({ ...c, tier: e.target.value as ClientTier }))}>
                {(Object.keys(CLIENT_TIER_LABELS) as ClientTier[]).map((tier) => (
                  <option key={tier} value={tier}>
                    {CLIENT_TIER_LABELS[tier]}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            <FormField label="Segmento">
              <SelectInput value={form.segment} onChange={(e) => setForm((c) => ({ ...c, segment: e.target.value as ClientSegment }))}>
                {(Object.keys(CLIENT_SEGMENT_LABELS) as ClientSegment[]).map((item) => (
                  <option key={item} value={item}>
                    {CLIENT_SEGMENT_LABELS[item]}
                  </option>
                ))}
              </SelectInput>
            </FormField>
          </div>
          <FormField label="Estado">
            <SelectInput value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as ClientStatus }))}>
              {(Object.keys(CLIENT_STATUS_LABELS) as ClientStatus[]).map((item) => (
                <option key={item} value={item}>
                  {CLIENT_STATUS_LABELS[item]}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton onClick={closeForm} disabled={saving}>
              Cancelar
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
