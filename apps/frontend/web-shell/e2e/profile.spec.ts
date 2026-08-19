import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('password')
  await page.getByRole('button', { name: 'Ingresar' }).click()
}

test.describe('Perfil del usuario autenticado', () => {
  test('muestra nombre, correo, rol, estado, último acceso y fecha de alta', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await page.goto('/profile', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Admin Sistema' })).toBeVisible()
    await expect(page.getByText('admin@helpdesk.com').first()).toBeVisible()
    await expect(page.getByText('Administrador').first()).toBeVisible()
    await expect(page.getByText('Cuenta activa').first()).toBeVisible()
    await expect(page.getByText('Último acceso')).toBeVisible()
    await expect(page.getByText('Fecha de alta')).toBeVisible()
    await expect(page.getByText('Sin fecha de alta')).toHaveCount(0)
  })

  test('no permite cambiar el rol desde el perfil', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await page.goto('/profile', { waitUntil: 'domcontentloaded' })

    await expect(page.getByLabel('Rol operativo')).toHaveCount(0)
    await expect(page.locator('select')).toHaveCount(0)
    await expect(page.getByText('El rol no se modifica aquí.')).toBeVisible()
  })

  test('actualiza sólo el nombre de la cuenta autenticada', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await page.goto('/profile', { waitUntil: 'domcontentloaded' })

    await page.getByLabel('Nombre completo').fill('Admin Actualizado')
    await page.getByRole('button', { name: 'Guardar nombre' }).click()
    await expect(page.getByText('Su nombre fue actualizado a Admin Actualizado.')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Admin Actualizado' })).toBeVisible()
    await expect(page.getByText('Administrador').first()).toBeVisible()
  })

  test('exige que las contraseñas coincidan y redirige al login al cambiarla', async ({ page }) => {
    await login(page, 'agent@helpdesk.com')
    await page.goto('/profile', { waitUntil: 'domcontentloaded' })

    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
    await page.getByLabel('Contraseña actual').fill('password')
    await page.getByLabel('Nueva contraseña', { exact: true }).fill('NuevaClave1!')
    await page.getByLabel('Confirmar nueva contraseña').fill('OtraClave1!')
    await expect(page.getByRole('button', { name: 'Actualizar contraseña' })).toBeDisabled()

    await page.getByLabel('Confirmar nueva contraseña').fill('NuevaClave1!')
    await page.getByRole('button', { name: 'Actualizar contraseña' }).click()
    await expect(page.getByText('Tu contraseña se actualizó correctamente.')).toBeVisible()
    await expect(page).toHaveURL(/login/, { timeout: 10000 })
    await expect(page.getByText('Tu contraseña se actualizó correctamente.')).toBeVisible()
  })
})
