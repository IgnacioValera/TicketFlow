import { expect, test, type Page } from '@playwright/test'

const KNOWN_EVENT_CODES = [
  'CREATED',
  'ASSIGNED',
  'REASSIGNED',
  'STATUS_CHANGED',
  'PRIORITY_CHANGED',
  'UPDATED',
  'UNKNOWN_EVENT_TYPE',
]

async function login(page: Page, email = 'admin@helpdesk.com') {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('password')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).not.toHaveURL(/login/)
}

async function openFlow(page: Page) {
  await login(page)
  await page.goto('/ticket-flow', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('radiogroup', { name: 'Estado' })).toBeVisible()
  await expect(page.getByLabel('Seleccionar ticket').locator('option[value="t1"]')).toHaveCount(1)
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
    await page.getByLabel('Seleccionar ticket').selectOption('t1')
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
    await page.getByLabel('Seleccionar ticket').selectOption('t5')
    await page.getByRole('button', { name: /Escalado/ }).first().click()
    await expect(page.getByText('Tipo de evento')).toBeVisible()
    await expect(page.getByRole('paragraph').filter({ hasText: /^Cambio de estado$/ })).toBeVisible()
    await expectNoInternalEventCodes(page)
  })

  test('seleccionar una etapa anterior conserva el indicador actual', async ({ page }) => {
    await openFlow(page)
    await page.getByLabel('Seleccionar ticket').selectOption('t3')
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
    await page.getByLabel('Seleccionar ticket').selectOption('t2')
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
    await page.getByLabel('Seleccionar ticket').selectOption('t8')
    await expect(page.getByText('Excepción').first()).toBeVisible()
    await page.getByRole('button', { name: /Escalado/ }).first().click()
    await expect(page.getByText('Requiere infraestructura')).toBeVisible()
    await page.getByLabel('Acercar').click()
    await expect(page.getByText('Requiere infraestructura')).toBeVisible()
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
    await page.getByLabel('Seleccionar ticket').selectOption('t9')
    await expect(page.getByText('Este ticket todavía no tiene eventos registrados.')).toBeVisible()
    await expect(page.getByText('undefined')).toHaveCount(0)
    await expectNoInternalEventCodes(page)
  })

  test('el filtro de estado actualiza el selector y conserva o limpia la selección', async ({ page }) => {
    await openFlow(page)
    await page.getByLabel('Seleccionar ticket').selectOption('t1')
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
    await expect(page.getByLabel('Seleccionar ticket').locator('option[value="t1"]')).toHaveCount(1)
    await expect(page.getByLabel('Seleccionar ticket').locator('option[value="t4"]')).toHaveCount(0)
    await expect(page.getByLabel('Seleccionar ticket').locator('option[value="t6"]')).toHaveCount(0)
    await expect(page.getByText('Inspector de evento')).toBeVisible()
    await expect(page.locator('span.font-mono', { hasText: 'HD-2026-0001' })).toBeVisible()
    await page.screenshot({ path: 'test-results/tf-qa-09-filtro-activos.png', fullPage: true })

    await resueltos.click()
    await expect(resueltos).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByLabel('Seleccionar ticket').locator('option[value="t4"]')).toHaveCount(1)
    await expect(page.getByLabel('Seleccionar ticket').locator('option[value="t1"]')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Selecciona un ticket para consultar su flujo.' })).toBeVisible()
    await expect(page.getByText('Inspector de evento')).toHaveCount(0)
    await expect(page.getByText('Recorrido del ticket')).toHaveCount(0)
    await expect(page.getByText('Cronología')).toHaveCount(0)

    await cerrados.click()
    await expect(cerrados).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByLabel('Seleccionar ticket').locator('option[value="t6"]')).toHaveCount(1)
    await expect(page.getByLabel('Seleccionar ticket').locator('option[value="t1"]')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Selecciona un ticket para consultar su flujo.' })).toBeVisible()
    await page.screenshot({ path: 'test-results/tf-qa-09-filtro-cerrados.png', fullPage: true })

    await page.getByRole('radio', { name: /^Cancelados \(/ }).click()
    await expect(page.getByText('No hay tickets que coincidan con este filtro.')).toBeVisible()
    await page.getByRole('button', { name: 'Ver todos' }).click()
    await expect(todos).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByLabel('Seleccionar ticket').locator('option[value="t1"]')).toHaveCount(1)
    await expect(page.getByRole('heading', { name: 'Selecciona un ticket para consultar su flujo.' })).toBeVisible()
    await expect(page.getByText('Inspector de evento')).toHaveCount(0)
  })
})
