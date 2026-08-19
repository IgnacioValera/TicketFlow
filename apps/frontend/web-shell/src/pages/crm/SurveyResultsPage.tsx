import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import * as crm from '@/services/crm.service'
import type { SurveyResults } from '@/types/crm.types'
import { getSurveyQuestionTypeLabel } from '@/utils/labels'

export function SurveyResultsPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<SurveyResults | null>(null)
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
  const nps = data.nps && data.nps.total > 0 ? data.nps : null
  const npsChart = nps
    ? [
        { name: 'Promotores', value: nps.promoters },
        { name: 'Pasivos', value: nps.passives },
        { name: 'Detractores', value: nps.detractors },
      ]
    : []

  return (
    <div className="space-y-4">
      <Link to="/crm/surveys" className="text-sm text-brand-teal hover:underline">
        ← Encuestas
      </Link>
      <PageHeader
        title={data.survey.title}
        description={`${data.totalResponses} ${data.totalResponses === 1 ? 'respuesta' : 'respuestas'} registradas`}
      />
      {data.totalResponses === 0 ? (
        <EmptyState
          title="Aún no hay respuestas"
          description="Cuando alguien complete la encuesta verás conteos y porcentajes reales. No se muestran datos simulados."
        />
      ) : (
        <>
          <p className="text-sm text-slate-600">
            Resumen con los datos almacenados: {data.totalResponses} respuestas.
            {nps ? ` NPS ${nps.nps}.` : ''}
          </p>
          {nps && (
            <div className="h-72 rounded border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-brand-navy">NPS</h2>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={npsChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1d4ed8" name="Respuestas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <section className="space-y-3">
            {data.questions.map((question) => (
              <article key={question.id} className="rounded border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-brand-navy">{question.prompt}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {getSurveyQuestionTypeLabel(question.type)} · {question.answerCount} respuestas
                </p>
                {question.options && (
                  <ul className="mt-3 space-y-2">
                    {question.options.map((option) => (
                      <li key={option.id}>
                        <div className="flex items-center justify-between text-sm">
                          <span>{option.label}</span>
                          <span className="text-slate-500">{option.count} · {option.percentage}%</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded bg-slate-100">
                          <div className="h-full bg-brand-teal" style={{ width: `${option.percentage}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {question.ratings && (
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {question.ratings.filter((item) => item.count > 0).map((item) => (
                      <li key={item.value} className="flex justify-between rounded bg-slate-50 px-3 py-2 text-sm">
                        <span>{item.value}</span>
                        <span>{item.count} · {item.percentage}%</span>
                      </li>
                    ))}
                  </ul>
                )}
                {question.texts && (
                  question.texts.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">Sin comentarios.</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {question.texts.map((text, index) => (
                        <li key={`${question.id}-${index}`} className="rounded bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          {text}
                        </li>
                      ))}
                    </ul>
                  )
                )}
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
