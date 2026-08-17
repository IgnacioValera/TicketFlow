import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppIcon } from '@/components/common/AppIcon'
import { getNavItemsForRole, type NavItem } from '@/constants/navigation'
import { PERMISSIONS } from '@/constants/permissions'
import { ROLES } from '@/constants/roles'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'

const GROUP_ORDER: NavItem['group'][] = ['CRM', 'Help Desk', 'Administración']

function initials(name = '') {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'TF'
  )
}

export function DashboardLayout() {
  const { user, logout } = useAuth()
  const { hasPermission } = usePermissions()
  const navigate = useNavigate()
  const location = useLocation()
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const createMenuRef = useRef<HTMLDivElement>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('ticketflow-sidebar') === 'collapsed',
  )
  const [profileOpen, setProfileOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const navItems = useMemo(
    () => (user ? getNavItemsForRole(user.role, user.permissions) : []),
    [user],
  )
  const groups = GROUP_ORDER.map((group) => ({
    group,
    items: navItems.filter((item) => item.group === group),
  })).filter(({ items }) => items.length)
  const currentItem = [...navItems]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => location.pathname.startsWith(item.path))

  const createActions = useMemo(
    () =>
      [
        hasPermission(PERMISSIONS.CRM_CLIENT_CREATE) && {
          label: 'Nuevo cliente',
          to: '/crm/clients?nuevo=1',
        },
        hasPermission(PERMISSIONS.CRM_OPPORTUNITY_CREATE) && {
          label: 'Nueva oportunidad',
          to: '/crm/opportunities?nuevo=1',
        },
        hasPermission(PERMISSIONS.CRM_ACTIVITY_CREATE) && {
          label: 'Nueva actividad',
          to: '/crm/activities?nuevo=1',
        },
        hasPermission(PERMISSIONS.CRM_SURVEY_MANAGE) && {
          label: 'Nueva encuesta',
          to: '/crm/surveys?nuevo=1',
        },
        hasPermission(PERMISSIONS.TICKET_CREATE) && {
          label: 'Nuevo ticket',
          to: '/tickets/create',
        },
      ].filter(Boolean) as Array<{ label: string; to: string }>,
    [hasPermission],
  )

  useEffect(() => {
    localStorage.setItem('ticketflow-sidebar', collapsed ? 'collapsed' : 'expanded')
  }, [collapsed])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) setProfileOpen(false)
      if (!createMenuRef.current?.contains(event.target as Node)) setCreateOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-brand-navy">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-[#163a5f] text-white transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${collapsed ? 'w-[72px]' : 'w-[232px]'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div
          className={`flex h-14 items-center border-b border-white/10 ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}
        >
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2.5"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-[#1d4ed8] text-xs font-bold text-white">
              TF
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">TicketFlow</span>
                <span className="block text-[10px] text-white/60">CRM y mesa de ayuda</span>
              </span>
            )}
          </Link>
          {!collapsed && (
            <button
              type="button"
              className="hidden h-7 w-7 place-items-center rounded text-white/70 hover:bg-white/10 lg:grid"
              aria-label="Contraer navegación"
              onClick={() => setCollapsed(true)}
            >
              <AppIcon name="chevron-left" className="h-4 w-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            type="button"
            className="mx-auto mt-2 hidden h-7 w-7 rotate-180 place-items-center rounded text-white/70 hover:bg-white/10 lg:grid"
            aria-label="Expandir navegación"
            onClick={() => setCollapsed(false)}
          >
            <AppIcon name="chevron-left" className="h-4 w-4" />
          </button>
        )}

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {groups.map(({ group, items }) => (
            <div key={group} className="mb-4">
              {!collapsed && (
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                  {group}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center rounded text-sm transition-colors ${collapsed ? 'h-9 justify-center px-2' : 'gap-2.5 px-2.5 py-1.5'} ${isActive ? 'bg-white/15 font-medium text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'}`
                    }
                  >
                    <AppIcon name={item.icon} className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-3 md:px-5">
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Abrir menú"
            onClick={() => setSidebarOpen(true)}
          >
            <AppIcon name="menu" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-brand-navy">
              {currentItem?.label ?? 'TicketFlow'}
            </p>
          </div>

          <Link
            to="/tickets"
            className="ml-auto hidden h-9 max-w-sm flex-1 items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 hover:border-slate-300 md:flex"
          >
            <AppIcon name="search" className="h-4 w-4" />
            <span>Buscar tickets...</span>
          </Link>

          <div className="flex items-center gap-1.5 md:ml-2">
            {createActions.length > 0 && (
              <div className="relative" ref={createMenuRef}>
                <button
                  type="button"
                  className="grid h-9 w-9 place-items-center rounded bg-brand-teal text-white hover:bg-blue-800"
                  aria-label="Creación rápida"
                  aria-expanded={createOpen}
                  onClick={() => setCreateOpen((open) => !open)}
                >
                  <AppIcon name="plus" className="h-4 w-4" />
                </button>
                {createOpen && (
                  <div className="absolute right-0 mt-1 w-52 overflow-hidden rounded border border-slate-200 bg-white shadow-lg">
                    {createActions.map((action) => (
                      <Link
                        key={action.to}
                        to={action.to}
                        onClick={() => setCreateOpen(false)}
                        className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {action.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className="flex items-center gap-2 rounded border border-slate-200 bg-white p-1 pr-2 hover:bg-slate-50"
                aria-expanded={profileOpen}
              >
                <span className="grid h-7 w-7 place-items-center rounded bg-slate-700 text-[10px] font-bold text-white">
                  {initials(user?.fullName)}
                </span>
                <span className="hidden max-w-32 truncate text-sm font-medium xl:block">
                  {user?.fullName.split(' ')[0]}
                </span>
                <AppIcon
                  name="chevron-down"
                  className={`h-3.5 w-3.5 text-slate-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-1 w-64 overflow-hidden rounded border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 p-3">
                    <p className="truncate text-sm font-semibold">{user?.fullName}</p>
                    <p className="truncate text-xs text-slate-500">{user?.email}</p>
                    <p className="mt-1 text-[11px] font-medium text-slate-500">
                      {user ? ROLES[user.role] : ''}
                    </p>
                  </div>
                  <div className="p-1">
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <AppIcon name="profile" className="h-4 w-4" />
                      Ver mi perfil
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      <AppIcon name="logout" className="h-4 w-4" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-5">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
