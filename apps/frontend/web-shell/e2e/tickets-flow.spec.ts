import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('password')
  await page.getByRole('button', { name: 'Ingresar' }).click()
}

async function switchUser(page: import('@playwright/test').Page, email: string) {
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/login/)
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('password')
  await page.getByRole('button', { name: 'Ingresar' }).click()
}

async function openTicketFromList(page: import('@playwright/test').Page, folio: string, search?: string) {
  await page.getByRole('navigation').getByRole('link', { name: 'Tickets' }).click()
  if (search) {
    await page.getByPlaceholder('Buscar folio o título...').fill(search)
  }
  await expect(page.getByRole('link', { name: folio })).toBeVisible()
  await page.getByRole('link', { name: folio }).click()
}

test.describe('Flujo completo de ticket', () => {
  test('crear, asignar, comentar, resolver, cerrar y encuesta', async ({ page }) => {
    test.setTimeout(60000)
    const ticketTitle = `Ticket E2E ${Date.now()}`

    await login(page, 'requester@helpdesk.com')
    await expect(page).toHaveURL(/tickets/)

    await page.getByRole('link', { name: 'Nuevo ticket' }).click()
    await page.getByLabel('Título').fill(ticketTitle)
    await page.getByLabel('Descripción').fill('Descripción de prueba E2E')
    await page.getByLabel('Categoría').selectOption({ index: 1 })
    await page.getByLabel('Prioridad').selectOption({ index: 1 })
    await page.getByRole('button', { name: 'Crear ticket' }).click()

    await expect(page).toHaveURL(/\/tickets\/[^/]+$/)
    await expect(page.getByRole('heading', { name: ticketTitle })).toBeVisible()

    const folio = (await page.locator('span.font-mono').textContent())?.trim() ?? ''

    await switchUser(page, 'supervisor@helpdesk.com')
    await openTicketFromList(page, folio, ticketTitle)
    await page.getByRole('button', { name: 'Asignar agente' }).click()
    await page.locator('#assignee').selectOption({ index: 1 })
    await page.getByRole('dialog', { name: 'Asignar agente' }).getByRole('button', { name: 'Asignar', exact: true }).click()
    await expect(page.getByText('Agente Soporte')).toBeVisible()

    await switchUser(page, 'agent@helpdesk.com')
    await openTicketFromList(page, folio)
    await page.getByRole('button', { name: 'Iniciar atención' }).click()
    await expect(page.getByText('En proceso').first()).toBeVisible()

    await page.getByPlaceholder('Escribe un comentario...').fill('Comentario de prueba E2E')
    await page.getByRole('button', { name: 'Agregar comentario' }).click()
    await expect(page.getByText('Comentario de prueba E2E')).toBeVisible()

    await page.getByRole('button', { name: 'Resolver' }).click()
    await expect(page.getByText('Resuelto').first()).toBeVisible()

    await switchUser(page, 'requester@helpdesk.com')
    await openTicketFromList(page, folio, ticketTitle)
    await page.getByRole('button', { name: 'Cerrar ticket' }).click()
    await page.getByRole('dialog', { name: 'Cerrar ticket' }).getByRole('button', { name: 'Cerrar', exact: true }).click()
    await expect(page.getByText('Cerrado').first()).toBeVisible()

    await page.getByRole('button', { name: '5' }).click()
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(page.getByText('Calificación: 5/5')).toBeVisible()
  })
})
