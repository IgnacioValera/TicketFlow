export type AppIconName =
  | 'dashboard'
  | 'tickets'
  | 'plus'
  | 'flow'
  | 'users'
  | 'categories'
  | 'priority'
  | 'clock'
  | 'companies'
  | 'reports'
  | 'profile'
  | 'menu'
  | 'chevron-left'
  | 'chevron-down'
  | 'logout'
  | 'search'
  | 'bell'
  | 'shield'
  | 'mail'
  | 'calendar'
  | 'refresh'
  | 'check'
  | 'user-check'
  | 'settings'
  | 'inbox'
  | 'tag'
  | 'tools'
  | 'flag'
  | 'pause'

const paths: Record<AppIconName, string[]> = {
  dashboard: ['M4 13h6V4H4z', 'M14 20h6v-9h-6z', 'M14 4h6v3h-6z', 'M4 17h6v3H4z'],
  tickets: ['M4 5h16v14H4z', 'M8 9h8', 'M8 13h5'],
  plus: ['M12 5v14', 'M5 12h14'],
  flow: ['M6 5h5v5H6z', 'M13 14h5v5h-5z', 'M11 7h3a3 3 0 0 1 3 3v4', 'M8.5 10v4a3 3 0 0 0 3 3H13'],
  users: [
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    'M22 21v-2a4 4 0 0 0-3-3.87',
  ],
  categories: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h6v6h-6z'],
  priority: ['M5 21V4', 'M5 5h11l-2 4 2 4H5'],
  clock: ['M12 7v5l3 2', 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z'],
  companies: ['M3 21h18', 'M5 21V5h10v16', 'M15 9h4v12', 'M8 9h4', 'M8 13h4'],
  reports: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'],
  profile: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21a8 8 0 0 1 16 0'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  'chevron-left': ['M15 18l-6-6 6-6'],
  'chevron-down': ['M6 9l6 6 6-6'],
  logout: ['M10 17l5-5-5-5', 'M15 12H3', 'M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4'],
  search: ['M21 21l-4.35-4.35', 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z'],
  bell: ['M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9', 'M10 21h4'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4'],
  mail: ['M4 5h16v14H4z', 'M4 7l8 6 8-6'],
  calendar: ['M4 5h16v15H4z', 'M8 3v4', 'M16 3v4', 'M4 10h16'],
  refresh: ['M20 6v5h-5', 'M4 18v-5h5', 'M18 9a7 7 0 0 0-12-2L4 11', 'M6 15a7 7 0 0 0 12 2l2-4'],
  check: ['M5 12l4 4L19 6'],
  'user-check': [
    'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2',
    'M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    'M17 11l2 2 4-4',
  ],
  settings: [
    'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
    'M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 3.67-.08-.02a1.7 1.7 0 0 0-1.85-.25l-.75.43a1.7 1.7 0 0 0-.85 1.68V22H9.85v-.09A1.7 1.7 0 0 0 9 20.23l-.75-.43a1.7 1.7 0 0 0-1.85.25l-.08.02-2.12-3.67.06-.06A1.7 1.7 0 0 0 4.6 15v-.86a1.7 1.7 0 0 0-1.19-1.62l-.08-.03V8.25l.08-.03A1.7 1.7 0 0 0 4.6 6.6v-.86a1.7 1.7 0 0 0-.34-1.02l-.06-.06L6.32 1l.08.02a1.7 1.7 0 0 0 1.85.25L9 .84A1.7 1.7 0 0 0 9.85 0h4.3v.09A1.7 1.7 0 0 0 15 .84l.75.43a1.7 1.7 0 0 0 1.85-.25l.08-.02 2.12 3.67-.06.06a1.7 1.7 0 0 0-.34 1.02v.86a1.7 1.7 0 0 0 1.19 1.62l.08.03v4.24l-.08.03a1.7 1.7 0 0 0-1.19 1.62z',
  ],
  inbox: ['M4 5h16v12H4z', 'M4 13h4l2 3h4l2-3h4'],
  tag: ['M4 4h7l9 9-7 7-9-9z', 'M8.5 8.5h.01'],
  tools: ['M14 7l3-3 3 3-3 3', 'M5 19l8-8', 'M4 17l3 3'],
  flag: ['M5 21V4', 'M5 5h11l-2 4 2 4H5'],
  pause: ['M8 5v14', 'M16 5v14'],
}

export function AppIcon({
  name,
  className = 'h-5 w-5',
}: {
  name: AppIconName
  className?: string
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  )
}
