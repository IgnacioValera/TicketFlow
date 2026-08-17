import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { FormField } from '@/components/common/FormField'
import { PrimaryButton, TextArea, TextInput } from '@/components/common/UiControls'
import * as crm from '@/services/crm.service'
import type { CrmSurveyQuestion } from '@/types/crm.types'

export function SurveyRespondPage() {
  const { token } = useParams<{ token: string }>()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<CrmSurveyQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, { textValue?: string; numberValue?: number; optionIds?: string[] }>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) return
    void crm
      .getPublicSurvey(token)
      .then((data) => {
        setTitle(data.title)
        setDescription(data.description)
        setQuestions(data.questions ?? [])
      })
      .catch((err: { message?: string }) => setError(err.message || 'El enlace no es válido o ya expiró.'))
      .finally(() => setLoading(false))
  }, [token])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token) return
    try {
      await crm.respondPublicSurvey(
        token,
        questions.map((question) => ({ questionId: question.id, ...answers[question.id] })),
      )
      setDone(true)
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Se produjo un error al guardar.')
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <h1 className="text-xl font-semibold text-brand-navy">Gracias por tu respuesta</h1>
        <p className="mt-2 text-sm text-slate-600">Tu encuesta se envió correctamente.</p>
      </div>
    )
  }

  if (loading) return <p className="p-8 text-sm text-slate-600">Cargando...</p>

  return (
    <div className="mx-auto max-w-xl p-6 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">TicketFlow</p>
      <h1 className="mt-1 text-xl font-semibold text-brand-navy">{title || 'Encuesta'}</h1>
      <p className="mb-4 text-sm text-slate-600">{description}</p>
      {error && <p className="mb-3 text-sm text-brand-scarlet">{error}</p>}
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        {questions.map((question) => (
          <fieldset key={question.id} className="rounded border border-slate-200 bg-white p-4">
            <legend className="font-medium text-brand-navy">
              {question.prompt}
              {question.required ? <span className="ml-1 text-brand-scarlet">*</span> : <span className="ml-1 text-xs text-slate-400">Opcional</span>}
            </legend>
            {question.type === 'TEXT' && (
              <TextArea
                className="mt-2"
                required={question.required}
                onChange={(e) => setAnswers((c) => ({ ...c, [question.id]: { textValue: e.target.value } }))}
              />
            )}
            {question.type === 'NPS' && (
              <FormField label="Calificación de 0 a 10">
                <TextInput
                  type="number"
                  min={0}
                  max={10}
                  required={question.required}
                  onChange={(e) => setAnswers((c) => ({ ...c, [question.id]: { numberValue: Number(e.target.value) } }))}
                />
              </FormField>
            )}
            {question.type === 'RATING' && (
              <FormField label="Escala de 1 a 5">
                <TextInput
                  type="number"
                  min={1}
                  max={5}
                  required={question.required}
                  onChange={(e) => setAnswers((c) => ({ ...c, [question.id]: { numberValue: Number(e.target.value) } }))}
                />
              </FormField>
            )}
            {(question.type === 'SINGLE_CHOICE' || question.type === 'YES_NO') && (
              <div className="mt-2 space-y-1">
                {question.options.map((option) => (
                  <label key={option.id} className="flex cursor-pointer gap-2 text-sm">
                    <input
                      type="radio"
                      name={question.id}
                      required={question.required}
                      onChange={() =>
                        setAnswers((c) => ({ ...c, [question.id]: { optionIds: [option.id], textValue: option.label } }))
                      }
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            )}
            {question.type === 'MULTIPLE_CHOICE' && (
              <div className="mt-2 space-y-1">
                {question.options.map((option) => (
                  <label key={option.id} className="flex cursor-pointer gap-2 text-sm">
                    <input
                      type="checkbox"
                      onChange={(e) =>
                        setAnswers((c) => {
                          const current = c[question.id]?.optionIds ?? []
                          const optionIds = e.target.checked
                            ? [...current, option.id]
                            : current.filter((id) => id !== option.id)
                          return { ...c, [question.id]: { optionIds } }
                        })
                      }
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        ))}
        <PrimaryButton type="submit">Enviar</PrimaryButton>
      </form>
    </div>
  )
}
