import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AppIcon } from '@/components/common/AppIcon'
import { ConfirmModal, Modal } from '@/components/common/Modal'
import { EmptyState } from '@/components/common/EmptyState'
import { FormField } from '@/components/common/FormField'
import { PageHeader } from '@/components/common/PageHeader'
import { SurfaceCard } from '@/components/common/SurfaceCard'
import { PrimaryButton, SecondaryButton, SelectInput, TextArea, TextInput } from '@/components/common/UiControls'
import { TableActionButton } from '@/components/common/TableActionButton'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import * as crm from '@/services/crm.service'
import * as categoriesService from '@/services/categories.service'
import type { Category } from '@/types/catalog.types'
import {
  knowledgeExcerpt,
  knowledgeTopic,
  parseKnowledgeTags,
  type KnowledgeArticle,
} from '@/types/knowledge.types'
import { errorMessage } from '@/utils/validation'

const EMPTY_FORM = { title: '', content: '', tags: '', categoryId: '' }

export function KnowledgePage() {
  const { hasPermission } = usePermissions()
  const canManage = hasPermission(PERMISSIONS.KNOWLEDGE_MANAGE)
  const location = useLocation()
  const navigate = useNavigate()
  const [items, setItems] = useState<KnowledgeArticle[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [topicFilter, setTopicFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<KnowledgeArticle | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeArticle | null>(null)
  const [saving, setSaving] = useState(false)

  const load = async (query = search) => {
    setItems(await crm.getKnowledge(query || undefined))
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    void categoriesService.getCategories({ status: 'ACTIVE', perPage: 100 }).then((r) => setCategories(r.data))
  }, [])

  useEffect(() => {
    const editId = (location.state as { editId?: string } | null)?.editId
    if (!editId || items.length === 0) return
    const article = items.find((item) => item.id === editId)
    if (article) openEdit(article)
    navigate(location.pathname, { replace: true, state: null })
  }, [items, location.pathname, location.state, navigate])

  const topics = useMemo(() => {
    return [...new Set(items.map((item) => knowledgeTopic(item)))].sort((a, b) => a.localeCompare(b, 'es'))
  }, [items])

  const visible = useMemo(() => {
    return items.filter((item) => !topicFilter || knowledgeTopic(item) === topicFilter)
  }, [items, topicFilter])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setOpen(true)
  }

  const openEdit = (article: KnowledgeArticle) => {
    setEditing(article)
    setForm({
      title: article.title,
      content: article.content,
      tags: article.tags,
      categoryId: article.category?.id ?? '',
    })
    setError('')
    setOpen(true)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const categoryValue = form.categoryId.trim()
      const base = {
        title: form.title.trim(),
        content: form.content.trim(),
        tags: form.tags.trim() || undefined,
      }
      if (editing) {
        await crm.updateKnowledge(editing.id, {
          ...base,
          categoryId: categoryValue ? categoryValue : null,
        })
      } else {
        await crm.createKnowledge({
          ...base,
          ...(categoryValue ? { categoryId: categoryValue } : {}),
        })
      }
      setOpen(false)
      await load()
    } catch (err: unknown) {
      setError(errorMessage(err, 'No se pudo guardar el artículo'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!deleteTarget) return
    await crm.deleteKnowledge(deleteTarget.id)
    setDeleteTarget(null)
    await load()
  }

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Mesa de ayuda"
        title="Base de conocimiento"
        description="Artículos de apoyo para resolver tickets con mayor rapidez."
        actions={
          canManage ? (
            <PrimaryButton onClick={openCreate}>Nuevo artículo</PrimaryButton>
          ) : undefined
        }
      />

      <SurfaceCard className="grid gap-3 p-4 sm:grid-cols-[1fr_220px]">
        <div className="relative">
          <AppIcon name="search" className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              const value = event.target.value
              setSearch(value)
              void load(value)
            }}
            placeholder="Buscar por título, contenido o etiquetas"
            className="w-full rounded border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-teal focus:outline-none"
          />
        </div>
        <select
          value={topicFilter}
          onChange={(event) => setTopicFilter(event.target.value)}
          className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Todas las categorías</option>
          {topics.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
      </SurfaceCard>

      {visible.length === 0 ? (
        <EmptyState
          title="No hay información disponible"
          description={
            search || topicFilter
              ? 'Ningún artículo coincide con la búsqueda o el filtro seleccionado.'
              : 'Aún no hay artículos publicados.'
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((item) => (
            <SurfaceCard key={item.id} as="article" className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    {knowledgeTopic(item)}
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-text">
                    <Link to={`/knowledge/${item.id}`} className="hover:text-brand-teal hover:underline">
                      {item.title}
                    </Link>
                  </h2>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <TableActionButton label={`Editar ${item.title}`} icon="edit" onClick={() => openEdit(item)} />
                    <TableActionButton
                      label={`Eliminar ${item.title}`}
                      icon="trash"
                      variant="danger"
                      onClick={() => setDeleteTarget(item)}
                    />
                  </div>
                )}
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">{knowledgeExcerpt(item.content)}</p>
              <Link
                to={`/knowledge/${item.id}`}
                className="mt-2 text-sm font-medium text-brand-teal hover:underline"
              >
                Ver artículo completo
              </Link>
              <div className="mt-4 flex flex-wrap gap-2">
                {parseKnowledgeTags(item.tags).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border bg-page px-2.5 py-1 text-[11px] font-medium text-text"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {item.updatedAt && (
                <p className="mt-4 text-[11px] text-muted">
                  Actualizado el{' '}
                  {new Date(item.updatedAt).toLocaleDateString('es-MX', { dateStyle: 'medium' })}
                </p>
              )}
            </SurfaceCard>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar artículo' : 'Nuevo artículo'}
        size="lg"
      >
        <form onSubmit={(event) => void submit(event)} className="space-y-3">
          {error && (
            <p className="rounded border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>
          )}
          <FormField label="Título" htmlFor="knowledge-title" required>
            <TextInput
              id="knowledge-title"
              required
              minLength={4}
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </FormField>
          <FormField label="Contenido" htmlFor="knowledge-content" required>
            <TextArea
              id="knowledge-content"
              required
              minLength={20}
              rows={6}
              value={form.content}
              onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
            />
          </FormField>
          <FormField label="Etiquetas" htmlFor="knowledge-tags">
            <TextInput
              id="knowledge-tags"
              value={form.tags}
              onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
              placeholder="contraseña, acceso, cuenta"
            />
          </FormField>
          <FormField label="Categoría" htmlFor="knowledge-category">
            <SelectInput
              id="knowledge-category"
              value={form.categoryId}
              onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
            >
              <option value="">Sin categoría de ticket</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={() => setOpen(false)}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>
              {editing ? 'Guardar cambios' : 'Publicar'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void remove()}
        title="Eliminar artículo"
        message={deleteTarget ? `¿Deseas desactivar “${deleteTarget.title}”?` : ''}
        confirmLabel="Eliminar"
        variant="danger"
      />
    </div>
  )
}
