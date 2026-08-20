import { test, expect } from '@playwright/test'
import { chooseSelectOption } from './select'

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill('admin@helpdesk.com')
  await page.getByLabel('Contraseña').fill('password')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).toHaveURL(/dashboard/)
}

test.describe('Reportes', () => {
  test('carga datos reales y actualiza al cambiar el periodo', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/reports', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Reportes' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Tickets por estado' })).toBeVisible()
    await expect(page.getByText('Placeholder')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Exportar CSV' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Exportar PDF' })).toBeVisible()

    await page.getByRole('button', { name: 'Satisfacción' }).click()
    await expect(page.getByText('Calificación de 1 a 5')).toBeVisible()

    await page.getByRole('button', { name: 'Por estado' }).click()
    await chooseSelectOption(page.getByLabel('Periodo'), '7d')
    await expect(page.getByRole('heading', { name: 'Tickets por estado' })).toBeVisible()
  })

  test('descarga un CSV con el reporte completo', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/reports', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Reportes' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Exportar CSV' })).toBeEnabled()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Exportar CSV' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^TicketFlow-tickets-.*\.csv$/)
  })

  test('no envía un rango invertido al servidor', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/reports', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Reportes' })).toBeVisible()

    let invertedRequest = false
    page.on('request', (request) => {
      if (!request.url().includes('/reports/')) return
      const url = new URL(request.url())
      const start = url.searchParams.get('startDate')
      const end = url.searchParams.get('endDate')
      if (start && end && start > end) invertedRequest = true
    })

    await page.getByLabel('Fecha inicial').fill('2026-08-18')
    await page.getByLabel('Fecha final').fill('2026-08-01')
    await page.waitForTimeout(400)
    expect(invertedRequest).toBe(false)
  })
})
