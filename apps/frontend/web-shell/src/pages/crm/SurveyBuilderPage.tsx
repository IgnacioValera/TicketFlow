import { useCallback, useEffect, useState, type DragEvent, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppIcon } from '@/components/common/AppIcon'
import { SurveyStatusBadge } from '@/components/common/CrmBadge'
import { FormField } from '@/components/common/FormField'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton, SecondaryButton, SelectInput, TextArea, TextInput } from '@/components/common/UiControls'
import * as crm from '@/services/crm.service'
import type { CrmSurvey, CrmSurveyQuestion, SurveyQuestionType } from '@/types/crm.types'
import { getSurveyQuestionTypeLabel, SURVEY_QUESTION_TYPE_LABELS } from '@/utils/labels'

export function SurveyBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const [survey, setSurvey] = useState<CrmSurvey | null>(null)
  const [questions, setQuestions] = useState<CrmSurveyQuestion[]>([])
  const [open, setOpen] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [form, setForm] = useState({ prompt: '', type: 'TEXT' as SurveyQuestionType, required: true, options: '' })

  const load = useCallback(async () => {
    if (!id) return
    const data = await crm.getSurvey(id)
    setSurvey(data)
    setQuestions([...(data.questions ?? [])].sort((a, b) => a.position - b.position))
  }, [id])
  useEffect(() => {
    void load()
  }, [load])

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!id) return
    const options = form.options
      .split('\n')
      .map((label) => label.trim())
      .filter(Boolean)
      .map((label) => ({ label }))
    await crm.addQuestion(id, {
      prompt: form.prompt,
      type: form.type,
      required: form.required,
      options: options.length ? options : undefined,
    })
    setOpen(false)
    setForm({ prompt: '', type: 'TEXT', required: true, options: '' })
    await load()
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
      return next.map((item, index) => ({ ...item, position: index }))
    })
  }

  const onDrop = (event: DragEvent<HTMLElement>, targetId: string) => {
    event.preventDefault()
    const sourceId = event.dataTransfer.getData('text/plain')
    setDraggingId(null)
    setOverId(null)
    if (sourceId) reorder(sourceId, targetId)
  }

  if (!survey) return <p className="text-sm text-slate-600">Cargando...</p>
  const canEdit = survey.status === 'DRAFT'

  return (
    <div className="space-y-4">
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
        {canEdit && (
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setOpen(true)}>Agregar pregunta</SecondaryButton>
            <PrimaryButton onClick={() => void crm.publishSurvey(survey.id).then(load)}>Publicar</PrimaryButton>
          </div>
        )}
      </div>
      <section>
        <h2 className="mb-2 text-sm font-semibold text-brand-navy">Preguntas</h2>
        {questions.length === 0 ? (
          <p className="rounded border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
            Aún no hay preguntas. Agrega la primera para construir la encuesta.
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
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
      <Modal open={open} onClose={() => setOpen(false)} title="Pregunta">
        <form onSubmit={(e) => void add(e)} className="space-y-3">
          <FormField label="Pregunta" required>
            <TextInput required value={form.prompt} onChange={(e) => setForm((c) => ({ ...c, prompt: e.target.value }))} />
          </FormField>
          <FormField label="Tipo">
            <SelectInput
              value={form.type}
              onChange={(e) => setForm((c) => ({ ...c, type: e.target.value as SurveyQuestionType }))}
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
                onChange={(e) => setForm((c) => ({ ...c, options: e.target.value }))}
              />
            </FormField>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.required}
              onChange={(e) => setForm((c) => ({ ...c, required: e.target.checked }))}
            />
            Obligatoria
          </label>
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={() => setOpen(false)}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit">Agregar</PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
