import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { FormField } from '@/components/common/FormField'
import { PrimaryButton, TextArea, TextInput } from '@/components/common/UiControls'
import * as crm from '@/services/crm.service'
import type { CrmSurveyQuestion } from '@/types/crm.types'
import { getErrorMessages } from '@/utils/errors'
import { isEmptyPublicAnswer, publicAnswersError } from '@/utils/survey-form'

export function SurveyRespondPage() {
  const { token } = useParams<{ token: string }>()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<CrmSurveyQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, { textValue?: string; numberValue?: number; optionIds?: string[] }>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const submittingRef = useRef(false)

  useEffect(() => {
    if (!token) return
    void crm
      .getPublicSurvey(token)
      .then((data) => {
        setTitle(data.title)
        setDescription(data.description)
        setQuestions(data.questions ?? [])
        setError('')
      })
      .catch((err: unknown) => setError(getErrorMessages(err, 'El enlace no es válido o ya expiró.')[0]))
      .finally(() => setLoading(false))
  }, [token])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token || submittingRef.current) return
    const validation = publicAnswersError(questions, answers)
    if (validation) {
      setError(validation)
      return
    }
    submittingRef.current = true
    setSaving(true)
    setError('')
    try {
      await crm.respondPublicSurvey(
        token,
        questions
          .map((question) => ({ questionId: question.id, ...answers[question.id] }))
          .filter((answer) => !isEmptyPublicAnswer(answer)),
      )
      setDone(true)
    } catch (err: unknown) {
      submittingRef.current = false
      setError(getErrorMessages(err, 'Se produjo un error al guardar.')[0])
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <h1 className="text-xl font-semibold text-brand-navy">Gracias por tu respuesta</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tu encuesta se envió correctamente y quedó registrada una sola vez.
        </p>
      </div>
    )
  }

  if (loading) return <p className="p-8 text-sm text-slate-600">Cargando...</p>

  if (error && questions.length === 0) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <h1 className="text-xl font-semibold text-brand-navy">Encuesta no disponible</h1>
        <p className="mt-2 text-sm text-brand-scarlet">{error}</p>
      </div>
    )
  }

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
                onChange={(e) => setAnswers((current) => ({ ...current, [question.id]: { textValue: e.target.value } }))}
              />
            )}
            {question.type === 'NPS' && (
              <FormField label="Calificación de 0 a 10" htmlFor={`nps-${question.id}`}>
                <TextInput
                  id={`nps-${question.id}`}
                  type="number"
                  min={0}
                  max={10}
                  required={question.required}
                  onChange={(e) => setAnswers((current) => ({ ...current, [question.id]: { numberValue: Number(e.target.value) } }))}
                />
              </FormField>
            )}
            {question.type === 'RATING' && (
              <FormField label="Escala de 1 a 5" htmlFor={`rating-${question.id}`}>
                <TextInput
                  id={`rating-${question.id}`}
                  type="number"
                  min={1}
                  max={5}
                  required={question.required}
                  onChange={(e) => setAnswers((current) => ({ ...current, [question.id]: { numberValue: Number(e.target.value) } }))}
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
                        setAnswers((current) => ({ ...current, [question.id]: { optionIds: [option.id], textValue: option.label } }))
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
                        setAnswers((current) => {
                          const currentIds = current[question.id]?.optionIds ?? []
                          const optionIds = e.target.checked
                            ? [...currentIds, option.id]
                            : currentIds.filter((item) => item !== option.id)
                          return { ...current, [question.id]: { optionIds } }
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
        <PrimaryButton type="submit" disabled={saving}>{saving ? 'Enviando...' : 'Enviar respuestas'}</PrimaryButton>
      </form>
    </div>
  )
}
