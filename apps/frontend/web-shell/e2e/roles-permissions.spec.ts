import { expect, test, type Page } from '@playwright/test'
import { chooseSelectOption } from './select'

async function login(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill('password')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).not.toHaveURL(/login/)
}

async function openRolesPage(page: Page) {
  await page.goto('/administration/roles-permissions')
  await expect(page.getByRole('banner').getByRole('heading', { name: 'Roles y privilegios' })).toBeVisible()
}

test.describe('Roles y privilegios', () => {
  test('muestra el menú solo al administrador y bloquea el acceso directo del agente', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Roles y privilegios' })).toBeVisible()

    await page.getByRole('navigation').getByRole('link', { name: 'Roles y privilegios' }).click()
    await expect(page.getByRole('banner').getByRole('heading', { name: 'Roles y privilegios' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()

    await page.locator('header button[aria-label="Perfil"]').click()
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await login(page, 'agent@helpdesk.com')
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Roles y privilegios' })).toHaveCount(0)
    await page.goto('/administration/roles-permissions')
    await expect(page.getByText('Acceso restringido')).toBeVisible()
  })

  test('permite cambiar de rol, marcar privilegios, detectar cambios y guardar', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await openRolesPage(page)

    await chooseSelectOption(page.getByRole('button', { name: 'Rol' }), { label: 'Agente de soporte' })
    await expect(page.getByText(/Atención de tickets asignados/)).toBeVisible()

    const viewAll = page.getByRole('checkbox', { name: 'Ver todos los tickets' })
    await viewAll.check()
    await expect(page.getByText('Hay cambios sin guardar.')).toBeVisible()

    await page.getByRole('checkbox', { name: 'Seleccionar todos' }).first().check()
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText('Privilegios guardados')).toBeVisible()

    await viewAll.uncheck()
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.getByRole('button', { name: 'Descartar' }).click()
    await expect(page.getByText('Hay cambios sin guardar.')).toHaveCount(0)
  })

  test('maneja conflicto 409 y actualiza la sesión al modificar el rol actual', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await openRolesPage(page)

    await page.getByRole('checkbox', { name: 'Ver clientes' }).uncheck()
    await page.setExtraHTTPHeaders({ 'X-TicketFlow-Stale-Permissions': '1' })
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText(/La configuración de privilegios cambió/)).toBeVisible()

    await page.setExtraHTTPHeaders({ 'X-TicketFlow-Stale-Permissions': '0' })
    await page.getByRole('checkbox', { name: 'Ver clientes' }).uncheck()
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText('Privilegios guardados')).toBeVisible()
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Clientes' })).toHaveCount(0)
  })

  test('el diseño permanece usable en móvil y escritorio', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await page.setViewportSize({ width: 390, height: 844 })
    await openRolesPage(page)
    await expect(page.getByRole('button', { name: 'Guardar' })).toBeVisible()

    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.getByRole('button', { name: 'Módulos' })).toBeVisible()
    await page.getByRole('button', { name: 'Módulos' }).click()
    await expect(page.getByRole('cell', { name: 'Configurable' }).first()).toBeVisible()

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.getByRole('button', { name: 'Historial' }).click()
    await expect(page.getByRole('heading', { name: 'Sin cambios registrados' })).toBeVisible()
  })
})
