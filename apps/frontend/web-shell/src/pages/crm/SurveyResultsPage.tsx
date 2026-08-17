import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader } from '@/components/common/PageHeader'
import * as crm from '@/services/crm.service'

export function SurveyResultsPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    void crm
      .getSurveyResults(id)
      .then(setData)
      .catch((err: { message?: string }) => setError(err.message || 'No se pudo cargar la información.'))
  }, [id])

  if (error) {
    return (
      <div className="space-y-3">
        <Link to="/crm/surveys" className="text-sm text-brand-teal hover:underline">
          ← Encuestas
        </Link>
        <p className="text-sm text-brand-scarlet">{error}</p>
      </div>
    )
  }

  if (!data) return <p className="text-sm text-slate-600">Cargando...</p>
  const nps = data.nps as { nps: number; promoters: number; passives: number; detractors: number; total: number }
  const chart = [
    { name: 'Promotores', value: nps.promoters },
    { name: 'Pasivos', value: nps.passives },
    { name: 'Detractores', value: nps.detractors },
  ]

  return (
    <div className="space-y-4">
      <Link to="/crm/surveys" className="text-sm text-brand-teal hover:underline">
        ← Encuestas
      </Link>
      <PageHeader
        title="Resultados de encuestas"
        description={`NPS ${nps.nps} · ${data.totalResponses as number} respuestas`}
      />
      <div className="h-72 rounded border border-slate-200 bg-white p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" fill="#1d4ed8" name="Respuestas" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
