import { LIMITS, PASSWORD_REQUIREMENTS } from '@/constants/validation'

const CHECKS = [
  { test: (value: string) => value.length >= LIMITS.PASSWORD_MIN_CHARS, label: PASSWORD_REQUIREMENTS[0] },
  { test: (value: string) => /[A-Z]/.test(value), label: PASSWORD_REQUIREMENTS[1] },
  { test: (value: string) => /[a-z]/.test(value), label: PASSWORD_REQUIREMENTS[2] },
  { test: (value: string) => /[0-9]/.test(value), label: PASSWORD_REQUIREMENTS[3] },
  { test: (value: string) => /[^A-Za-z0-9]/.test(value), label: PASSWORD_REQUIREMENTS[4] },
  {
    test: (value: string) => value.length === 0 || (value[0] !== ' ' && value[value.length - 1] !== ' '),
    label: PASSWORD_REQUIREMENTS[5],
  },
] as const

export function PasswordRequirements({ password }: { password?: string }) {
  return (
    <ul className="mt-2 space-y-1 text-xs">
      {CHECKS.map((item) => {
        const ok = password !== undefined ? item.test(password) : undefined
        return (
          <li
            key={item.label}
            className={
              ok === true ? 'font-medium text-success' : ok === false ? 'text-slate-500' : 'text-slate-500'
            }
          >
            {ok === true ? '✓' : '•'} {item.label}
          </li>
        )
      })}
    </ul>
  )
}
