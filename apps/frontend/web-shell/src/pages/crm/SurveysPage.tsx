import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppIcon } from '@/components/common/AppIcon'
import { SurveyStatusBadge } from '@/components/common/CrmBadge'
import { TablePagination } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { ConfirmToast } from '@/components/common/FeedbackAlert'
import { FormField } from '@/components/common/FormField'
import { Modal } from '@/components/common/Modal'
import { TableActionButton } from '@/components/common/TableActionButton'
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
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [meta, setMeta] = useState({ page: 1, perPage: 10, total: 0, totalPages: 1 })
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
    const timer = window.setTimeout(() => setToast(null), 6000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await crm.getSurveys({
        page,
        perPage,
        search: search || undefined,
        status: status || undefined,
      })
      setItems(response.data)
      if (response.meta) setMeta(response.meta)
      setError('')
    } catch (err: unknown) {
      setError(getErrorMessages(err, 'No se pudo cargar la información.')[0])
    } finally {
      setLoading(false)
    }
  }, [page, perPage, search, status])

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
      navigate(`/crm/surveys/${created.id}`, {
        state: { created: true, title: created.title },
      })
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

  const canManage = hasPermission(PERMISSIONS.CRM_SURVEY_MANAGE)
  const emptyBecauseFilter = Boolean(search.trim()) || Boolean(status)

  return (
    <div className="space-y-4">
      <ConfirmToast open={Boolean(toast)} title={toast?.title ?? ''} message={toast?.message ?? ''} />
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full max-w-xs">
          <TextInput
            placeholder="Buscar encuestas..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="w-44">
          <SelectInput
            aria-label="Estado"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Todos los estados</option>
            {(Object.keys(SURVEY_STATUS_LABELS) as SurveyStatus[]).map((item) => (
              <option key={item} value={item}>
                {SURVEY_STATUS_LABELS[item]}
              </option>
            ))}
          </SelectInput>
        </div>
        {canManage && (
          <div className="ml-auto">
            <PrimaryButton onClick={() => setOpen(true)}>
              <AppIcon name="plus" className="h-4 w-4" />
              Nueva encuesta
            </PrimaryButton>
          </div>
        )}
      </div>
      {loading ? (
        <p className="text-sm text-muted">Cargando...</p>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <EmptyState
          title={emptyBecauseFilter ? 'Sin coincidencias' : 'No hay encuestas'}
          description={
            emptyBecauseFilter
              ? 'Prueba con otro título o estado.'
              : 'Aún no hay encuestas registradas.'
          }
          action={
            canManage && !emptyBecauseFilter ? (
              <PrimaryButton onClick={() => setOpen(true)}>
                <AppIcon name="plus" className="h-4 w-4" />
                Crear encuesta
              </PrimaryButton>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-text">{item.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <SurveyStatusBadge status={item.status} />
                    {getSurveyTriggerLabel(item.trigger)}
                    {` · ${item.questionCount ?? item.questions?.length ?? 0} preguntas`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canManage && (
                    <>
                      <TableActionButton
                        label={`Editar encuesta ${item.title}`}
                        icon="edit"
                        to={`/crm/surveys/${item.id}`}
                      />
                      {(item.status === 'DRAFT' || item.status === 'CLOSED') && (
                        <TableActionButton
                          label={`Activar encuesta ${item.title}`}
                          icon="check"
                          variant="success"
                          onClick={() => void toggleStatus(item)}
                        />
                      )}
                      {item.status === 'PUBLISHED' && (
                        <TableActionButton
                          label={`Desactivar encuesta ${item.title}`}
                          icon="pause"
                          variant="warning"
                          onClick={() => void toggleStatus(item)}
                        />
                      )}
                    </>
                  )}
                  {hasPermission(PERMISSIONS.CRM_SURVEY_RESULTS) && (
                    <TableActionButton
                      label={`Ver resultados de ${item.title}`}
                      icon="reports"
                      to={`/crm/surveys/${item.id}/results`}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
          <TablePagination
            pagination={{ ...meta, page, perPage }}
            onPageChange={setPage}
            onPerPageChange={(value) => {
              setPerPage(value)
              setPage(1)
            }}
          />
        </div>
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
