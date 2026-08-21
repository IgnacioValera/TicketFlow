import { useAppSearchParams } from '@/hooks/useAppSearchParams'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AppIcon } from '@/components/common/AppIcon'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ConfirmToast, FeedbackAlert } from '@/components/common/FeedbackAlert'
import { FormField } from '@/components/common/FormField'
import { ConfirmModal, Modal } from '@/components/common/Modal'
import { SearchableSelect } from '@/components/common/SearchableSelect'
import { TableActionButton } from '@/components/common/TableActionButton'
import { PrimaryButton, SecondaryButton, TextInput } from '@/components/common/UiControls'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import * as crm from '@/services/crm.service'
import type { CrmClient, CrmContact } from '@/types/crm.types'
import { EMPTY_CONTACT_FORM, validateContactForm, type ContactFormValues } from '@/utils/contact-form'
import { getErrorMessages } from '@/utils/errors'
import { createSubmitLock } from '@/utils/submit-lock'

export function ContactsPage() {
  const { hasPermission } = usePermissions()
  const [searchParams, setSearchParams] = useAppSearchParams()
  const canEdit = hasPermission(PERMISSIONS.CRM_CONTACT_EDIT)
  const canDelete = hasPermission(PERMISSIONS.CRM_CONTACT_DELETE)
  const [items, setItems] = useState<CrmContact[]>([])
  const [clients, setClients] = useState<CrmClient[]>([])
  const [meta, setMeta] = useState({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CrmContact | null>(null)
  const [form, setForm] = useState<ContactFormValues>(EMPTY_CONTACT_FORM)
  const [fieldErrors, setFieldErrors] = useState<ReturnType<typeof validateContactForm>>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toDelete, setToDelete] = useState<CrmContact | null>(null)
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null)
  const [submitLock] = useState(() => createSubmitLock())

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

  useEffect(() => {
    const editId = searchParams.get('editar')
    const deleteId = searchParams.get('eliminar')
    if ((!editId && !deleteId) || items.length === 0) return
    const next = new URLSearchParams(searchParams)
    if (editId) {
      const found = items.find((item) => item.id === editId)
      if (found) openEdit(found)
      next.delete('editar')
    }
    if (deleteId) {
      const found = items.find((item) => item.id === deleteId)
      if (found) setToDelete(found)
      next.delete('eliminar')
    }
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, items])

  const resetForm = () => {
    setOpen(false)
    setEditing(null)
    setForm(EMPTY_CONTACT_FORM)
    setFieldErrors({})
    setFormError('')
  }

  const closeForm = () => {
    if (saving) return
    resetForm()
  }

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_CONTACT_FORM)
    setFieldErrors({})
    setFormError('')
    setOpen(true)
  }

  const openEdit = (item: CrmContact) => {
    setEditing(item)
    setForm({
      clientId: item.clientId,
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      phone: item.phone,
      jobTitle: item.jobTitle,
    })
    setFieldErrors({})
    setFormError('')
    setOpen(true)
  }

  const columns: Column<CrmContact>[] = useMemo(
    () => [
      { key: 'firstName', header: 'Contacto', render: (row) => `${row.firstName} ${row.lastName}` },
      { key: 'email', header: 'Correo' },
      { key: 'phone', header: 'Teléfono', render: (row) => row.phone || '—' },
      { key: 'clientName', header: 'Cliente' },
      { key: 'jobTitle', header: 'Puesto', render: (row) => row.jobTitle || '—' },
      { key: 'isPrimary', header: 'Principal', render: (row) => (row.isPrimary ? 'Sí' : 'No') },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'sticky right-0 bg-white whitespace-nowrap',
        render: (row) => (
          <div className="flex flex-nowrap items-center gap-2">
            {canEdit && (
              <TableActionButton label="Editar contacto" icon="edit" onClick={() => openEdit(row)} />
            )}
            {canDelete && (
              <TableActionButton
                label="Eliminar contacto"
                icon="trash"
                variant="danger"
                onClick={() => setToDelete(row)}
              />
            )}
          </div>
        ),
      },
    ],
    [canDelete, canEdit],
  )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (saving || submitLock.pending) return
    const errors = validateContactForm(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    let shouldReload = false
    await submitLock.run(async () => {
      setSaving(true)
      setFormError('')
      try {
        if (editing) {
          const updated = await crm.updateContact(editing.id, form)
          setToast({
            title: 'Contacto actualizado',
            message: `${updated.firstName} ${updated.lastName} se guardó en la cartera.`,
          })
        } else {
          const created = await crm.createContact(form)
          setToast({
            title: 'Contacto creado',
            message: `${created.firstName} ${created.lastName} se asoció a ${created.clientName}.`,
          })
        }
        resetForm()
        shouldReload = true
      } catch (err: unknown) {
        setFormError(getErrorMessages(err, 'No se pudo guardar el contacto.')[0])
      } finally {
        setSaving(false)
      }
    })
    if (shouldReload) await load()
  }

  const confirmDelete = async () => {
    if (!toDelete || deleting || !canDelete) return
    setDeleting(true)
    try {
      await crm.deleteContact(toDelete.id)
      setToast({
        title: 'Contacto eliminado',
        message: `${toDelete.firstName} ${toDelete.lastName} ya no aparece en la cartera.`,
      })
      setToDelete(null)
      await load()
    } catch (err: unknown) {
      setToast({
        title: 'No se pudo eliminar',
        message: getErrorMessages(err, 'No se pudo eliminar el contacto.')[0],
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
            <PrimaryButton onClick={openCreate}>
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
            <PrimaryButton onClick={openCreate}>
              <AppIcon name="plus" className="h-4 w-4" />
              Crear contacto
            </PrimaryButton>
          ) : undefined
        }
      />
      <Modal open={open} onClose={closeForm} title={editing ? 'Editar contacto' : 'Nuevo contacto'}>
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          {formError ? <FeedbackAlert variant="danger" title="No se pudo guardar" message={formError} /> : null}
          <FormField label="Cliente" htmlFor="contact-client" required error={fieldErrors.clientId}>
            <SearchableSelect
              id="contact-client"
              value={form.clientId}
              onChange={(clientId) => {
                setForm((c) => ({ ...c, clientId }))
                setFieldErrors((current) => ({ ...current, clientId: undefined }))
              }}
              options={clients.map((client) => ({ value: client.id, label: client.name }))}
              placeholder="Seleccionar cliente"
              searchPlaceholder="Buscar cliente..."
              emptyMessage="No hay clientes disponibles"
              noResultsMessage="Ningún cliente coincide con la búsqueda"
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Nombre" htmlFor="contact-first-name" required error={fieldErrors.firstName}>
              <TextInput id="contact-first-name" required value={form.firstName} onChange={(e) => setForm((c) => ({ ...c, firstName: e.target.value }))} />
            </FormField>
            <FormField label="Apellido" htmlFor="contact-last-name" required error={fieldErrors.lastName}>
              <TextInput id="contact-last-name" required value={form.lastName} onChange={(e) => setForm((c) => ({ ...c, lastName: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Correo" htmlFor="contact-email" required error={fieldErrors.email}>
            <TextInput id="contact-email" required type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Teléfono" htmlFor="contact-phone">
              <TextInput id="contact-phone" value={form.phone} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} />
            </FormField>
            <FormField label="Puesto" htmlFor="contact-job" error={fieldErrors.jobTitle}>
              <TextInput id="contact-job" value={form.jobTitle} onChange={(e) => setForm((c) => ({ ...c, jobTitle: e.target.value }))} />
            </FormField>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton type="button" onClick={closeForm} disabled={saving}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit" disabled={saving} loading={saving} loadingText="Guardando…">
              Guardar
            </PrimaryButton>
          </div>
        </form>
      </Modal>
      <ConfirmModal
        open={Boolean(toDelete)}
        onClose={() => !deleting && setToDelete(null)}
        onConfirm={() => void confirmDelete()}
        title="¿Eliminar contacto?"
        message={`El contacto “${toDelete ? `${toDelete.firstName} ${toDelete.lastName}` : ''}” dejará de aparecer en la cartera. Esta acción no debe eliminar el cliente, sus oportunidades ni información relacionada.`}
        confirmLabel="Eliminar contacto"
        cancelLabel="Cancelar"
        variant="danger"
        loading={deleting}
        loadingLabel="Eliminando…"
      />
    </div>
  )
}
