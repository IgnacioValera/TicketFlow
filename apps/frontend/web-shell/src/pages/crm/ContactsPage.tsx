import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { CrmBadge } from '@/components/common/CrmBadge'
import { AppIcon } from '@/components/common/AppIcon'
import { DataTable, type Column } from '@/components/common/DataTable'
import { FormField } from '@/components/common/FormField'
import { Modal } from '@/components/common/Modal'
import { PageHeader } from '@/components/common/PageHeader'
import { TableActionButton } from '@/components/common/TableActionButton'
import { PrimaryButton, SecondaryButton, SelectInput, TextInput } from '@/components/common/UiControls'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import * as crm from '@/services/crm.service'
import type { ContactStatus, CrmClient, CrmContact } from '@/types/crm.types'

const STATUS_LABELS: Record<ContactStatus, string> = { ACTIVE: 'Activo', INACTIVE: 'Inactivo' }
const emptyForm = { clientId: '', firstName: '', lastName: '', email: '', phone: '', jobTitle: '', isPrimary: false }

type ContactForm = typeof emptyForm

export function ContactsPage() {
  const { hasPermission } = usePermissions()
  const [items, setItems] = useState<CrmContact[]>([])
  const [clients, setClients] = useState<CrmClient[]>([])
  const [meta, setMeta] = useState({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ search: '', clientId: '', status: '' })
  const [form, setForm] = useState<ContactForm>(emptyForm)
  const [editing, setEditing] = useState<CrmContact | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const canCreate = hasPermission(PERMISSIONS.CRM_CONTACT_CREATE)
  const canEdit = hasPermission(PERMISSIONS.CRM_CONTACT_EDIT)

  const load = useCallback(async () => {
    const query = Object.fromEntries(Object.entries(filters).filter(([, value]) => value))
    const response = await crm.getContacts({ page, perPage: 10, ...query })
    setItems(response.data)
    if (response.meta) setMeta(response.meta)
  }, [filters, page])

  useEffect(() => { void load().catch(() => setError('No se pudieron cargar los contactos.')) }, [load])
  useEffect(() => {
    void crm.getClients({ perPage: 100 }).then((response) => setClients(response.data)).catch(() => setError('No se pudieron cargar los clientes.'))
  }, [])

  function updateForm(values: Partial<ContactForm>) { setForm((current) => ({ ...current, ...values })) }
  function openCreate() { setEditing(null); setForm(emptyForm); setError(''); setOpen(true) }
  function openEdit(contact: CrmContact) {
    setEditing(contact)
    setForm({ clientId: contact.clientId, firstName: contact.firstName, lastName: contact.lastName, email: contact.email, phone: contact.phone, jobTitle: contact.jobTitle, isPrimary: contact.isPrimary })
    setError(''); setOpen(true)
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    if (!clients.length) { setError('No hay clientes disponibles para asociar el contacto.'); return }
    if (!form.clientId || !form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) { setError('Completa cliente, nombre, apellido y correo.'); return }
    try {
      if (editing) await crm.updateContact(editing.id, form)
      else await crm.createContact(form)
      setOpen(false); await load()
    } catch { setError('No se pudo guardar el contacto. Verifica los datos y la asociación con el cliente.') }
  }

  async function changeStatus(contact: CrmContact) {
    const nextStatus: ContactStatus = contact.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    if (!window.confirm(`¿${nextStatus === 'ACTIVE' ? 'Activar' : 'Desactivar'} este contacto?`)) return
    try { await crm.updateContactStatus(contact.id, nextStatus); await load() } catch { setError('No se pudo actualizar el estado del contacto.') }
  }

  const columns: Column<CrmContact>[] = [
    { key: 'firstName', header: 'Contacto', render: (row) => `${row.firstName} ${row.lastName}` },
    { key: 'email', header: 'Correo' },
    { key: 'phone', header: 'Teléfono', render: (row) => row.phone || '—' },
    { key: 'clientName', header: 'Cliente' },
    { key: 'jobTitle', header: 'Puesto', render: (row) => row.jobTitle || '—' },
    { key: 'status', header: 'Estado', render: (row) => <CrmBadge label={STATUS_LABELS[row.status]} tone={row.status === 'ACTIVE' ? 'success' : 'muted'} /> },
    { key: 'isPrimary', header: 'Principal', render: (row) => row.isPrimary ? 'Sí' : 'No' },
    { key: 'actions', header: 'Acciones', render: (row) => <div className="flex flex-wrap gap-2">
      {canEdit && <TableActionButton label="Editar" icon="edit" onClick={() => openEdit(row)} />}
      {canEdit && <TableActionButton label={row.status === 'ACTIVE' ? 'Desactivar' : 'Activar'} icon={row.status === 'ACTIVE' ? 'pause' : 'check'} variant={row.status === 'ACTIVE' ? 'danger' : 'success'} onClick={() => void changeStatus(row)} />}
    </div> },
  ]

  return <div className="space-y-4">
    <PageHeader kicker="CRM" title="Contactos" description="Personas de contacto asociadas a cada cliente." actions={canCreate ? <PrimaryButton onClick={openCreate} disabled={!clients.length}>+ Nuevo contacto</PrimaryButton> : undefined} />
    <div className="grid gap-3 md:grid-cols-3">
      <TextInput placeholder="Buscar contactos..." value={filters.search} onChange={(e) => { setPage(1); setFilters({ ...filters, search: e.target.value }) }} />
      <SelectInput value={filters.clientId} onChange={(e) => { setPage(1); setFilters({ ...filters, clientId: e.target.value }) }}><option value="">Todos los clientes</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</SelectInput>
      <SelectInput value={filters.status} onChange={(e) => { setPage(1); setFilters({ ...filters, status: e.target.value }) }}><option value="">Todos los estados</option><option value="ACTIVE">Activo</option><option value="INACTIVE">Inactivo</option></SelectInput>
    </div>
    {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    {!clients.length && canCreate && <div className="flex items-center gap-2 text-sm text-slate-500"><AppIcon name="companies" className="h-4 w-4" />No hay clientes disponibles. Crea un cliente antes de registrar contactos.</div>}
    <DataTable columns={columns} data={items} pagination={meta} onPageChange={setPage} rowKey={(row) => row.id} emptyMessage="No hay contactos" emptyDescription="No hay contactos con los filtros seleccionados." emptyAction={canCreate && clients.length ? <PrimaryButton onClick={openCreate}>Crear contacto</PrimaryButton> : undefined} />
    <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar contacto' : 'Nuevo contacto'}><form onSubmit={(event) => void submit(event)} className="space-y-3">
      <FormField label="Cliente" required><SelectInput required disabled={Boolean(editing)} value={form.clientId} onChange={(e) => updateForm({ clientId: e.target.value })}><option value="">Seleccionar cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</SelectInput></FormField>
      <div className="grid gap-3 sm:grid-cols-2"><FormField label="Nombre" required><TextInput required maxLength={80} value={form.firstName} onChange={(e) => updateForm({ firstName: e.target.value })} /></FormField><FormField label="Apellido" required><TextInput required maxLength={80} value={form.lastName} onChange={(e) => updateForm({ lastName: e.target.value })} /></FormField></div>
      <FormField label="Correo" required><TextInput required type="email" maxLength={200} value={form.email} onChange={(e) => updateForm({ email: e.target.value })} /></FormField>
      <div className="grid gap-3 sm:grid-cols-2"><FormField label="Teléfono"><TextInput maxLength={40} pattern="[0-9+().\-\s]{7,40}" title="Ingresa un teléfono válido" value={form.phone} onChange={(e) => updateForm({ phone: e.target.value })} /></FormField><FormField label="Puesto"><TextInput maxLength={120} value={form.jobTitle} onChange={(e) => updateForm({ jobTitle: e.target.value })} /></FormField></div>
      <label className="flex items-center gap-2 text-sm text-brand-navy"><input type="checkbox" checked={form.isPrimary} onChange={(e) => updateForm({ isPrimary: e.target.checked })} />Contacto principal</label>
      <div className="flex justify-end gap-2 pt-2"><SecondaryButton onClick={() => setOpen(false)}>Cancelar</SecondaryButton><PrimaryButton type="submit">Guardar</PrimaryButton></div>
    </form></Modal>
  </div>
}
