import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AppIcon } from '@/components/common/AppIcon'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ConfirmToast } from '@/components/common/FeedbackAlert'
import { FormField } from '@/components/common/FormField'
import { Modal } from '@/components/common/Modal'
import { SearchableSelect } from '@/components/common/SearchableSelect'
import { PrimaryButton, SecondaryButton, TextInput } from '@/components/common/UiControls'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import * as crm from '@/services/crm.service'
import type { CrmClient, CrmContact } from '@/types/crm.types'

export function ContactsPage() {
  const { hasPermission } = usePermissions()
  const [items, setItems] = useState<CrmContact[]>([])
  const [clients, setClients] = useState<CrmClient[]>([])
  const [meta, setMeta] = useState({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ clientId: '', firstName: '', lastName: '', email: '', phone: '', jobTitle: '' })
  const [clientError, setClientError] = useState('')
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 6000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const load = useCallback(async () => {
    const response = await crm.getContacts({
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
    void crm.getClients({ perPage: 100 }).then((response) => setClients(response.data))
  }, [])

  const columns: Column<CrmContact>[] = useMemo(
    () => [
      { key: 'firstName', header: 'Contacto', render: (row) => `${row.firstName} ${row.lastName}` },
      { key: 'email', header: 'Correo' },
      { key: 'phone', header: 'Teléfono', render: (row) => row.phone || '—' },
      { key: 'clientName', header: 'Cliente' },
      { key: 'jobTitle', header: 'Puesto', render: (row) => row.jobTitle || '—' },
      { key: 'isPrimary', header: 'Principal', render: (row) => (row.isPrimary ? 'Sí' : 'No') },
    ],
    [],
  )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.clientId) {
      setClientError('Selecciona un cliente')
      return
    }
    const created = await crm.createContact(form)
    setOpen(false)
    setForm({ clientId: '', firstName: '', lastName: '', email: '', phone: '', jobTitle: '' })
    await load()
    setToast({
      title: 'Contacto creado',
      message: `${created.firstName} ${created.lastName} se asoció a ${created.clientName}.`,
    })
  }

  return (
    <div className="space-y-4">
      <ConfirmToast open={Boolean(toast)} title={toast?.title ?? ''} message={toast?.message ?? ''} />
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full max-w-xs">
          <TextInput
            placeholder="Buscar contactos..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        {hasPermission(PERMISSIONS.CRM_CONTACT_CREATE) && (
          <div className="ml-auto">
            <PrimaryButton onClick={() => setOpen(true)}>
              <AppIcon name="plus" className="h-4 w-4" />
              Nuevo contacto
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
        emptyMessage="No hay contactos"
        emptyDescription="Aún no hay contactos registrados."
        emptyAction={
          hasPermission(PERMISSIONS.CRM_CONTACT_CREATE) ? (
            <PrimaryButton onClick={() => setOpen(true)}>
              <AppIcon name="plus" className="h-4 w-4" />
              Crear contacto
            </PrimaryButton>
          ) : undefined
        }
      />
      <Modal open={open} onClose={() => {
        setOpen(false)
        setClientError('')
      }} title="Nuevo contacto">
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <FormField label="Cliente" htmlFor="contact-client" required error={clientError}>
            <SearchableSelect
              id="contact-client"
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
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Nombre" required>
              <TextInput required value={form.firstName} onChange={(e) => setForm((c) => ({ ...c, firstName: e.target.value }))} />
            </FormField>
            <FormField label="Apellido" required>
              <TextInput required value={form.lastName} onChange={(e) => setForm((c) => ({ ...c, lastName: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Correo" required>
            <TextInput required type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Teléfono">
              <TextInput value={form.phone} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} />
            </FormField>
            <FormField label="Puesto">
              <TextInput value={form.jobTitle} onChange={(e) => setForm((c) => ({ ...c, jobTitle: e.target.value }))} />
            </FormField>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton onClick={() => setOpen(false)}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit">Guardar</PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
