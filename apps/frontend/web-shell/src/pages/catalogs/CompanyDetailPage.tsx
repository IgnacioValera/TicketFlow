import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import * as companiesService from '@/services/companies.service'
import type { Company, CompanyTier } from '@/types/catalog.types'

const TIER_LABELS: Record<CompanyTier, string> = {
  BRONZE: 'Bronce',
  SILVER: 'Plata',
  GOLD: 'Oro',
  PLATINUM: 'Platino',
}

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadCompany = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError('')
    try {
      const data = await companiesService.getCompanyById(id)
      setCompany(data)
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'No se pudo cargar la empresa')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadCompany()
  }, [loadCompany])

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton variant="profile" />
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="space-y-4">
        <Link to="/catalogs/companies" className="text-sm text-brand-teal hover:underline">
          ← Volver al listado
        </Link>
        <ErrorState message={error || 'Empresa no encontrada'} onRetry={() => void loadCompany()} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/catalogs/companies" className="text-sm text-brand-teal hover:underline">
          ← Volver al listado
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-brand-navy">{company.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Detalle de empresa cliente y métricas operativas.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-brand-slate/40 bg-white p-4">
          <p className="text-sm text-slate-600">Industria</p>
          <p className="mt-1 text-lg font-semibold text-brand-navy">{company.industry}</p>
        </article>
        <article className="rounded-xl border border-brand-slate/40 bg-white p-4">
          <p className="text-sm text-slate-600">Región</p>
          <p className="mt-1 text-lg font-semibold text-brand-navy">{company.region}</p>
        </article>
        <article className="rounded-xl border border-brand-slate/40 bg-white p-4">
          <p className="text-sm text-slate-600">Tier</p>
          <p className="mt-1 text-lg font-semibold text-brand-navy">{TIER_LABELS[company.tier]}</p>
        </article>
        <article className="rounded-xl border border-brand-slate/40 bg-white p-4">
          <p className="text-sm text-slate-600">Tickets activos</p>
          <p className="mt-1 text-lg font-semibold text-brand-teal">{company.activeTickets}</p>
        </article>
      </section>

      <section className="rounded-xl border border-brand-slate/40 bg-white p-5">
        <h2 className="text-base font-semibold text-brand-navy">Contacto</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-600">Correo</dt>
            <dd className="mt-1 text-sm font-medium text-brand-navy">{company.contactEmail}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-600">Teléfono</dt>
            <dd className="mt-1 text-sm font-medium text-brand-navy">{company.contactPhone}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-600">Estado</dt>
            <dd className="mt-1 text-sm font-medium text-brand-navy">
              {company.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
