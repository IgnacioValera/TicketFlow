import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-cream/60 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-brand-navy">Mesa de Ayuda</h1>
          <p className="mt-1 text-sm text-slate-600">Sistema de Tickets</p>
        </div>
        <div className="rounded-2xl border border-brand-slate/40 bg-white p-6 shadow-sm md:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
