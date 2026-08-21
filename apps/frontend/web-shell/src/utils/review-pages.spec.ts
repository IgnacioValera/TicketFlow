import { describe, expect, it } from 'vitest'
import { TICKETFLOW_FAVICON_SRC, TICKETFLOW_LOGO_SRC } from '@/components/common/BrandLogo'
import { validateContactForm } from '@/utils/contact-form'
import { invitationCopyWarning } from '@/utils/opportunity-survey'

describe('Marca TicketFlow', () => {
  it('usa recursos públicos para logo y favicon', () => {
    expect(TICKETFLOW_LOGO_SRC).toBe('/ticketflow-logo.svg')
    expect(TICKETFLOW_FAVICON_SRC).toBe('/favicon.svg')
    expect(TICKETFLOW_LOGO_SRC).not.toMatch(/\/src\/assets\//)
  })
})

describe('Formulario de contactos', () => {
  it('precarga y valida los campos existentes', () => {
    expect(validateContactForm({
      clientId: 'c1',
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@acme.test',
      phone: '777',
      jobTitle: 'Compras',
    })).toEqual({})
    expect(validateContactForm({
      clientId: '',
      firstName: ' ',
      lastName: 'Pérez',
      email: 'no-correo',
      phone: '',
      jobTitle: '',
    }).clientId).toMatch(/cliente/i)
  })
})

describe('Encuesta de oportunidad', () => {
  it('no deja cerrar el enlace hasta copiarlo y no usa window.confirm', () => {
    expect(invitationCopyWarning(false)).toContain('Copia el enlace antes de cerrar')
    expect(invitationCopyWarning(true)).toBeNull()
    expect(String(invitationCopyWarning)).not.toMatch(/window\.confirm/)
  })
})
