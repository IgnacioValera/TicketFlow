import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('password')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).not.toHaveURL(/login/)
}

test.describe('Validación de tickets', () => {
  test('combina filtros y permite limpiarlos', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await page.goto('/tickets')
    await page.getByPlaceholder('Buscar folio o título...').fill('0006')
    await page.locator('select').nth(0).selectOption('CLOSED')
    await expect(page.getByRole('link', { name: 'HD-2026-0006' })).toBeVisible()
    await page.getByRole('button', { name: 'Limpiar filtros' }).click()
    await expect(page.getByPlaceholder('Buscar folio o título...')).toHaveValue('')
    await expect(page.locator('select').nth(0)).toHaveValue('')
  })

  test('muestra ticket cerrado en solo lectura', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await page.goto('/tickets/t6')
    await expect(page.getByText('Este ticket está cerrado y es de solo lectura')).toBeVisible()
    await expect(page.getByPlaceholder('Escribe un comentario...')).toHaveCount(0)
  })

  test('no permite resolver un ticket abierto sin transición válida', async ({ page }) => {
    await login(page, 'supervisor@helpdesk.com')
    await page.goto('/tickets/t1')
    await expect(page.getByRole('button', { name: 'Resolver' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Iniciar atención' })).toHaveCount(0)
  })

  test('refresca listado al volver desde detalle', async ({ page }) => {
    await login(page, 'supervisor@helpdesk.com')
    await page.goto('/tickets/t1')
    await page.getByRole('button', { name: 'Asignar agente' }).click()
    await page.locator('#assignee').selectOption({ index: 1 })
    await page.getByRole('dialog', { name: 'Asignar agente' }).getByRole('button', { name: 'Asignar', exact: true }).click()
    await expect(page.getByRole('definition').filter({ hasText: 'Agente Soporte' })).toBeVisible()
    await page.getByRole('link', { name: '← Volver al listado' }).click()
    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'HD-2026-0001' })).toBeVisible()
  })
})
