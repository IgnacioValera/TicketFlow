import { expect, test, type Page } from '@playwright/test'
import { chooseSelectOption } from './select'

async function login(page: Page, email = 'admin@helpdesk.com') {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('password')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).not.toHaveURL(/\/login$/)
}

test.describe('Revisión páginas 1 y 2', () => {
  test('el login muestra el logo y el loader de sesión', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    const logo = page.getByAltText('TicketFlow').first()
    await expect(logo).toBeVisible()
    await expect(logo).toHaveAttribute('src', /ticketflow-logo\.svg/)
    const favicon = await page.locator('link[rel="icon"]').first().getAttribute('href')
    expect(favicon).toMatch(/favicon\.svg|icon/)

    await page.setExtraHTTPHeaders({ 'X-TicketFlow-Delay-Ms': '900' })
    await page.addInitScript(() => {
      localStorage.setItem('helpdesk_access_token', 'mock-token-1')
      localStorage.setItem('helpdesk_refresh_token', 'mock-refresh-1')
    })
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Cargando información…')).toBeVisible()
    await expect(page.getByRole('status').first()).toHaveAttribute('aria-live', 'polite')
    await expect(page.getByText('Cargando información…')).toHaveCount(0, { timeout: 15000 })
  })

  test('edita un contacto y actualiza la lista', async ({ page }) => {
    await login(page)
    await page.goto('/crm/contacts')
    await expect(page.getByRole('heading', { name: 'Contactos', exact: true })).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: 'Nuevo contacto' }).click()
    const create = page.getByRole('dialog', { name: 'Nuevo contacto' })
    await chooseSelectOption(create.locator('#contact-client'), { label: 'Acme Corp' })
    await create.getByLabel('Nombre').fill('Carla')
    await create.getByLabel('Apellido').fill('Méndez')
    await create.getByLabel('Correo').fill('carla.mendez@acme.test')
    await create.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Contacto creado' })).toBeVisible()
    await expect(create).toHaveCount(0)

    await page.locator('tr', { hasText: 'Carla Méndez' }).getByRole('button', { name: 'Editar contacto' }).click()
    const dialog = page.getByRole('dialog', { name: 'Editar contacto' })
    await expect(dialog.getByLabel('Nombre')).toHaveValue('Carla')
    await dialog.getByLabel('Nombre').fill('Carolina')
    await dialog.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Contacto actualizado' })).toBeVisible()
    await expect(page.getByText('Carolina Méndez')).toBeVisible()
  })

  test('elimina un contacto con el modal de TicketFlow', async ({ page }) => {
    await login(page)
    await page.goto('/crm/contacts')
    await page.getByRole('button', { name: 'Nuevo contacto' }).click()
    const create = page.getByRole('dialog', { name: 'Nuevo contacto' })
    await chooseSelectOption(create.locator('#contact-client'), { label: 'Acme Corp' })
    await create.getByLabel('Nombre').fill('Diego')
    await create.getByLabel('Apellido').fill('Ruiz')
    await create.getByLabel('Correo').fill('diego.ruiz@acme.test')
    await create.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText('Diego Ruiz')).toBeVisible()

    await page.locator('tr', { hasText: 'Diego Ruiz' }).getByRole('button', { name: 'Eliminar contacto' }).click()
    const confirm = page.getByRole('dialog', { name: '¿Eliminar contacto?' })
    await expect(confirm).toBeVisible()
    await expect(confirm.getByText(/Diego Ruiz/)).toBeVisible()
    await confirm.getByRole('button', { name: 'Eliminar contacto' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Contacto eliminado' })).toBeVisible()
    await expect(page.locator('tr', { hasText: 'Diego Ruiz' })).toHaveCount(0)
  })

  test('un usuario sin permiso no ve las acciones de contacto', async ({ page }) => {
    await login(page, 'supervisor@helpdesk.com')
    await page.goto('/crm/contacts')
    await expect(page.getByRole('heading', { name: 'Contactos', exact: true })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: 'Editar contacto' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Eliminar contacto' })).toHaveCount(0)
  })

  test('el detalle del cliente explica el origen de la puntuación', async ({ page }) => {
    await login(page)
    await page.goto('/crm/clients/c1')
    await expect(page.getByText('Puntuación del cliente')).toBeVisible()
    await expect(page.getByText('50 / 100')).toHaveCount(0)
    await page.getByRole('button', { name: '¿Cómo se calcula?' }).click()
    await expect(page.getByText('Se calcula con datos reales de satisfacción, oportunidades, actividad comercial, tickets y antigüedad. No se usa un valor fijo.')).toBeVisible()
  })

  test('las tarjetas de oportunidad tienen tres acciones y no usan alertas nativas', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    let nativeDialog = false
    page.on('dialog', () => {
      nativeDialog = true
    })
    await login(page)
    await page.goto('/crm/opportunities')
    const card = page.locator('article').filter({ hasText: 'Renovación' }).first()
    await expect(card.getByRole('button', { name: 'Editar oportunidad' })).toBeVisible()
    await expect(card.getByRole('button', { name: 'Ver oportunidad' })).toBeVisible()
    await expect(card.getByRole('button', { name: 'Gestionar encuesta' })).toBeVisible()

    await card.getByRole('button', { name: 'Ver oportunidad' }).click()
    const detail = page.getByRole('dialog', { name: 'Renovación' })
    await expect(detail.getByRole('heading', { name: 'Notas' })).toBeVisible()
    await expect(detail.getByText('Encuesta de satisfacción')).toHaveCount(0)
    await expect(detail.getByRole('heading', { name: 'Actividades' })).toHaveCount(0)
    await detail.getByRole('button', { name: 'Cerrar ventana' }).click()

    await card.getByRole('button', { name: 'Gestionar encuesta' }).click()
    const survey = page.getByRole('dialog').filter({ hasText: 'Encuesta de satisfacción' })
    await expect(survey.getByRole('heading', { name: 'Encuesta de satisfacción' })).toBeVisible()
    await expect(survey.getByText('Cierre estimado')).toHaveCount(0)
    await page.getByLabel('Encuesta manual').scrollIntoViewIfNeeded()
    await chooseSelectOption(page.getByLabel('Encuesta manual'), { label: 'NPS de cliente' })
    await page.getByRole('button', { name: 'Generar encuesta manual' }).click()
    const generated = page.getByRole('dialog', { name: 'Encuesta generada' })
    await expect(generated).toBeVisible()
    await expect(generated.getByRole('button', { name: 'Finalizar' })).toBeDisabled()
    await generated.getByRole('button', { name: 'Copiar enlace' }).click()
    await expect(generated.getByText('Enlace copiado')).toBeVisible()
    await generated.getByRole('button', { name: 'Finalizar' }).click()
    await expect(generated).toHaveCount(0)

    await card.getByRole('button', { name: 'Gestionar encuesta' }).click()
    await chooseSelectOption(page.getByLabel('Encuesta manual'), { label: 'NPS de cliente' })
    await page.getByRole('button', { name: 'Generar encuesta manual' }).click()
    const regen = page.getByRole('dialog', { name: '¿Generar un enlace nuevo?' })
    await expect(regen).toBeVisible()
    await expect(page.getByText('No se pudo generar')).toHaveCount(0)
    await regen.getByRole('button', { name: 'Generar uno nuevo' }).click()
    await expect(page.getByRole('dialog', { name: 'Encuesta generada' })).toBeVisible()
    expect(nativeDialog).toBe(false)
  })
})
