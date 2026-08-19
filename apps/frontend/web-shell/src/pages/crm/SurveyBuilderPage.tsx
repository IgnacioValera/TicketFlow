import { useCallback, useEffect, useState, type DragEvent, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppIcon } from '@/components/common/AppIcon'
import { SurveyStatusBadge } from '@/components/common/CrmBadge'
import { ConfirmToast } from '@/components/common/FeedbackAlert'
import { FormField } from '@/components/common/FormField'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton, SecondaryButton, SelectInput, TextArea, TextInput } from '@/components/common/UiControls'
import * as crm from '@/services/crm.service'
import type { CrmSurvey, CrmSurveyQuestion, SurveyQuestionType, SurveyTrigger } from '@/types/crm.types'
import { getErrorMessages } from '@/utils/errors'
import {
  defaultOptionsForType,
  EMPTY_QUESTION_FORM,
  parseOptionLines,
  questionOptionsError,
  questionPromptError,
  surveyDescriptionError,
  surveyTitleError,
} from '@/utils/survey-form'
import { getSurveyQuestionTypeLabel, SURVEY_QUESTION_TYPE_LABELS, SURVEY_TRIGGER_LABELS } from '@/utils/labels'

export function SurveyBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const [survey, setSurvey] = useState<CrmSurvey | null>(null)
  const [questions, setQuestions] = useState<CrmSurveyQuestion[]>([])
  const [open, setOpen] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_QUESTION_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null)
  const [meta, setMeta] = useState({ title: '', description: '', trigger: 'MANUAL' as SurveyTrigger })
  const [metaError, setMetaError] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    const data = await crm.getSurvey(id)
    setSurvey(data)
    setQuestions([...(data.questions ?? [])].sort((a, b) => a.position - b.position))
    setMeta({ title: data.title, description: data.description, trigger: data.trigger })
  }, [id])

  useEffect(() => {
    void load().catch((err: unknown) => setError(getErrorMessages(err, 'No se pudo cargar la encuesta.')[0]))
  }, [load])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 5000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const closeQuestionModal = () => {
    setOpen(false)
    setForm(EMPTY_QUESTION_FORM)
    setFormError('')
  }

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!id || saving) return
    const promptError = questionPromptError(form.prompt)
    const optionsError = questionOptionsError(form.type, form.options)
    if (promptError || optionsError) {
      setFormError(promptError || optionsError || '')
      return
    }
    const options = parseOptionLines(form.type === 'YES_NO' && !form.options.trim() ? defaultOptionsForType('YES_NO') : form.options)
      .map((label) => ({ label }))
    setSaving(true)
    setFormError('')
    try {
      await crm.addQuestion(id, {
        prompt: form.prompt.trim(),
        type: form.type,
        required: form.required,
        options: options.length ? options : undefined,
      })
      closeQuestionModal()
      await load()
    } catch (err: unknown) {
      setFormError(getErrorMessages(err, 'No se pudo agregar la pregunta.')[0])
    } finally {
      setSaving(false)
    }
  }

  const persistOrder = async (next: CrmSurveyQuestion[]) => {
    if (!id) return
    try {
      await crm.reorderQuestions(id, next.map((question) => question.id))
    } catch (err: unknown) {
      setError(getErrorMessages(err, 'No se pudo guardar el orden.')[0])
      await load()
    }
  }

  const reorder = (fromId: string, toId: string) => {
    if (fromId === toId) return
    setQuestions((current) => {
      const next = [...current]
      const from = next.findIndex((item) => item.id === fromId)
      const to = next.findIndex((item) => item.id === toId)
      if (from < 0 || to < 0) return current
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      const ordered = next.map((item, index) => ({ ...item, position: index }))
      void persistOrder(ordered)
      return ordered
    })
  }

  const onDrop = (event: DragEvent<HTMLElement>, targetId: string) => {
    event.preventDefault()
    const sourceId = event.dataTransfer.getData('text/plain')
    setDraggingId(null)
    setOverId(null)
    if (sourceId) reorder(sourceId, targetId)
  }

  const saveMeta = async (e: FormEvent) => {
    e.preventDefault()
    if (!id || saving) return
    const titleError = surveyTitleError(meta.title)
    const descriptionError = surveyDescriptionError(meta.description)
    if (titleError || descriptionError) {
      setMetaError(titleError || descriptionError || '')
      return
    }
    setSaving(true)
    setMetaError('')
    try {
      await crm.updateSurvey(id, {
        title: meta.title.trim(),
        description: meta.description.trim(),
        trigger: meta.trigger,
      })
      setToast({ title: 'Encuesta actualizada', message: 'Se guardaron el título y la descripción.' })
      await load()
    } catch (err: unknown) {
      setMetaError(getErrorMessages(err, 'No se pudo guardar.')[0])
    } finally {
      setSaving(false)
    }
  }

  const activate = async () => {
    if (!survey) return
    try {
      await crm.publishSurvey(survey.id)
      setError('')
      setToast({ title: 'Encuesta activada', message: 'Ya puede responderse desde el flujo correcto.' })
      await load()
    } catch (err: unknown) {
      const message = getErrorMessages(err, 'No se pudo activar la encuesta.')[0]
      setError(message)
      setToast({ title: 'No se pudo activar', message })
    }
  }

  const deactivate = async () => {
    if (!survey) return
    try {
      await crm.closeSurvey(survey.id)
      setError('')
      setToast({ title: 'Encuesta desactivada', message: 'Ya no acepta respuestas nuevas.' })
      await load()
    } catch (err: unknown) {
      const message = getErrorMessages(err, 'No se pudo desactivar la encuesta.')[0]
      setError(message)
      setToast({ title: 'No se pudo desactivar', message })
    }
  }

  const remove = async (questionId: string) => {
    if (!id) return
    try {
      await crm.removeQuestion(id, questionId)
      await load()
    } catch (err: unknown) {
      setError(getErrorMessages(err, 'No se pudo eliminar la pregunta.')[0])
    }
  }

  if (error && !survey) return <p className="text-sm text-brand-scarlet">{error}</p>
  if (!survey) return <p className="text-sm text-slate-600">Cargando...</p>
  const canEdit = survey.status === 'DRAFT'

  return (
    <div className="space-y-4">
      <ConfirmToast open={Boolean(toast)} title={toast?.title ?? ''} message={toast?.message ?? ''} />
      <Link to="/crm/surveys" className="text-sm text-brand-teal hover:underline">
        ← Encuestas
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-brand-navy">{survey.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{survey.description || 'Sin descripción'}</p>
          <div className="mt-2">
            <SurveyStatusBadge status={survey.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-lg border border-brand-slate px-4 py-2 text-sm text-brand-navy hover:bg-brand-cream/50" to={`/crm/surveys/${survey.id}/results`}>
            Ver resultados
          </Link>
          {canEdit && <SecondaryButton onClick={() => setOpen(true)}>Agregar pregunta</SecondaryButton>}
          {(survey.status === 'DRAFT' || survey.status === 'CLOSED') && (
            <PrimaryButton onClick={() => void activate()}>Activar</PrimaryButton>
          )}
          {survey.status === 'PUBLISHED' && (
            <SecondaryButton onClick={() => void deactivate()}>Desactivar</SecondaryButton>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-brand-scarlet">{error}</p>}
      {canEdit && (
        <form onSubmit={(e) => void saveMeta(e)} className="grid gap-3 rounded border border-slate-200 bg-white p-4 md:grid-cols-2">
          {metaError && <p className="text-sm text-brand-scarlet md:col-span-2">{metaError}</p>}
          <FormField label="Título" htmlFor="survey-meta-title" required>
            <TextInput id="survey-meta-title" value={meta.title} onChange={(e) => setMeta((current) => ({ ...current, title: e.target.value }))} />
          </FormField>
          <FormField label="Disparador" htmlFor="survey-meta-trigger">
            <SelectInput
              id="survey-meta-trigger"
              value={meta.trigger}
              onChange={(e) => setMeta((current) => ({ ...current, trigger: e.target.value as SurveyTrigger }))}
            >
              {(Object.keys(SURVEY_TRIGGER_LABELS) as SurveyTrigger[]).map((item) => (
                <option key={item} value={item}>
                  {SURVEY_TRIGGER_LABELS[item]}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Descripción" htmlFor="survey-meta-description">
              <TextArea id="survey-meta-description" value={meta.description} onChange={(e) => setMeta((current) => ({ ...current, description: e.target.value }))} />
            </FormField>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <PrimaryButton type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</PrimaryButton>
          </div>
        </form>
      )}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-brand-navy">Preguntas</h2>
        {questions.length === 0 ? (
          <p className="rounded border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
            Aún no hay preguntas. Agrega la primera para poder activar la encuesta.
          </p>
        ) : (
          <ol className="space-y-2">
            {questions.map((question, index) => (
              <li
                key={question.id}
                draggable={canEdit}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', question.id)
                  setDraggingId(question.id)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setOverId(question.id)
                }}
                onDrop={(e) => onDrop(e, question.id)}
                onDragEnd={() => {
                  setDraggingId(null)
                  setOverId(null)
                }}
                className={`rounded border bg-white p-4 transition ${overId === question.id ? 'border-brand-teal ring-2 ring-brand-teal/20' : 'border-slate-200'} ${draggingId === question.id ? 'is-dragging opacity-50' : ''} ${canEdit ? 'hover:shadow-sm' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {canEdit && (
                    <span className="mt-0.5 text-slate-400" title="Reordenar">
                      <AppIcon name="grip" className="h-4 w-4" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-brand-navy">
                      {index + 1}. {question.prompt}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Tipo: {getSurveyQuestionTypeLabel(question.type)}
                      {question.required ? ' · Obligatoria' : ' · Opcional'}
                    </p>
                    {question.options.length > 0 && (
                      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-slate-600">
                        {question.options.map((option) => (
                          <li key={option.id}>{option.label}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {canEdit && (
                    <button type="button" className="text-sm font-medium text-brand-scarlet hover:underline" onClick={() => void remove(question.id)}>
                      Eliminar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
      <Modal open={open} onClose={closeQuestionModal} title="Pregunta">
        <form onSubmit={(e) => void add(e)} className="space-y-3">
          {formError && <p className="text-sm text-brand-scarlet">{formError}</p>}
          <FormField label="Pregunta" htmlFor="question-prompt" required>
            <TextInput id="question-prompt" value={form.prompt} onChange={(e) => setForm((current) => ({ ...current, prompt: e.target.value }))} />
          </FormField>
          <FormField label="Tipo" htmlFor="question-type">
            <SelectInput
              id="question-type"
              value={form.type}
              onChange={(e) => {
                const type = e.target.value as SurveyQuestionType
                setForm((current) => ({
                  ...current,
                  type,
                  options: type === 'YES_NO' ? defaultOptionsForType('YES_NO') : current.type === 'YES_NO' ? '' : current.options,
                }))
              }}
            >
              {(Object.keys(SURVEY_QUESTION_TYPE_LABELS) as SurveyQuestionType[]).map((type) => (
                <option key={type} value={type}>
                  {SURVEY_QUESTION_TYPE_LABELS[type]}
                </option>
              ))}
            </SelectInput>
          </FormField>
          {(form.type === 'SINGLE_CHOICE' || form.type === 'MULTIPLE_CHOICE' || form.type === 'YES_NO') && (
            <FormField label="Opciones" hint="Una opción por línea">
              <TextArea
                placeholder="Una opción por línea"
                value={form.options}
                onChange={(e) => setForm((current) => ({ ...current, options: e.target.value }))}
              />
            </FormField>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.required}
              onChange={(e) => setForm((current) => ({ ...current, required: e.target.checked }))}
            />
            Obligatoria
          </label>
          <div className="flex justify-end gap-2">
            <SecondaryButton type="button" onClick={closeQuestionModal}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>{saving ? 'Agregando...' : 'Agregar'}</PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
