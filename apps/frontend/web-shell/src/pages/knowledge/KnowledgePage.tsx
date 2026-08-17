import { useEffect, useState, type FormEvent } from 'react'
import { EmptyState } from '@/components/common/EmptyState'
import { FormField } from '@/components/common/FormField'
import { Modal } from '@/components/common/Modal'
import { PageHeader } from '@/components/common/PageHeader'
import { PrimaryButton, SecondaryButton, SelectInput, TextArea, TextInput } from '@/components/common/UiControls'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import * as crm from '@/services/crm.service'
import * as categoriesService from '@/services/categories.service'
import type { Category } from '@/types/catalog.types'

export function KnowledgePage() {
  const { hasPermission } = usePermissions()
  const [items, setItems] = useState<
    Array<{ id: string; title: string; content: string; tags: string; category: { name: string } | null }>
  >([])
  const [categories, setCategories] = useState<Category[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', tags: '', categoryId: '' })

  const load = async () => setItems(await crm.getKnowledge())
  useEffect(() => {
    void load()
  }, [])
  useEffect(() => {
    void categoriesService.getCategories({ status: 'ACTIVE', perPage: 100 }).then((r) => setCategories(r.data))
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    await crm.createKnowledge({ ...form, categoryId: form.categoryId || undefined })
    setOpen(false)
    await load()
  }

  return (
    <div className="space-y-4">
      <PageHeader
        kicker="Help Desk"
        title="Base de conocimiento"
        description="Artículos de apoyo para resolver tickets con mayor rapidez."
        actions={
          hasPermission(PERMISSIONS.KNOWLEDGE_MANAGE) ? (
            <PrimaryButton onClick={() => setOpen(true)}>+ Nuevo artículo</PrimaryButton>
          ) : undefined
        }
      />
      {items.length === 0 ? (
        <EmptyState title="No hay información disponible" description="Aún no hay artículos publicados." />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded border border-slate-200 bg-white">
          {items.map((item) => (
            <li key={item.id} className="p-4">
              <p className="font-medium text-brand-navy">{item.title}</p>
              <p className="text-xs text-slate-500">
                {item.category?.name || 'Sin categoría'}
                {item.tags ? ` · ${item.tags}` : ''}
              </p>
              <p className="mt-2 text-sm text-slate-700">{item.content}</p>
            </li>
          ))}
        </ul>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Artículo" size="lg">
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <FormField label="Título" required>
            <TextInput required minLength={4} value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} />
          </FormField>
          <FormField label="Contenido" required>
            <TextArea required minLength={20} rows={6} value={form.content} onChange={(e) => setForm((c) => ({ ...c, content: e.target.value }))} />
          </FormField>
          <FormField label="Etiquetas">
            <TextInput value={form.tags} onChange={(e) => setForm((c) => ({ ...c, tags: e.target.value }))} />
          </FormField>
          <FormField label="Categoría">
            <SelectInput value={form.categoryId} onChange={(e) => setForm((c) => ({ ...c, categoryId: e.target.value }))}>
              <option value="">Sin categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={() => setOpen(false)}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit">Publicar</PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
