import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill('admin@helpdesk.com')
  await page.getByLabel('Contraseña').fill('password')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).not.toHaveURL(/\/login$/)
}

test.describe('Clientes CRM', () => {
  test('lista, busca y muestra errores junto al campo', async ({ page }) => {
    await login(page)
    await page.goto('/crm/clients')
    await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible()
    await expect(page.getByText('Acme Corp')).toBeVisible()

    await page.getByPlaceholder('Buscar clientes...').fill('Globex')
    await expect(page.getByText('Globex')).toBeVisible()
    await expect(page.getByText('Acme Corp')).toHaveCount(0)

    await page.getByRole('button', { name: 'Limpiar filtros' }).click()
    await expect(page.getByText('Acme Corp')).toBeVisible()

    await page.getByRole('button', { name: '+ Nuevo cliente' }).click()
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText('El nombre es obligatorio y no puede contener solo espacios')).toBeVisible()
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await page.getByRole('button', { name: '+ Nuevo cliente' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.locator('input').nth(0).fill('Nueva Empresa')
    await dialog.locator('input').nth(1).fill('Servicios')
    await dialog.locator('input').nth(2).fill('Centro')
    await dialog.locator('input[type="email"]').fill('nueva@empresa.test')
    await dialog.locator('input').nth(4).fill('7778889900')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByRole('status')).toContainText('Cliente creado')
    await expect(page.getByText('Nueva Empresa se agregó a la cartera.')).toBeVisible()
  })

  test('el detalle muestra contactos y oportunidades', async ({ page }) => {
    await login(page)
    await page.goto('/crm/clients/c1')
    await expect(page.getByRole('heading', { name: 'Acme Corp' })).toBeVisible()
    await page.getByRole('tab', { name: 'Contactos' }).click()
    await expect(page.getByText('Ana López')).toBeVisible()
    await page.getByRole('tab', { name: 'Oportunidades' }).click()
    await expect(page.getByText('Renovación')).toBeVisible()
  })
})
