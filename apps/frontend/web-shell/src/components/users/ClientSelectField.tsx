import { useEffect, useState } from 'react'
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
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const load = async () => {
        setLoading(true)
        setError('')
        try {
          const response = await usersService.getClientOptions({
            search: search.trim() || undefined,
            page: 1,
            perPage: 20,
          })
          setItems(response.data)
        } catch (err: unknown) {
          setError(errorMessage(err, 'No se pudieron cargar los clientes'))
        } finally {
          setLoading(false)
        }
      }
      void load()
    }, 250)
    return () => window.clearTimeout(handle)
  }, [search])

  const options = items.some((item) => item.id === value)
    ? items
    : value
      ? [{ id: value, name: currentLabel || 'Cliente seleccionado' }, ...items]
      : items

  return (
    <div>
      <label htmlFor="clientSearch" className="mb-1 block text-sm font-medium">
        Buscar cliente
      </label>
      <input
        id="clientSearch"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-2 w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
        placeholder="Escribe el nombre del cliente"
        disabled={disabled}
      />
      <label htmlFor="clientId" className="mb-1 block text-sm font-medium">
        Cliente {required ? '*' : ''}
      </label>
      {loading && <p className="mb-2 text-xs text-muted">Cargando clientes…</p>}
      {error && (
        <p className="mb-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <select
        id="clientId"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-brand-slate px-3 py-2 text-sm"
        disabled={disabled || loading}
        required={required}
      >
        <option value="">Seleccionar cliente</option>
        {options.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </select>
    </div>
  )
}
