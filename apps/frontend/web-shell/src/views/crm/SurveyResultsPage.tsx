import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EmptyState } from '@/components/common/EmptyState'
import * as crm from '@/services/crm.service'
import type { SurveyResults } from '@/types/crm.types'
import { getSurveyQuestionTypeLabel } from '@/utils/labels'

export function SurveyResultsPage() {
  const { id } = (useParams() as { id: string })
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
        <Link href="/crm/surveys" className="text-sm text-brand-teal hover:underline">
          ← Encuestas
        </Link>
        <p className="text-sm text-brand-scarlet">{error}</p>
      </div>
    )
  }

  if (!data) return <p className="text-sm text-muted">Cargando...</p>
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
      <Link href="/crm/surveys" className="text-sm text-brand-teal hover:underline">
        ← Encuestas
      </Link>
      <h1 className="text-xl font-semibold tracking-tight text-text">{data.survey.title}</h1>
      <p className="text-sm text-muted">
        {data.totalResponses} {data.totalResponses === 1 ? 'respuesta' : 'respuestas'} registradas
      </p>
      {data.totalResponses === 0 ? (
        <EmptyState
          title="Aún no hay respuestas"
          description="Cuando alguien complete la encuesta verás conteos y porcentajes reales. No se muestran datos simulados."
        />
      ) : (
        <>
          <p className="text-sm text-muted">
            Resumen con los datos almacenados: {data.totalResponses} respuestas.
            {nps ? ` NPS ${nps.nps}.` : ''}
          </p>
          {nps && (
            <div className="h-72 rounded border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-brand-navy">NPS</h2>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={npsChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1d4ed8" name="Respuestas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {data.responses && data.responses.length > 0 ? (
            <section className="rounded border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-brand-navy">Respuestas vinculadas</h2>
              <ul className="space-y-2 text-sm">
                {data.responses.map((item) => (
                  <li key={item.id} className="rounded bg-slate-50 px-3 py-2">
                    <p>
                      {item.opportunityTitle ? `Oportunidad: ${item.opportunityTitle}` : 'Sin oportunidad'}
                      {item.clientName ? ` · Cliente: ${item.clientName}` : ''}
                    </p>
                    <p className="text-xs text-muted">
                      Disparador: {item.trigger === 'OPPORTUNITY_WON' ? 'Oportunidad ganada' : 'Manual'}
                      {item.npsScore != null ? ` · NPS ${item.npsScore}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className="space-y-3">
            {data.questions.map((question) => (
              <article key={question.id} className="rounded border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-brand-navy">{question.prompt}</h3>
                <p className="mt-1 text-xs text-muted">
                  {getSurveyQuestionTypeLabel(question.type)} · {question.answerCount} respuestas
                </p>
                {question.options && (
                  <ul className="mt-3 space-y-2">
                    {question.options.map((option) => (
                      <li key={option.id}>
                        <div className="flex items-center justify-between text-sm">
                          <span>{option.label}</span>
                          <span className="text-muted">{option.count} · {option.percentage}%</span>
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
                    <p className="mt-3 text-sm text-muted">Sin comentarios.</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {question.texts.map((text, index) => (
                        <li key={`${question.id}-${index}`} className="rounded bg-slate-50 px-3 py-2 text-sm text-text">
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
