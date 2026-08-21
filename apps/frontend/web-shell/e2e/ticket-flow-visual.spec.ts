import { expect, test, type Page } from '@playwright/test'

const KNOWN_EVENT_CODES = [
  'CREATED',
  'ASSIGNED',
  'REASSIGNED',
  'STATUS_CHANGED',
  'PRIORITY_CHANGED',
  'UPDATED',
  'AI_ASSIGNED',
  'AI_ASSIGNMENT_FAILED',
  'UNKNOWN_EVENT_TYPE',
]

async function login(page: Page, email = 'admin@helpdesk.com') {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('password')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).not.toHaveURL(/login/, { timeout: 15_000 })
}

function flowTicketOption(page: Page, ticketId: string) {
  return page.locator(`[data-ticket-id="${ticketId}"]`)
}

async function openTicketSelect(page: Page) {
  const listbox = page.getByRole('listbox', { name: 'Tickets' })
  if (!(await listbox.isVisible())) {
    await page.getByLabel('Seleccionar ticket').click()
  }
  await expect(listbox).toBeVisible()
}

async function selectFlowTicket(page: Page, ticketId: string) {
  await openTicketSelect(page)
  await flowTicketOption(page, ticketId).click()
}

async function expectFlowTicketOption(page: Page, ticketId: string, present: boolean) {
  await openTicketSelect(page)
  await expect(flowTicketOption(page, ticketId)).toHaveCount(present ? 1 : 0)
  await closeTicketSelect(page)
}

async function closeTicketSelect(page: Page) {
  const listbox = page.getByRole('listbox', { name: 'Tickets' })
  if (await listbox.isVisible()) {
    await page.keyboard.press('Escape')
    await expect(listbox).toBeHidden()
  }
}

async function openFlow(page: Page) {
  await login(page)
  await page.goto('/ticket-flow', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('radiogroup', { name: 'Estado' })).toBeVisible()
  await expectFlowTicketOption(page, 't1', true)
  await closeTicketSelect(page)
}

async function expectNoInternalEventCodes(page: Page) {
  for (const code of KNOWN_EVENT_CODES) {
    await expect(page.getByText(code, { exact: true })).toHaveCount(0)
  }
}

test.describe('Flujo visual', () => {
  test('historial corto identifica el estado actual y traduce el tipo de evento', async ({ page }) => {
    await openFlow(page)
    await expect(page.getByRole('radio', { name: /^Todos \(/ })).toHaveAttribute('aria-checked', 'true')
    await selectFlowTicket(page, 't1')
    await expect(page.getByText('Estado actual', { exact: true })).toBeVisible()
    await expect(page.getByText('Actual', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Abierto' }).first()).toBeVisible()
    await page.getByRole('button', { name: /Abierto/ }).first().click()
    await expect(page.getByText('Inspector de evento')).toBeVisible()
    await expect(page.getByText('Tipo de evento')).toBeVisible()
    await expect(page.getByText('Creación del ticket', { exact: true })).toHaveCount(1)
    await expect(page.getByRole('paragraph').filter({ hasText: /^Creación del ticket$/ })).toBeVisible()
    await expect(page.getByText('Evento técnico')).toHaveCount(0)
    await expectNoInternalEventCodes(page)
    await expect(page.getByLabel('Alejar')).toBeVisible()
    await expect(page.getByLabel('Acercar')).toBeVisible()
    await expect(page.getByLabel('Ajustar vista')).toBeVisible()
    await expect(page.getByLabel('Ir al estado actual')).toBeVisible()
    await page.screenshot({ path: 'test-results/tf-qa-09-inspector.png', fullPage: true })
  })

  test('STATUS_CHANGED se muestra como Cambio de estado', async ({ page }) => {
    await openFlow(page)
    await selectFlowTicket(page, 't5')
    await page.getByRole('button', { name: /Escalado/ }).first().click()
    await expect(page.getByText('Tipo de evento')).toBeVisible()
    await expect(page.getByText('Cambio de estado', { exact: true }).first()).toBeVisible()
    await expectNoInternalEventCodes(page)
  })

  test('seleccionar una etapa anterior conserva el indicador actual', async ({ page }) => {
    await openFlow(page)
    await selectFlowTicket(page, 't3')
    await expect(page.getByText('En proceso').first()).toBeVisible()
    const currentBadges = page.getByText('Actual', { exact: true })
    await expect(currentBadges.first()).toBeVisible()
    await page.getByRole('button', { name: /Abierto/ }).first().click()
    await expect(page.getByRole('heading', { name: 'Abierto' }).first()).toBeVisible()
    await expect(currentBadges.first()).toBeVisible()
    await expect(page.getByText('Inspector de evento')).toBeVisible()
  })

  test('cronología comparte el mismo orden y alimenta el inspector', async ({ page }) => {
    await openFlow(page)
    await selectFlowTicket(page, 't2')
    await page.getByRole('button', { name: 'Cronología' }).click()
    await expect(page.getByRole('button', { name: /01 Abierto/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /02 Asignado/ })).toBeVisible()
    await page.getByRole('button', { name: /01 Abierto/ }).click()
    await expect(page.getByText('Origen')).toBeVisible()
    await expect(page.getByRole('complementary').getByText('Abierto').first()).toBeVisible()
    await expect(page.getByRole('complementary').getByText('Creación del ticket', { exact: true })).toBeVisible()
    await expectNoInternalEventCodes(page)
  })

  test('historial largo, excepciones y zoom no eliminan la selección', async ({ page }) => {
    await openFlow(page)
    await selectFlowTicket(page, 't5')
    await expect(page.getByText('Excepción').first()).toBeVisible()
    await page.getByRole('button', { name: /Escalado/ }).first().click()
    await expect(page.getByText('Requiere infraestructura').first()).toBeVisible()
    await page.getByLabel('Acercar').click()
    await expect(page.getByText('Requiere infraestructura').first()).toBeVisible()
    await page.getByLabel('Ajustar vista').click()
    await page.getByLabel('Ir al estado actual').click()
    await expect(page.getByText('Actual', { exact: true }).first()).toBeVisible()
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(scrollWidth).toBeLessThanOrEqual(1)
    await expectNoInternalEventCodes(page)
  })

  test('ticket sin eventos muestra estado vacío', async ({ page }) => {
    await openFlow(page)
    await selectFlowTicket(page, 't9')
    await expect(page.getByText('Este ticket todavía no tiene eventos registrados.')).toBeVisible()
    await expect(page.getByText('undefined')).toHaveCount(0)
    await expectNoInternalEventCodes(page)
  })

  test('el filtro de estado actualiza el selector y conserva o limpia la selección', async ({ page }) => {
    await openFlow(page)
    await selectFlowTicket(page, 't1')
    await expect(page.getByText('Inspector de evento')).toBeVisible()
    await page.screenshot({ path: 'test-results/tf-qa-09-filtro-todos.png', fullPage: true })

    const todos = page.getByRole('radio', { name: /^Todos \(/ })
    const activos = page.getByRole('radio', { name: /^Activos \(/ })
    const resueltos = page.getByRole('radio', { name: /^Resueltos \(/ })
    const cerrados = page.getByRole('radio', { name: /^Cerrados \(/ })
    await expect(todos).toHaveAttribute('aria-checked', 'true')

    await todos.focus()
    await page.keyboard.press('ArrowRight')
    await expect(activos).toHaveAttribute('aria-checked', 'true')
    await expectFlowTicketOption(page, 't1', true)
    await expectFlowTicketOption(page, 't4', false)
    await expectFlowTicketOption(page, 't6', false)
    await expect(page.getByText('Inspector de evento')).toBeVisible()
    await expect(page.locator('span.font-mono', { hasText: 'HD-2026-0001' })).toBeVisible()
    await page.screenshot({ path: 'test-results/tf-qa-09-filtro-activos.png', fullPage: true })

    await resueltos.click()
    await expect(resueltos).toHaveAttribute('aria-checked', 'true')
    await expectFlowTicketOption(page, 't4', true)
    await expectFlowTicketOption(page, 't1', false)
    await expect(page.getByRole('heading', { name: 'Selecciona un ticket para consultar su flujo.' })).toBeVisible()
    await expect(page.getByText('Inspector de evento')).toHaveCount(0)
    await expect(page.getByText('Recorrido del ticket')).toHaveCount(0)
    await expect(page.getByText('Cronología')).toHaveCount(0)

    await cerrados.click()
    await expect(cerrados).toHaveAttribute('aria-checked', 'true')
    await expectFlowTicketOption(page, 't6', true)
    await expectFlowTicketOption(page, 't1', false)
    await expect(page.getByRole('heading', { name: 'Selecciona un ticket para consultar su flujo.' })).toBeVisible()
    await page.screenshot({ path: 'test-results/tf-qa-09-filtro-cerrados.png', fullPage: true })

    await page.getByRole('radio', { name: /^Cancelados \(/ }).click()
    await expect(page.getByText('No hay tickets que coincidan con este filtro.')).toBeVisible()
    await page.getByRole('button', { name: 'Ver todos' }).click()
    await expect(todos).toHaveAttribute('aria-checked', 'true')
    await expectFlowTicketOption(page, 't1', true)
    await expect(page.getByRole('heading', { name: 'Selecciona un ticket para consultar su flujo.' })).toBeVisible()
    await expect(page.getByText('Inspector de evento')).toHaveCount(0)
  })
})
