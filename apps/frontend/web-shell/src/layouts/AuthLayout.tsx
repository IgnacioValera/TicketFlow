'use client'

import type { ReactNode } from 'react'
import { AppIcon } from '@/components/common/AppIcon'
import { BrandMark } from '@/components/common/BrandLogo'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-page lg:grid-cols-[1fr_1fr]">
      <section className="hidden min-h-screen flex-col justify-between bg-sidebar p-12 text-white lg:flex xl:p-16">
        <BrandMark variant="white" />
        <div className="max-w-xl">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Gestión comercial y de soporte en un solo lugar.
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-6 text-white/70">
            Administra clientes, oportunidades, tickets y encuestas con una vista clara del trabajo
            del equipo.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <Benefit icon="companies" label="Cartera de clientes" />
            <Benefit icon="clock" label="SLA en tiempo real" />
            <Benefit icon="shield" label="Acceso por roles" />
          </div>
        </div>
        <p className="text-xs text-white/40">TicketFlow · Aplicación empresarial</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 lg:hidden">
            <BrandMark variant="color" />
          </div>
          <div className="rounded border border-border bg-surface p-6 sm:p-8">{children}</div>
        </div>
      </section>
    </div>
  )
}

function Benefit({ icon, label }: { icon: 'companies' | 'clock' | 'shield'; label: string }) {
  return (
    <div className="rounded border border-white/15 bg-white/5 p-4">
      <AppIcon name={icon} className="mb-3 h-5 w-5 text-white/80" />
      <p className="text-xs font-medium text-white/80">{label}</p>
    </div>
  )
}
