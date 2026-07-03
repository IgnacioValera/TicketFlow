import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ErrorState } from '@/components/common/ErrorState'
import * as companiesService from '@/services/companies.service'
import type { Company, CompanyTier } from '@/types/catalog.types'

const TIER_LABELS: Record<CompanyTier, string> = {
  BRONZE: 'Bronce',
  SILVER: 'Plata',
  GOLD: 'Oro',
  PLATINUM: 'Platino',
}

const INDUSTRIES = ['Finanzas', 'Retail', 'Tecnologia', 'Salud', 'Manufactura']
const REGIONS = ['Norte', 'Centro', 'Sur', 'Occidente']

export function CompaniesListPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [industryFilter, setIndustryFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [tierFilter, setTierFilter] = useState<CompanyTier | ''>('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ page: 1, perPage: 10, total: 0, totalPages: 1 })

  const loadCompanies = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await companiesService.getCompanies({
        page,
        perPage: 10,
        search: search || undefined,
        industry: industryFilter || undefined,
        region: regionFilter || undefined,
        tier: tierFilter || undefined,
      })
      setCompanies(response.data)
      if (response.meta) setMeta(response.meta)
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Error al cargar empresas')
    } finally {
      setLoading(false)
    }
  }, [page, search, industryFilter, regionFilter, tierFilter])

  useEffect(() => {
    void loadCompanies()
  }, [loadCompanies])

  const columns: Column<Company>[] = useMemo(
    () => [
      { key: 'name', header: 'Empresa', sortable: true },
      { key: 'industry', header: 'Industria' },
      { key: 'region', header: 'Región' },
      {
        key: 'tier',
        header: 'Tier',
        render: (row) => TIER_LABELS[row.tier],
      },
      {
        key: 'activeTickets',
        header: 'Tickets activos',
        render: (row) => row.activeTickets,
      },
      {
        key: 'actions',
        header: 'Acciones',
        render: (row) => (
          <Link
            to={`/catalogs/companies/${row.id}`}
            className="text-sm text-brand-teal hover:underline"
          >
            Ver detalle
          </Link>
        ),
      },
    ],
    [],
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-navy">Empresas clientes</h1>
        <p className="mt-1 text-sm text-slate-600">
          Catálogo de empresas con filtros por industria, región y tier.
        </p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input
          type="search"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-brand-slate px-3 py-2 text-sm focus:border-brand-teal focus:outline-none"
        />
        <select
          value={industryFilter}
          onChange={(e) => {
            setIndustryFilter(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-brand-slate px-3 py-2 text-sm"
        >
          <option value="">Todas las industrias</option>
          {INDUSTRIES.map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </select>
        <select
          value={regionFilter}
          onChange={(e) => {
            setRegionFilter(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-brand-slate px-3 py-2 text-sm"
        >
          <option value="">Todas las regiones</option>
          {REGIONS.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
        <select
          value={tierFilter}
          onChange={(e) => {
            setTierFilter(e.target.value as CompanyTier | '')
            setPage(1)
          }}
          className="rounded-lg border border-brand-slate px-3 py-2 text-sm"
        >
          <option value="">Todos los tiers</option>
          {(Object.keys(TIER_LABELS) as CompanyTier[]).map((tier) => (
            <option key={tier} value={tier}>
              {TIER_LABELS[tier]}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => void loadCompanies()} />
      ) : (
        <DataTable
          columns={columns}
          data={companies}
          loading={loading}
          pagination={meta}
          onPageChange={setPage}
          rowKey={(row) => row.id}
          emptyMessage="No se encontraron empresas"
        />
      )}
    </div>
  )
}
