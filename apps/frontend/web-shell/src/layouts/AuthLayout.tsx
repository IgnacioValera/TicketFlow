import { Outlet } from 'react-router-dom'
import { AppIcon } from '@/components/common/AppIcon'

export function AuthLayout() {
  return (
    <div className="relative grid min-h-screen overflow-hidden bg-[#f6f3ef] lg:grid-cols-[1.05fr_0.95fr]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(111,79,216,0.12),transparent_30%),radial-gradient(circle_at_82%_85%,rgba(220,107,79,0.1),transparent_28%)]" />
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#2e2735] p-12 text-white lg:flex xl:p-16">
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:26px_26px]" />
        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#7d5ce1] text-sm font-black shadow-[0_10px_28px_rgba(125,92,225,.3)]">
            TF
          </span>
          <div>
            <p className="font-extrabold tracking-tight">TicketFlow</p>
            <p className="text-xs text-white/55">Centro de soporte</p>
          </div>
        </div>
        <div className="relative max-w-xl">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/70">
            <span className="h-2 w-2 rounded-full bg-[#efb44e]" />
            Operación conectada
          </span>
          <h1 className="text-4xl font-bold leading-tight tracking-[-0.03em] xl:text-5xl">
            Cada solicitud.
            <br />
            Un recorrido claro.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-white/60">
            Centraliza el soporte, entiende cada transición y mantén el SLA visible para todo el
            equipo.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <Benefit icon="flow" label="Flujos visuales" />
            <Benefit icon="clock" label="SLA en tiempo real" />
            <Benefit icon="shield" label="Acceso por roles" />
          </div>
        </div>
        <p className="relative text-xs text-white/35">TicketFlow · Mesa de ayuda empresarial</p>
      </section>

      <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[440px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#6f4fd8] text-sm font-black text-white">
              TF
            </span>
            <div>
              <p className="font-extrabold">TicketFlow</p>
              <p className="text-xs text-[#887d8e]">Centro de soporte</p>
            </div>
          </div>
          <div className="rounded-[24px] border border-[#e2dbe5] bg-white/90 p-6 shadow-[0_24px_70px_rgba(54,39,63,0.1)] backdrop-blur sm:p-9">
            <Outlet />
          </div>
          <p className="mt-5 text-center text-[11px] text-[#978d9b]">
            Acceso protegido · Sesión administrada por roles
          </p>
        </div>
      </section>
    </div>
  )
}

function Benefit({ icon, label }: { icon: 'flow' | 'clock' | 'shield'; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <AppIcon name={icon} className="mb-3 h-5 w-5 text-[#d5c7ff]" />
      <p className="text-xs font-semibold text-white/75">{label}</p>
    </div>
  )
}
