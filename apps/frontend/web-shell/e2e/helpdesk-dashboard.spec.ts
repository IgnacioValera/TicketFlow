import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('password')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).not.toHaveURL(/login/)
}

test.describe('Panel de mesa de ayuda', () => {
  test('muestra métricas reales y navega con filtros desde las tarjetas', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible()

    const overdueCard = page.getByRole('link', { name: /Vencidos:/ })
    await expect(overdueCard).toBeVisible()
    const overdueValue = Number((await overdueCard.locator('p').nth(1).textContent())?.trim() ?? '0')
    expect(overdueValue).toBeGreaterThan(0)

    await overdueCard.click()
    await expect(page).toHaveURL(/\/tickets\?slaStatus=overdue/)
    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()
    await expect(page.getByRole('main').getByLabel('SLA')).toContainText('Vencidos')
  })

  test('aplica el filtro de estado correcto al navegar desde KPIs', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await page.goto('/dashboard')

    await page.getByRole('link', { name: /Abiertos:/ }).click()
    await expect(page).toHaveURL(/\/tickets\?preset=open/)
    await expect(page.getByRole('main').getByLabel('Estado')).toContainText('Abiertos')

    await page.goto('/dashboard')
    await page.getByRole('link', { name: /En proceso:/ }).click()
    await expect(page).toHaveURL(/\/tickets\?preset=inProgress/)
    await expect(page.getByRole('main').getByLabel('Estado')).toContainText('En proceso')

    await page.goto('/dashboard')
    await page.getByRole('link', { name: /Cerrados:/ }).click()
    await expect(page).toHaveURL(/\/tickets\?preset=closed/)
    await expect(page.getByRole('main').getByLabel('Estado')).toContainText('Cerrados')
  })

  test('limita indicadores del agente a sus tickets', async ({ page }) => {
    await login(page, 'agent@helpdesk.com')
    await page.goto('/dashboard')
    await expect(page.getByText('Vista limitada para agente')).toBeVisible()

    const openCard = page.getByRole('link', { name: /Abiertos:/ })
    const openValue = Number((await openCard.locator('p').nth(1).textContent())?.trim() ?? '0')
    expect(openValue).toBe(1)

    await openCard.click()
    await expect(page).toHaveURL(/\/tickets\?preset=open/)
    await expect(page.getByRole('main').getByLabel('Estado')).toContainText('Abiertos')
  })
})
