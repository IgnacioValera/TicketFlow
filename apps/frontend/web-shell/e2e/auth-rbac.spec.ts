import { test, expect } from '@playwright/test'

test.describe('Autenticación', () => {
  test('login exitoso como administrador', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Correo electrónico').fill('admin@helpdesk.com')
    await page.getByLabel('Contraseña').fill('password')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page).toHaveURL(/dashboard/)
    await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible()
  })

  test('login fallido muestra credenciales inválidas', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Correo electrónico').fill('admin@helpdesk.com')
    await page.getByLabel('Contraseña').fill('wrongpassword')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByText('Credenciales inválidas o cuenta no disponible.')).toBeVisible()
  })

  test('usuario inactivo muestra error genérico', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Correo electrónico').fill('inactive@helpdesk.com')
    await page.getByLabel('Contraseña').fill('password')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByText('Credenciales inválidas o cuenta no disponible.')).toBeVisible()
  })
})

test.describe('Control de acceso por rol', () => {
  test('agente no puede acceder a usuarios', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Correo electrónico').fill('agent@helpdesk.com')
    await page.getByLabel('Contraseña').fill('password')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page).not.toHaveURL(/login/)
    await page.goto('/users')
    await expect(page.getByText('Acceso restringido')).toBeVisible()
  })

  test('administrador puede acceder a usuarios', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Correo electrónico').fill('admin@helpdesk.com')
    await page.getByLabel('Contraseña').fill('password')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page).not.toHaveURL(/login/)
    await page.goto('/users')
    await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible()
  })

  test('solicitante redirige a tickets tras login', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Correo electrónico').fill('requester@helpdesk.com')
    await page.getByLabel('Contraseña').fill('password')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page).toHaveURL(/tickets/)
  })
})
