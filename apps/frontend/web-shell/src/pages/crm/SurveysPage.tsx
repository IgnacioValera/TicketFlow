import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { SurveyStatusBadge } from '@/components/common/CrmBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { FormField } from '@/components/common/FormField'
import { Modal } from '@/components/common/Modal'
import { PageHeader } from '@/components/common/PageHeader'
import { PrimaryButton, SecondaryButton, SelectInput, TextArea, TextInput } from '@/components/common/UiControls'
import { PERMISSIONS } from '@/constants/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import * as crm from '@/services/crm.service'
import type { CrmSurvey, SurveyStatus, SurveyTrigger } from '@/types/crm.types'
import { getSurveyTriggerLabel, SURVEY_STATUS_LABELS, SURVEY_TRIGGER_LABELS } from '@/utils/labels'

export function SurveysPage() {
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<CrmSurvey[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', trigger: 'MANUAL' as SurveyTrigger })

  useEffect(() => {
    if (searchParams.get('nuevo') !== '1') return
    setOpen(true)
    const next = new URLSearchParams(searchParams)
    next.delete('nuevo')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const load = useCallback(async () => {
    const response = await crm.getSurveys({ perPage: 50, status: status || undefined })
    setItems(response.data)
  }, [status])
  useEffect(() => {
    void load()
  }, [load])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const created = await crm.createSurvey(form)
    setOpen(false)
    navigate(`/crm/surveys/${created.id}`)
  }

  const visible = items.filter((item) => item.title.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div className="space-y-4">
      <PageHeader
        kicker="CRM"
        title="Encuestas"
        description="Construye encuestas de satisfacción y revisa los resultados NPS."
        actions={
          hasPermission(PERMISSIONS.CRM_SURVEY_MANAGE) ? (
            <PrimaryButton onClick={() => setOpen(true)}>+ Nueva encuesta</PrimaryButton>
          ) : undefined
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
      {visible.length === 0 ? (
        <EmptyState
          title="No hay encuestas"
          description="Aún no hay encuestas registradas."
          action={
            hasPermission(PERMISSIONS.CRM_SURVEY_MANAGE) ? (
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
                  {item.questions ? ` · ${item.questions.length} preguntas` : ''}
                </p>
              </div>
              <div className="flex gap-3 text-sm">
                {hasPermission(PERMISSIONS.CRM_SURVEY_MANAGE) && (
                  <Link className="font-medium text-brand-teal hover:underline" to={`/crm/surveys/${item.id}`}>
                    Editar
                  </Link>
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
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva encuesta">
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <FormField label="Título" required>
            <TextInput required value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} />
          </FormField>
          <FormField label="Descripción">
            <TextArea value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} />
          </FormField>
          <FormField label="Disparador">
            <SelectInput
              value={form.trigger}
              onChange={(e) => setForm((c) => ({ ...c, trigger: e.target.value as SurveyTrigger }))}
            >
              {(Object.keys(SURVEY_TRIGGER_LABELS) as SurveyTrigger[]).map((item) => (
                <option key={item} value={item}>
                  {SURVEY_TRIGGER_LABELS[item]}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton onClick={() => setOpen(false)}>Cancelar</SecondaryButton>
            <PrimaryButton type="submit">Guardar</PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
