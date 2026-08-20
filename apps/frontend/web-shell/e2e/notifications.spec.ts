import { expect, test, type Page } from '@playwright/test'
import { chooseSelectOption } from './select'

async function login(page: Page, email: string) {
  const currentUrl = page.url()
  const pathname = currentUrl && currentUrl !== 'about:blank' ? new URL(currentUrl).pathname : '/'
  if (pathname !== '/login') {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
  }
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('password')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).not.toHaveURL(/login/)
}

async function switchUser(page: Page, email: string) {
  await page.locator('header button[aria-label="Perfil"]').click()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/login/)
  await login(page, email)
}

async function openBell(page: Page) {
  await page.getByRole('button', { name: 'Notificaciones' }).click()
  const bell = page.getByRole('dialog', { name: 'Notificaciones recientes' })
  await expect(bell).toBeVisible()
  await expect(bell.getByText('Cargando notificaciones…')).toHaveCount(0)
  return bell
}

test.describe('Cliente del solicitante y centro de notificaciones', () => {
  test('flujo de vinculación, campana, comentarios y lectura', async ({ page }) => {
    test.setTimeout(120000)
    const stamp = Date.now()
    const ticketTitle = `Ticket notificaciones ${stamp}`

    await login(page, 'admin@helpdesk.com')
    await page.getByRole('navigation').getByRole('link', { name: 'Usuarios' }).click()
    await page.getByRole('button', { name: 'Nuevo usuario' }).click()
    await page.getByLabel('Nombre completo').fill(`QA Notif ${stamp}`)
    await page.getByLabel('Correo electrónico').fill(`qa.notif.${stamp}@helpdesk.com`)
    await page.getByLabel('Contraseña inicial').fill('Password1!')
    await page.getByLabel('Confirmar contraseña').fill('Password1!')
    await chooseSelectOption(page.getByLabel('Rol', { exact: true }), { label: 'Solicitante' })
    await expect(page.locator('#clientId')).toBeVisible()
    await page.getByRole('button', { name: 'Crear usuario' }).click()
    await expect(page.getByText('Selecciona el cliente al que pertenece el solicitante.')).toBeVisible()
    await page.locator('#clientId').click()
    await expect(page.getByRole('option').nth(1)).toBeVisible({ timeout: 10000 })
    await page.getByRole('option').nth(1).click()
    await page.getByRole('button', { name: 'Crear usuario' }).click()
    await expect(page).toHaveURL(/\/users$/)

    await switchUser(page, 'requester@helpdesk.com')
    await page.getByRole('navigation').getByRole('link', { name: 'Crear ticket' }).click()
    await expect(page.getByText('Acme Corp')).toBeVisible()
    await expect(page.locator('#clientId')).toHaveCount(0)
    await page.getByLabel('Título').fill(ticketTitle)
    await page.getByLabel('Descripción').fill('Descripción válida para notificaciones internas.')
    await page.locator('#categoryId').click()
    await page.getByRole('option').first().click()
    await chooseSelectOption(page.locator('#priorityId'), { index: 1 })
    await page.getByRole('button', { name: 'Crear ticket' }).click()
    await expect(page).toHaveURL(/\/tickets\/[^/]+$/)
    const folio = (await page.locator('span.font-mono.text-sm.text-slate-600').textContent())?.trim() ?? ''

    const bell = await openBell(page)
    await expect(bell.getByRole('button', { name: new RegExp(`Tu ticket ${folio}`) })).toBeVisible({
      timeout: 10000,
    })
    await expect(bell.getByText(`Tu ticket ${folio} se registró correctamente.`)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Notificaciones recientes' })).toHaveCount(0)

    await switchUser(page, 'supervisor@helpdesk.com')
    await page.getByRole('navigation').getByRole('link', { name: 'Tickets' }).click()
    await page.getByPlaceholder('Buscar folio o título...').fill(ticketTitle)
    await page.getByRole('link', { name: folio }).click()
    await page.getByRole('button', { name: 'Asignar agente' }).click()
    await expect(page.locator('#assignee option').nth(1)).toBeAttached()
    await chooseSelectOption(page.locator('#assignee'), { index: 1 })
    await page.getByRole('dialog', { name: 'Asignar agente' }).getByRole('button', { name: 'Asignar', exact: true }).click()
    await expect(page.getByRole('definition').filter({ hasText: 'Agente Soporte' })).toBeVisible()

    await switchUser(page, 'agent@helpdesk.com')
    const agentBell = await openBell(page)
    await expect(agentBell.getByRole('button', { name: /^Nuevo ticket asignado/ })).toBeVisible()
    await agentBell.getByRole('button', { name: /^Nuevo ticket asignado/ }).click()
    await expect(page).toHaveURL(/\/tickets\/[^/]+$/)

    await page.getByPlaceholder('Escribe un comentario...').fill('Comentario público del agente')
    await page.getByRole('button', { name: 'Agregar comentario' }).click()
    await expect(page.getByText('Comentario público del agente')).toBeVisible()
    await page.getByLabel('Comentario interno (solo equipo de soporte)').check()
    await page.getByPlaceholder('Escribe un comentario...').fill('Nota interna confidencial')
    await page.getByRole('button', { name: 'Agregar comentario' }).click()
    await expect(page.getByText('Nota interna confidencial')).toBeVisible()
    await page.getByRole('button', { name: 'Iniciar atención' }).click()
    await expect(page.getByText('En proceso').first()).toBeVisible()

    await switchUser(page, 'requester@helpdesk.com')
    const requesterBell = await openBell(page)
    await expect(requesterBell.getByRole('button', { name: /^Ticket asignado/ })).toBeVisible()
    await expect(requesterBell.getByRole('button', { name: /^Nuevo comentario/ })).toBeVisible()
    await expect(requesterBell.getByRole('button', { name: /^Nota interna/ })).toHaveCount(0)
    await expect(requesterBell.getByText('STATUS_CHANGED')).toHaveCount(0)

    await page.getByRole('link', { name: 'Ver todas' }).click()
    await expect(page).toHaveURL(/\/notifications/)
    await expect(page.getByText('Cargando notificaciones…')).toHaveCount(0)
    await page.getByRole('button', { name: 'Marcar todas como leídas' }).click()
    await expect(page.getByText('Cargando notificaciones…')).toHaveCount(0)
    await expect(page.getByText(', no leída')).toHaveCount(0)
  })
})
