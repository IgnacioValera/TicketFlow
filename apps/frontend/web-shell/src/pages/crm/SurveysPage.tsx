import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { SurveyStatusBadge } from '@/components/common/CrmBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { ConfirmToast } from '@/components/common/FeedbackAlert'
import { FormField } from '@/components/common/FormField'
import { Modal } from '@/components/common/Modal'
import { PageHeader } from '@/components/common/PageHeader'
import { PrimaryButton, SecondaryButton, SelectInput, TextArea, TextInput } from '@/components/common/UiControls'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import * as crm from '@/services/crm.service'
import type { CrmSurvey, SurveyStatus, SurveyTrigger } from '@/types/crm.types'
import { getErrorMessages } from '@/utils/errors'
import {
  EMPTY_SURVEY_FORM,
  surveyDescriptionError,
  surveyTitleError,
} from '@/utils/survey-form'
import { getSurveyTriggerLabel, SURVEY_STATUS_LABELS, SURVEY_TRIGGER_LABELS } from '@/utils/labels'

export function SurveysPage() {
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<CrmSurvey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_SURVEY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null)

  useEffect(() => {
    if (searchParams.get('nuevo') !== '1') return
    setOpen(true)
    const next = new URLSearchParams(searchParams)
    next.delete('nuevo')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 5000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await crm.getSurveys({ perPage: 50, status: status || undefined })
      setItems(response.data)
      setError('')
    } catch (err: unknown) {
      setError(getErrorMessages(err, 'No se pudo cargar la información.')[0])
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  const closeModal = () => {
    setOpen(false)
    setForm(EMPTY_SURVEY_FORM)
    setFormError('')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const titleError = surveyTitleError(form.title)
    const descriptionError = surveyDescriptionError(form.description)
    if (titleError || descriptionError) {
      setFormError(titleError || descriptionError || '')
      return
    }
    if (saving) return
    setSaving(true)
    setFormError('')
    try {
      const created = await crm.createSurvey({
        title: form.title.trim(),
        description: form.description.trim(),
        trigger: form.trigger,
      })
      closeModal()
      navigate(`/crm/surveys/${created.id}`)
    } catch (err: unknown) {
      setFormError(getErrorMessages(err, 'Se produjo un error al guardar.')[0])
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (item: CrmSurvey) => {
    try {
      if (item.status === 'PUBLISHED') await crm.closeSurvey(item.id)
      else await crm.publishSurvey(item.id)
      setToast({
        title: item.status === 'PUBLISHED' ? 'Encuesta desactivada' : 'Encuesta activada',
        message: item.status === 'PUBLISHED'
          ? 'Ya no acepta respuestas nuevas.'
          : 'La encuesta ya puede responderse desde el enlace correcto.',
      })
      await load()
    } catch (err: unknown) {
      setError(getErrorMessages(err, 'No se pudo actualizar el estado.')[0])
    }
  }

  const visible = items.filter((item) => item.title.toLowerCase().includes(search.trim().toLowerCase()))
  const canManage = hasPermission(PERMISSIONS.CRM_SURVEY_MANAGE)
  const emptyBecauseFilter = items.length > 0 || Boolean(search.trim()) || Boolean(status)

  return (
    <div className="space-y-4">
      <ConfirmToast open={Boolean(toast)} title={toast?.title ?? ''} message={toast?.message ?? ''} />
      <PageHeader
        kicker="CRM"
        title="Encuestas"
        description="Crea, activa y revisa resultados reales de satisfacción."
        actions={
          canManage ? <PrimaryButton onClick={() => setOpen(true)}>+ Nueva encuesta</PrimaryButton> : undefined
        }
      />
      <div className="flex flex-wrap gap-2">
        <TextInput
          className="max-w-xs"
          placeholder="Buscar encuestas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SelectInput className="w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {(Object.keys(SURVEY_STATUS_LABELS) as SurveyStatus[]).map((item) => (
            <option key={item} value={item}>
              {SURVEY_STATUS_LABELS[item]}
            </option>
          ))}
        </SelectInput>
      </div>
      {loading ? (
        <p className="text-sm text-slate-600">Cargando...</p>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : visible.length === 0 ? (
        <EmptyState
          title={emptyBecauseFilter ? 'Sin coincidencias' : 'No hay encuestas'}
          description={
            emptyBecauseFilter
              ? 'Prueba con otro título o estado.'
              : 'Aún no hay encuestas registradas.'
          }
          action={
            canManage && !emptyBecauseFilter ? (
              <PrimaryButton onClick={() => setOpen(true)}>Crear encuesta</PrimaryButton>
            ) : undefined
          }
        />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded border border-slate-200 bg-white">
          {visible.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium text-brand-navy">{item.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <SurveyStatusBadge status={item.status} />
                  {getSurveyTriggerLabel(item.trigger)}
                  {` · ${item.questionCount ?? item.questions?.length ?? 0} preguntas`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {canManage && (
                  <>
                    <Link className="font-medium text-brand-teal hover:underline" to={`/crm/surveys/${item.id}`}>
                      Editar
                    </Link>
                    {(item.status === 'DRAFT' || item.status === 'CLOSED') && (
                      <button type="button" className="font-medium text-brand-teal hover:underline" onClick={() => void toggleStatus(item)}>
                        Activar
                      </button>
                    )}
                    {item.status === 'PUBLISHED' && (
                      <button type="button" className="font-medium text-brand-teal hover:underline" onClick={() => void toggleStatus(item)}>
                        Desactivar
                      </button>
                    )}
                  </>
                )}
                {hasPermission(PERMISSIONS.CRM_SURVEY_RESULTS) && (
                  <Link className="font-medium text-brand-teal hover:underline" to={`/crm/surveys/${item.id}/results`}>
                    Resultados
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal open={open} onClose={closeModal} title="Nueva encuesta">
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          {formError && (
            <p className="text-sm text-brand-scarlet">{formError}</p>
          )}
          <FormField label="Título" htmlFor="survey-title" required>
            <TextInput id="survey-title" value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} />
          </FormField>
          <FormField label="Descripción" htmlFor="survey-description">
            <TextArea id="survey-description" value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} />
          </FormField>
          <FormField label="Disparador" htmlFor="survey-trigger">
            <SelectInput
              id="survey-trigger"
              value={form.trigger}
              onChange={(e) => setForm((current) => ({ ...current, trigger: e.target.value as SurveyTrigger }))}
            >
              {(Object.keys(SURVEY_TRIGGER_LABELS) as SurveyTrigger[]).map((item) => (
                <option key={item} value={item}>
                  {SURVEY_TRIGGER_LABELS[item]}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton type="button" onClick={closeModal}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
