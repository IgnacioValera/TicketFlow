import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('password')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).not.toHaveURL(/login/)
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

  test('crea ticket válido, muestra folio y aparece en listado', async ({ page }) => {
    await login(page, 'requester@helpdesk.com')
    await page.goto('/tickets/create')

    const title = `Ticket QA ${Date.now()}`
    await page.getByLabel('Título').fill(title)
    await page.getByLabel('Descripción').fill('Descripción válida para prueba de creación de ticket.')
    await page.getByLabel('Categoría').selectOption({ index: 1 })
    await page.getByLabel('Prioridad').selectOption({ index: 1 })
    await page.getByRole('button', { name: 'Crear ticket' }).click()

    await expect(page).toHaveURL(/\/tickets\/[^/]+$/)
    await expect(page.getByText(/Ticket creado correctamente/i)).toBeVisible()
    await expect(page.locator('span.font-mono').first()).toContainText('HD-2026-')

    const folio = (await page.locator('span.font-mono').first().textContent())?.trim() ?? ''
    await page.getByRole('link', { name: '← Volver al listado' }).click()
    await expect(page.getByRole('link', { name: folio })).toBeVisible()
  })

  test('cancelar regresa al listado sin crear ticket', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await page.goto('/tickets/create')
    await page.getByLabel('Título').fill('Ticket que no se guardará')
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page).toHaveURL(/\/tickets\/?$/)
  })

  test('agente autorizado puede acceder al formulario', async ({ page }) => {
    await login(page, 'agent@helpdesk.com')
    await page.goto('/tickets/create')
    await expect(page.getByRole('heading', { name: 'Crear ticket' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Crear ticket' })).toBeVisible()
  })
})
