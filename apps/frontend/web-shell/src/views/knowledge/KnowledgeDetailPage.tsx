import Link from 'next/link'
import { useAppNavigate } from '@/hooks/useAppNavigate'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { SurfaceCard } from '@/components/common/SurfaceCard'
import { SecondaryButton } from '@/components/common/UiControls'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import * as crm from '@/services/crm.service'
import {
  knowledgeTopic,
  parseKnowledgeTags,
  type KnowledgeArticle,
} from '@/types/knowledge.types'
import { setNavFlash } from '@/utils/nav-flash'

export function KnowledgeDetailPage() {
  const params = useParams<{ id?: string }>() ?? {}
  const id = typeof params.id === 'string' ? params.id : ''
  const navigate = useAppNavigate()
  const { hasPermission } = usePermissions()
  const canManage = hasPermission(PERMISSIONS.KNOWLEDGE_MANAGE)

  const [article, setArticle] = useState<KnowledgeArticle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        setArticle(await crm.getKnowledgeById(id))
      } catch (err: unknown) {
        setError((err as { message?: string }).message || 'No se pudo cargar el artículo')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id])

  if (loading) {
    return <LoadingSkeleton variant="card" label="Cargando artículo..." />
  }

  if (error || !article) {
    return (
      <ErrorState
        message={error || 'Artículo no encontrado'}
        onRetry={() => navigate('/knowledge')}
      />
    )
  }

  const tags = parseKnowledgeTags(article.tags)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/knowledge" className="text-sm text-brand-teal hover:underline">
          ← Volver al listado
        </Link>
        {canManage && (
          <SecondaryButton
            type="button"
            onClick={() => {
              setNavFlash('knowledge-edit', { editId: article.id })
              navigate('/knowledge')
            }}
          >
            Editar artículo
          </SecondaryButton>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-muted">{knowledgeTopic(article)}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-text">{article.title}</h1>
        {article.updatedAt && (
          <p className="mt-1 text-sm text-muted">
            Actualizado el {new Date(article.updatedAt).toLocaleDateString('es-MX', { dateStyle: 'medium' })}
          </p>
        )}
      </div>

      <SurfaceCard className="space-y-5 p-6">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-page px-2.5 py-1 text-[11px] font-medium text-text"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="whitespace-pre-wrap text-sm leading-7 text-text">{article.content}</div>

        {article.author?.fullName && (
          <p className="text-xs text-muted">Autor: {article.author.fullName}</p>
        )}
      </SurfaceCard>
    </div>
  )
}
