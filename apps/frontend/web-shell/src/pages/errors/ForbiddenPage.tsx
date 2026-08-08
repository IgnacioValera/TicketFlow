import { Link } from 'react-router-dom'

export function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-brand-scarlet/30 bg-red-50 p-10 text-center">
      <h1 className="text-2xl font-bold text-brand-scarlet">Acceso denegado</h1>
      <p className="mt-2 text-slate-700">No tienes permisos para ver esta sección.</p>
      <Link
        to="/dashboard"
        className="mt-4 rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:bg-brand-teal/90"
      >
        Volver al inicio
      </Link>
    </div>
  )
}
