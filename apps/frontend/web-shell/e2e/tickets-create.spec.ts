import { test, expect, type Page } from '@playwright/test'
import { chooseSelectOption } from './select'

const AUTHORIZED_ROLES = [
  'admin@helpdesk.com',
  'supervisor@helpdesk.com',
  'agent@helpdesk.com',
  'requester@helpdesk.com',
] as const

async function login(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('password')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).not.toHaveURL(/login/)
}

async function fillValidTicketForm(page: Page, title: string) {
  await page.getByLabel('Título').fill(title)
  await page.getByLabel('Descripción').fill('Descripción válida para prueba de creación de ticket.')
  await page.locator('#categoryId').click()
  await page.getByRole('option').first().click()
  await chooseSelectOption(page.locator('#priorityId'), { index: 1 })
}

test.describe('Crear ticket', () => {
  test('bloquea envío con formulario inválido', async ({ page }) => {
    await login(page, 'requester@helpdesk.com')
    await page.goto('/tickets/create')
    await page.getByLabel('Título').fill('abc')
    await page.getByLabel('Descripción').fill('corta')
    await page.getByRole('button', { name: 'Crear ticket' }).click()
    await expect(page.getByText(/al menos 4 caracteres/i)).toBeVisible()
    await expect(page).toHaveURL(/\/tickets\/create/)
  })

  test('rechaza título con solo espacios en blanco', async ({ page }) => {
    await login(page, 'requester@helpdesk.com')
    await page.goto('/tickets/create')
    await page.getByLabel('Título').fill('     ')
    await page.getByLabel('Descripción').fill('Descripción válida para prueba de creación de ticket.')
    await page.locator('#categoryId').click()
    await page.getByRole('option').first().click()
    await chooseSelectOption(page.locator('#priorityId'), { index: 1 })
    await page.getByRole('button', { name: 'Crear ticket' }).click()
    await expect(page.getByText(/título es obligatorio/i)).toBeVisible()
    await expect(page).toHaveURL(/\/tickets\/create/)
  })

  test('no muestra categorías inactivas en el selector', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await page.goto('/tickets/create')
    await page.locator('#categoryId').click()
    await expect(page.getByRole('option', { name: 'Accesos' })).toHaveCount(0)
    await expect(page.getByRole('option', { name: 'Hardware' })).toHaveCount(1)
  })

  test('crea ticket con caracteres especiales y muestra folio', async ({ page }) => {
    await login(page, 'requester@helpdesk.com')
    await page.goto('/tickets/create')
    const title = `Ticket QA — ñ & símbolos #${Date.now()}`
    await fillValidTicketForm(page, title)
    await page.getByRole('button', { name: 'Crear ticket' }).click()
    await expect(page).toHaveURL(/\/tickets\/[^/]+$/)
    await expect(page.getByText(/Ticket creado correctamente/i)).toBeVisible()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
  })

  for (const email of AUTHORIZED_ROLES) {
    test(`rol autorizado ${email} puede crear un ticket válido`, async ({ page }) => {
      await login(page, email)
      await page.goto('/tickets/create')
      const title = `Ticket ${email.split('@')[0]} ${Date.now()}`
      await fillValidTicketForm(page, title)
      await page.getByRole('button', { name: 'Crear ticket' }).click()
      await expect(page).toHaveURL(/\/tickets\/[^/]+$/)
      await expect(page.getByText(/Ticket creado correctamente/i)).toBeVisible()
    })
  }

  test('crea ticket válido, muestra folio y aparece en listado', async ({ page }) => {
    await login(page, 'requester@helpdesk.com')
    await page.goto('/tickets/create')

    const title = `Ticket QA ${Date.now()}`
    await fillValidTicketForm(page, title)
    await page.getByRole('button', { name: 'Crear ticket' }).click()

    await expect(page).toHaveURL(/\/tickets\/[^/]+$/)
    await expect(page.getByText(/Ticket creado correctamente/i)).toBeVisible()
    await expect(page.locator('span.font-mono').first()).toContainText('HD-2026-')

    const folio = (await page.locator('span.font-mono').first().textContent())?.trim() ?? ''
    await page.getByRole('link', { name: '← Volver al listado' }).click()
    await expect(page.getByRole('link', { name: folio })).toBeVisible()
  })

  test('el ticket creado aparece en el flujo visual', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await page.goto('/tickets/create')
    const title = `Ticket flujo ${Date.now()}`
    await fillValidTicketForm(page, title)
    await page.getByRole('button', { name: 'Crear ticket' }).click()
    await expect(page.getByText(/Ticket creado correctamente/i)).toBeVisible()
    await page.getByRole('link', { name: 'Ver flujo visual' }).click()
    await expect(page).toHaveURL(/\/tickets\/[^/]+\/flow/)
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await expect(page.getByText('Estado actual', { exact: true })).toBeVisible()
  })

  test('doble clic en Crear ticket produce una sola petición', async ({ page }) => {
    await login(page, 'requester@helpdesk.com')
    let createCalls = 0
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/api/v1/tickets')) {
        createCalls += 1
      }
    })
    await page.goto('/tickets/create')
    const title = `Ticket doble ${Date.now()}`
    await fillValidTicketForm(page, title)
    await page.getByRole('button', { name: 'Crear ticket' }).dblclick()
    await expect(page).toHaveURL(/\/tickets\/[^/]+$/)
    expect(createCalls).toBe(1)
  })

  test('error del API conserva los datos capturados', async ({ page }) => {
    await login(page, 'requester@helpdesk.com')
    await page.setExtraHTTPHeaders({ 'X-TicketFlow-Fail-Create': '1' })
    await page.goto('/tickets/create')
    const title = `Ticket error API ${Date.now()}`
    const description = 'Descripción que debe conservarse tras fallo del servidor.'
    await page.getByLabel('Título').fill(title)
    await page.getByLabel('Descripción').fill(description)
    await page.locator('#categoryId').click()
    await page.getByRole('option').first().click()
    await chooseSelectOption(page.locator('#priorityId'), { index: 1 })
    await page.getByRole('button', { name: 'Crear ticket' }).click()
    await expect(page.getByRole('alert')).toContainText(/error simulado/i)
    await expect(page.getByLabel('Título')).toHaveValue(title)
    await expect(page.getByLabel('Descripción')).toHaveValue(description)
    await expect(page).toHaveURL(/\/tickets\/create/)
  })

  test('muestra empty state cuando no hay catálogos activos', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await page.setExtraHTTPHeaders({ 'X-TicketFlow-Empty-Catalogs': '1' })
    await page.goto('/tickets/create')
    await expect(page.getByText('No hay catálogos activos')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Crear ticket' })).toHaveCount(0)
  })

  test('cancelar regresa al listado sin crear ticket', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await page.goto('/tickets/create')
    await page.getByLabel('Título').fill('Ticket que no se guardará')
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page).toHaveURL(/\/tickets\/?$/)
  })
})
