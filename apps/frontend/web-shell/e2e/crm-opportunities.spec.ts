import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Correo electrónico').fill('admin@helpdesk.com')
  await page.getByLabel('Contraseña').fill('password')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).not.toHaveURL(/\/login$/)
}

test.describe('Oportunidades CRM', () => {
  test('lista, filtra y calcula totales con los registros correspondientes', async ({ page }) => {
    await login(page)
    await page.goto('/crm/opportunities')
    await expect(page.getByRole('heading', { name: 'Oportunidades' })).toBeVisible()
    await expect(page.getByText('Renovación')).toBeVisible()
    await expect(page.getByText('4 oportunidades')).toBeVisible()

    await page.getByLabel('Cliente', { exact: true }).selectOption({ label: 'Acme Corp' })
    await expect(page.getByText('Renovación')).toBeVisible()
    await expect(page.getByText('Licencias')).toHaveCount(0)
    await expect(page.getByText('2 oportunidades')).toBeVisible()
    await expect(page.getByText('$130,000')).toBeVisible()

    await page.getByRole('button', { name: 'Limpiar filtros' }).click()
    await page.getByLabel('Estado', { exact: true }).selectOption('OPEN')
    await expect(page.getByText('Soporte anual')).toHaveCount(0)
    await expect(page.getByText('Pilot')).toHaveCount(0)
  })

  test('crea y edita una oportunidad asociada al cliente', async ({ page }) => {
    await login(page)
    await page.goto('/crm/opportunities')
    await page.getByRole('button', { name: '+ Nueva oportunidad' }).click()
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText('El nombre es obligatorio y no puede contener solo espacios')).toBeVisible()
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await page.getByRole('button', { name: '+ Nueva oportunidad' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('textbox').first().fill('Nueva venta')
    await dialog.locator('select').first().selectOption('c1')
    await dialog.getByLabel('Importe').fill('15000')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByRole('status')).toContainText('Oportunidad creada')
    await expect(page.getByText('Nueva venta', { exact: true })).toBeVisible()

    await page.locator('article').filter({ hasText: 'Nueva venta' }).getByRole('button', { name: 'Editar' }).click()
    await page.getByRole('dialog').getByRole('textbox').first().fill('Nueva venta actualizada')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByRole('status')).toContainText('Oportunidad actualizada')
    await expect(page.getByText('Nueva venta actualizada', { exact: true })).toBeVisible()
  })
})
