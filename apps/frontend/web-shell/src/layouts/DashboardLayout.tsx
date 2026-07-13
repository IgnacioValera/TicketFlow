import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppIcon } from '@/components/common/AppIcon'
import { getNavItemsForRole, type NavItem } from '@/constants/navigation'
import { ROLES } from '@/constants/roles'
import { useAuth } from '@/hooks/useAuth'

const GROUP_ORDER: NavItem['group'][] = ['Operación', 'Administración', 'Analítica', 'Cuenta']

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
  const navigate = useNavigate()
  const location = useLocation()
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('ticketflow-sidebar') === 'collapsed',
  )
  const [profileOpen, setProfileOpen] = useState(false)

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

  useEffect(() => {
    localStorage.setItem('ticketflow-sidebar', collapsed ? 'collapsed' : 'expanded')
  }, [collapsed])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-[#f6f4f1] text-[#2d2833]">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-[#241f2b]/45 backdrop-blur-sm lg:hidden"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[#e4dfe7] bg-[#fbfaf8] shadow-[10px_0_35px_rgba(50,37,57,0.04)] transition-[width,transform] duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${collapsed ? 'w-[84px]' : 'w-[264px]'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div
          className={`flex h-[76px] items-center border-b border-[#e9e4eb] ${collapsed ? 'justify-center px-3' : 'justify-between px-5'}`}
        >
          <Link
            to="/"
            className="flex min-w-0 items-center gap-3"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-[#6f4fd8] text-sm font-black text-white shadow-[0_9px_22px_rgba(111,79,216,0.25)]">
              TF
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-base font-extrabold tracking-tight">
                  TicketFlow
                </span>
                <span className="block text-[11px] font-medium text-[#867b8d]">
                  Centro de soporte
                </span>
              </span>
            )}
          </Link>
          {!collapsed && (
            <button
              type="button"
              className="hidden h-8 w-8 place-items-center rounded-lg text-[#7b7181] hover:bg-[#f0ecf2] lg:grid"
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
            className="mx-auto mt-3 hidden h-8 w-8 rotate-180 place-items-center rounded-lg text-[#7b7181] hover:bg-[#f0ecf2] lg:grid"
            aria-label="Expandir navegación"
            onClick={() => setCollapsed(false)}
          >
            <AppIcon name="chevron-left" className="h-4 w-4" />
          </button>
        )}

        <nav className={`flex-1 overflow-y-auto py-4 ${collapsed ? 'px-3' : 'px-3'}`}>
          {groups.map(({ group, items }) => (
            <div key={group} className="mb-5">
              {!collapsed && (
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9b919f]">
                  {group}
                </p>
              )}
              <div className="space-y-1">
                {items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `group flex items-center rounded-xl text-sm font-semibold transition-all ${collapsed ? 'h-11 justify-center px-2' : 'gap-3 px-3 py-2.5'} ${isActive ? 'bg-[#eee9fb] text-[#5f40c4] shadow-[inset_3px_0_0_#6f4fd8]' : 'text-[#6d6473] hover:bg-[#f1edf3] hover:text-[#2d2833]'}`
                    }
                  >
                    <AppIcon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-[#e9e4eb] p-3">
          <Link
            to="/profile"
            title={collapsed ? user?.fullName : undefined}
            className={`flex items-center rounded-xl hover:bg-[#f1edf3] ${collapsed ? 'justify-center p-2' : 'gap-3 p-2.5'}`}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#6f4fd8] to-[#d76d58] text-xs font-extrabold text-white">
              {initials(user?.fullName)}
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{user?.fullName}</span>
                <span className="block truncate text-[11px] text-[#887e8e]">
                  {user ? ROLES[user.role] : ''}
                </span>
              </span>
            )}
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[76px] items-center gap-3 border-b border-[#e4dfe7] bg-[#fbfaf8]/95 px-4 backdrop-blur-xl md:px-6">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl text-[#514957] hover:bg-[#f0ecf2] lg:hidden"
            aria-label="Abrir menú"
            onClick={() => setSidebarOpen(true)}
          >
            <AppIcon name="menu" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#3b3440]">
              {currentItem?.label ?? 'TicketFlow'}
            </p>
            <p className="hidden text-[11px] text-[#908693] sm:block">
              Operación clara, seguimiento en tiempo real
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/tickets"
              className="hidden h-10 items-center gap-2 rounded-xl border border-[#ddd6e1] bg-white px-3 text-sm text-[#716778] shadow-sm hover:border-[#c7bbcd] md:flex"
            >
              <AppIcon name="search" className="h-4 w-4" />
              <span>Buscar ticket</span>
              <kbd className="rounded bg-[#f2eef4] px-1.5 py-0.5 text-[10px]">⌘ K</kbd>
            </Link>
            <button
              type="button"
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-transparent text-[#6c6272] hover:border-[#e1dae4] hover:bg-white"
              aria-label="Notificaciones"
            >
              <AppIcon name="bell" className="h-[18px] w-[18px]" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-[#fbfaf8] bg-[#dc6b4f]" />
            </button>
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className="flex items-center gap-2 rounded-xl border border-[#e1dae4] bg-white p-1.5 pr-2 shadow-sm hover:border-[#c9bdcf]"
                aria-expanded={profileOpen}
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#6f4fd8] to-[#d76d58] text-[11px] font-extrabold text-white">
                  {initials(user?.fullName)}
                </span>
                <span className="hidden max-w-32 truncate text-sm font-bold xl:block">
                  {user?.fullName.split(' ')[0]}
                </span>
                <AppIcon
                  name="chevron-down"
                  className={`h-3.5 w-3.5 text-[#887d8e] transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-[#e0d9e3] bg-white shadow-[0_18px_50px_rgba(49,35,57,0.16)]">
                  <div className="bg-gradient-to-br from-[#f1ecfc] to-[#fff1e9] p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#6f4fd8] text-sm font-extrabold text-white">
                        {initials(user?.fullName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{user?.fullName}</p>
                        <p className="truncate text-xs text-[#756b7b]">{user?.email}</p>
                      </div>
                    </div>
                    <span className="mt-3 inline-flex rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#6247b6]">
                      {user ? ROLES[user.role] : ''}
                    </span>
                  </div>
                  <div className="p-2">
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#5c5362] hover:bg-[#f4f0f5]"
                    >
                      <AppIcon name="profile" className="h-4 w-4" />
                      Ver mi perfil
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#c55249] hover:bg-[#fff1ee]"
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

        <main className="min-w-0 flex-1 p-4 md:p-6 xl:p-8">
          <div className="mx-auto w-full max-w-[1680px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
