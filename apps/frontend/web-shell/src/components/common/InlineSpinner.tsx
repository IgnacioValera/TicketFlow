export function InlineSpinner({ label = 'Cargando' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="tf-spinner h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  )
}
