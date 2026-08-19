import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ClientSegmentBadge,
  ClientStatusBadge,
  ClientTierBadge,
} from '@/components/common/CrmBadge'
import { DataTable, type Column } from '@/components/common/DataTable'
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
  CLIENT_SEGMENT_LABELS,
  CLIENT_STATUS_LABELS,
  CLIENT_TIER_LABELS,
} from '@/utils/labels'

const EMPTY = {
  name: '',
  industry: '',
  region: '',
  tier: 'BRONZE' as ClientTier,
  segment: 'SMB' as ClientSegment,
  email: '',
  phone: '',
  status: 'PROSPECT' as ClientStatus,
}

export function ClientsListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasPermission } = usePermissions()
  const [items, setItems] = useState<CrmClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [meta, setMeta] = useState({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (searchParams.get('nuevo') !== '1') return
    setOpen(true)
    const next = new URLSearchParams(searchParams)
    next.delete('nuevo')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await crm.getClients({
        page,
        perPage,
        search: search || undefined,
        segment: segment || undefined,
        status: status || undefined,
      })
      setItems(response.data)
      if (response.meta) setMeta(response.meta)
      setError('')
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'No se pudo cargar la información.')
    } finally {
      setLoading(false)
    }
  }, [page, perPage, search, segment, status])

  useEffect(() => {
    void load()
  }, [load])

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
    ],
    [],
  )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await crm.createClient(form)
      setOpen(false)
      setForm(EMPTY)
      await load()
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Se produjo un error al guardar.')
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
              <SecondaryButton onClick={() => void crm.exportClientsCsv({ search, segment, status })}>
                Exportar
              </SecondaryButton>
            )}
            {hasPermission(PERMISSIONS.CRM_CLIENT_CREATE) && (
              <PrimaryButton onClick={() => setOpen(true)}>+ Nuevo cliente</PrimaryButton>
            )}
          </>
        }
      />
      <div className="flex flex-wrap gap-2">
        <TextInput
          className="max-w-xs"
          placeholder="Buscar clientes..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <SelectInput
          className="w-44"
          value={segment}
          onChange={(e) => {
            setSegment(e.target.value)
            setPage(1)
          }}
        >
          <option value="">Todos los segmentos</option>
          {(Object.keys(CLIENT_SEGMENT_LABELS) as ClientSegment[]).map((item) => (
            <option key={item} value={item}>
              {CLIENT_SEGMENT_LABELS[item]}
            </option>
          ))}
        </SelectInput>
        <SelectInput
          className="w-40"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
        >
          <option value="">Todos los estados</option>
          {(Object.keys(CLIENT_STATUS_LABELS) as ClientStatus[]).map((item) => (
            <option key={item} value={item}>
              {CLIENT_STATUS_LABELS[item]}
            </option>
          ))}
        </SelectInput>
      </div>
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        pagination={{ ...meta, page, perPage }}
        onPageChange={setPage}
        onPerPageChange={(value) => {
          setPerPage(value)
          setPage(1)
        }}
        rowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/crm/clients/${row.id}`)}
        emptyMessage="No hay clientes"
        emptyDescription="Aún no hay clientes registrados."
        emptyAction={
          hasPermission(PERMISSIONS.CRM_CLIENT_CREATE) ? (
            <PrimaryButton onClick={() => setOpen(true)}>Crear cliente</PrimaryButton>
          ) : undefined
        }
      />
      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo cliente">
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <FormField label="Nombre" required>
            <TextInput required value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Industria" required>
              <TextInput required value={form.industry} onChange={(e) => setForm((c) => ({ ...c, industry: e.target.value }))} />
            </FormField>
            <FormField label="Región" required>
              <TextInput required value={form.region} onChange={(e) => setForm((c) => ({ ...c, region: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Correo" required>
              <TextInput required type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
            </FormField>
            <FormField label="Teléfono" required>
              <TextInput required value={form.phone} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} />
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
          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton onClick={() => setOpen(false)}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
