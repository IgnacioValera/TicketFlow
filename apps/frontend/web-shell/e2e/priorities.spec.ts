import { test, expect, type Page } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Correo electrónico').fill('admin@helpdesk.com')
  await page.getByLabel('Contraseña').fill('password')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).not.toHaveURL(/login/)
}

async function openPriorities(page: Page) {
  await page.goto('/catalogs/priorities', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Prioridades' })).toBeVisible()
}

async function confirmStatusChange(page: Page, action: 'Activar' | 'Desactivar') {
  await page.getByRole('dialog').getByRole('button', { name: action, exact: true }).click()
}

test.describe('Prioridades', () => {
  test('muestra color en tabla y permite sincronizar picker con hex', async ({ page }) => {
    await login(page)
    await openPriorities(page)
    await expect(page.getByText('#94A3B8')).toBeVisible()

    await page.getByRole('button', { name: 'Nueva prioridad' }).click()
    await page.locator('#color').fill('#FF5500')
    await expect(page.locator('#color')).toHaveValue('#FF5500')
    await page.locator('input[type="color"]').fill('#00aa66')
    await expect(page.locator('#color')).toHaveValue('#00AA66')
  })

  test('bloquea color inválido antes de enviar', async ({ page }) => {
    await login(page)
    await openPriorities(page)
    await page.getByRole('button', { name: 'Nueva prioridad' }).click()
    await page.locator('#priority-name').fill('Prioridad inválida')
    await page.locator('#color').fill('rojo')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText(/hexadecimal/i)).toBeVisible()
  })

  test('edición conserva el color existente', async ({ page }) => {
    await login(page)
    await openPriorities(page)
    await page.getByRole('button', { name: 'Editar prioridad Baja' }).click()
    await expect(page.locator('#color')).toHaveValue('#94A3B8')
    await page.locator('#priority-name').fill('Baja operaciones')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText('Baja operaciones')).toBeVisible()
    await expect(page.getByText('#94A3B8')).toBeVisible()
  })

  test('crear prioridad no envía descripción vacía al API', async ({ page }) => {
    await login(page)
    await openPriorities(page)

    await page.getByRole('button', { name: 'Desactivar prioridad Critica' }).click()
    await confirmStatusChange(page, 'Desactivar')
    await expect(page.getByRole('button', { name: 'Activar prioridad Critica' })).toBeVisible()

    let payload: Record<string, unknown> | null = null
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/priorities')) {
        payload = request.postDataJSON() as Record<string, unknown>
      }
    })

    await page.getByRole('button', { name: 'Nueva prioridad' }).click()
    await page.locator('#priority-name').fill('Critica QA')
    await page.locator('#priority-level').selectOption('CRITICAL')
    await page.locator('#color').fill('#AA0044')
    await page.getByRole('button', { name: 'Guardar' }).click()

    await expect(page.getByText('Critica QA')).toBeVisible()
    expect(payload).not.toBeNull()
    expect(payload).not.toHaveProperty('description')
    expect(payload?.color).toBe('#AA0044')
  })

  test('activar y desactivar prioridad', async ({ page }) => {
    await login(page)
    await openPriorities(page)

    await page.getByRole('button', { name: 'Desactivar prioridad Baja' }).click()
    await confirmStatusChange(page, 'Desactivar')
    await page.locator('select').filter({ has: page.locator('option[value="INACTIVE"]') }).selectOption('INACTIVE')
    await expect(page.getByText('Baja').first()).toBeVisible()

    await page.getByRole('button', { name: 'Activar prioridad Baja' }).click()
    await confirmStatusChange(page, 'Activar')
    await page.locator('select').filter({ has: page.locator('option[value="ACTIVE"]') }).selectOption('ACTIVE')
    await expect(page.getByText('Baja').first()).toBeVisible()
  })

  test('actualiza el color en la tabla de prioridades', async ({ page }) => {
    await login(page)
    await openPriorities(page)
    await page.getByRole('button', { name: 'Editar prioridad Alta' }).click()
    await page.locator('#color').fill('#112233')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.locator('span[title="#112233"]').first()).toBeVisible()
    await expect(page.getByText('#112233')).toBeVisible()
  })
})
