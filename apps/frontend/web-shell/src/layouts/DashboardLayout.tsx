import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { getNavItemsForRole } from '@/constants/navigation'
import { ROLES } from '@/constants/roles'
import { useAuth } from '@/hooks/useAuth'

export function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = user ? getNavItemsForRole(user.role, user.permissions) : []

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-brand-navy/40 lg:hidden"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-brand-navy text-white transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-lg font-bold">Mesa de Ayuda</p>
          <p className="text-xs text-brand-slate">Sistema de Tickets</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-teal text-white'
                    : 'text-brand-slate hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-medium">{user?.fullName}</p>
          <p className="truncate text-xs text-brand-slate">{user ? ROLES[user.role] : ''}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-brand-slate/30 bg-white px-4 py-3 md:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-brand-navy hover:bg-brand-cream lg:hidden"
            aria-label="Abrir menú"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="ml-auto flex items-center gap-3">
            <Link
              to="/profile"
              className="hidden text-sm text-brand-navy hover:text-brand-teal sm:block"
            >
              {user?.email}
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-lg border border-brand-slate px-3 py-1.5 text-sm text-brand-navy hover:bg-brand-cream/50"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
