import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ErrorState } from '@/components/common/ErrorState'
import { TableActionButton } from '@/components/common/TableActionButton'
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
  const navigate = useNavigate()
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
          <TableActionButton
            label={`Ver detalle de ${row.name}`}
            icon="eye"
            onClick={() => navigate(`/catalogs/companies/${row.id}`)}
          />
        ),
      },
    ],
    [navigate],
  )

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="w-full max-w-xs">
          <input
            type="search"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-teal focus:outline-none"
          />
        </div>
        <select
          value={industryFilter}
          onChange={(e) => {
            setIndustryFilter(e.target.value)
            setPage(1)
          }}
          className="w-44 rounded border border-slate-300 bg-white px-3 py-2 text-sm text-brand-navy"
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
          className="w-44 rounded border border-slate-300 bg-white px-3 py-2 text-sm text-brand-navy"
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
          className="w-44 rounded border border-slate-300 bg-white px-3 py-2 text-sm text-brand-navy"
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
