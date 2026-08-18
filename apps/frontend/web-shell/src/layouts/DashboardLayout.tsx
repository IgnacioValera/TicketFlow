import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppIcon } from '@/components/common/AppIcon'
import { BrandMark } from '@/components/common/BrandLogo'
import { TicketSearch } from '@/components/tickets/TicketSearch'
import { getNavItemsForRole, type NavItem } from '@/constants/navigation'
import { PERMISSIONS } from '@/constants/permissions'
import { ROLES } from '@/constants/roles'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'

const GROUP_ORDER: NavItem['group'][] = ['CRM', 'Mesa de ayuda', 'Administración']

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
  const pageTitle =
    currentItem?.label ?? (location.pathname.startsWith('/profile') ? 'Mi perfil' : 'TicketFlow')

  const canSearchTickets =
    hasPermission(PERMISSIONS.TICKET_VIEW_OWN) || hasPermission(PERMISSIONS.TICKET_VIEW_ALL)

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
    <div className="flex min-h-screen bg-page text-text">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar text-white transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${collapsed ? 'w-[72px]' : 'w-[232px]'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div
          className={`flex h-14 items-center border-b border-white/10 ${collapsed ? 'justify-center px-2' : 'justify-between px-3'}`}
        >
          <Link
            to="/"
            title="TicketFlow"
            aria-label="TicketFlow, ir al inicio"
            className="flex min-w-0 items-center"
            onClick={() => setSidebarOpen(false)}
          >
            <BrandMark collapsed={collapsed} variant="white" />
          </Link>
          {!collapsed && (
            <button
              type="button"
              className="hidden h-7 w-7 place-items-center rounded text-white/80 hover:bg-sidebar-active lg:grid"
              aria-label="Contraer navegación"
              title="Contraer navegación"
              onClick={() => setCollapsed(true)}
            >
              <AppIcon name="chevron-left" className="h-4 w-4" />
            </button>
          )}
        </div>

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
                    title={item.label}
                    aria-label={item.label}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center rounded text-sm transition-colors ${collapsed ? 'h-9 justify-center px-2' : 'gap-2.5 px-2.5 py-1.5'} ${isActive ? 'bg-sidebar-active font-medium text-white' : 'text-white/75 hover:bg-sidebar-active/70 hover:text-white'}`
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

        {collapsed && (
          <div className="border-t border-white/10 p-2">
            <button
              type="button"
              className="mx-auto hidden h-9 w-full place-items-center rounded text-white/80 hover:bg-sidebar-active lg:grid"
              aria-label="Expandir navegación"
              title="Expandir navegación"
              onClick={() => setCollapsed(false)}
            >
              <AppIcon name="chevron-left" className="h-4 w-4 rotate-180" />
            </button>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-surface px-3 md:px-5">
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded text-muted hover:bg-page lg:hidden"
            aria-label="Abrir menú"
            onClick={() => setSidebarOpen(true)}
          >
            <AppIcon name="menu" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text">{pageTitle}</p>
          </div>

          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1.5">
            {canSearchTickets && (
              <div className="hidden min-w-0 flex-1 justify-end md:flex">
                <TicketSearch />
              </div>
            )}
            <div className="flex items-center gap-1.5">
              {createActions.length > 0 && (
                <div className="relative" ref={createMenuRef}>
                  <button
                    type="button"
                    className="grid h-9 w-9 place-items-center rounded bg-primary text-white hover:bg-primary-hover"
                    aria-label="Creación rápida"
                    aria-expanded={createOpen}
                    onClick={() => setCreateOpen((open) => !open)}
                  >
                    <AppIcon name="plus" className="h-4 w-4" />
                  </button>
                  {createOpen && (
                    <div className="absolute right-0 mt-1 w-52 overflow-hidden rounded border border-border bg-surface shadow-lg">
                      {createActions.map((action) => (
                        <Link
                          key={action.to}
                          to={action.to}
                          onClick={() => setCreateOpen(false)}
                          className="block px-3 py-2 text-sm text-text hover:bg-page"
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
                  className="flex items-center gap-2 rounded border border-border bg-surface p-1 pr-2 hover:bg-page"
                  aria-expanded={profileOpen}
                >
                  <span className="grid h-7 w-7 place-items-center rounded bg-primary text-[10px] font-bold text-white">
                    {initials(user?.fullName)}
                  </span>
                  <span className="hidden max-w-32 truncate text-sm font-medium xl:block">
                    {user?.fullName.split(' ')[0]}
                  </span>
                  <AppIcon
                    name="chevron-down"
                    className={`h-3.5 w-3.5 text-muted transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-1 w-64 overflow-hidden rounded border border-border bg-surface shadow-lg">
                    <div className="border-b border-border p-3">
                      <p className="truncate text-sm font-semibold">{user?.fullName}</p>
                      <p className="truncate text-xs text-muted">{user?.email}</p>
                      <p className="mt-1 text-[11px] font-medium text-muted">
                        {user ? ROLES[user.role] : ''}
                      </p>
                    </div>
                    <div className="p-1">
                      <Link
                        to="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 rounded px-3 py-2 text-sm text-text hover:bg-page"
                      >
                        <AppIcon name="profile" className="h-4 w-4" />
                        Ver mi perfil
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleLogout()}
                        className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-danger hover:bg-red-50"
                      >
                        <AppIcon name="logout" className="h-4 w-4" />
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
