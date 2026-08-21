import { useEffect, useMemo, useState } from 'react'
import { SearchableSelect } from '@/components/common/SearchableSelect'
import type { ClientOption } from '@/types/user.types'
import * as usersService from '@/services/users.service'
import { errorMessage } from '@/utils/validation'

interface ClientSelectFieldProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  currentLabel?: string | null
}

export function ClientSelectField({
  value,
  onChange,
  disabled,
  required,
  currentLabel,
}: ClientSelectFieldProps) {
  const [items, setItems] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await usersService.getClientOptions({
          page: 1,
          perPage: 100,
        })
        setItems(response.data)
      } catch (err: unknown) {
        setError(errorMessage(err, 'No se pudieron cargar los clientes'))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const options = useMemo(() => {
    const list = items.some((item) => item.id === value)
      ? items
      : value
        ? [{ id: value, name: currentLabel || 'Cliente seleccionado' }, ...items]
        : items
    return list.map((client) => ({ value: client.id, label: client.name }))
  }, [currentLabel, items, value])

  return (
    <div>
      <label htmlFor="clientId" className="mb-1 block text-sm font-medium">
        Cliente {required ? '*' : ''}
      </label>
      {loading && <p className="mb-2 text-xs text-muted">Cargando clientes…</p>}
      {error && (
        <p className="mb-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <SearchableSelect
        id="clientId"
        value={value}
        onChange={onChange}
        options={options}
        placeholder="Seleccionar cliente"
        searchPlaceholder="Buscar cliente..."
        emptyMessage="No hay clientes disponibles"
        noResultsMessage="Ningún cliente coincide con la búsqueda"
        allowEmpty={!required}
        emptyLabel="Seleccionar cliente"
        disabled={disabled || loading}
        ariaLabel="Cliente"
      />
    </div>
  )
}
