import { PASSWORD_REQUIREMENTS } from '@/constants/validation'

export function PasswordRequirements() {
  return (
    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-slate-500">
      {PASSWORD_REQUIREMENTS.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}
