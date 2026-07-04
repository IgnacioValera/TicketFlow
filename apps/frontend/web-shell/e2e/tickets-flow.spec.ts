import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('password')
  await page.getByRole('button', { name: 'Ingresar' }).click()
}

test.describe('Flujo completo de ticket', () => {
  test('crear, asignar, comentar, resolver, cerrar y encuesta', async ({ page }) => {
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

    const ticketUrl = page.url()

    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await login(page, 'supervisor@helpdesk.com')
    await page.goto('/tickets')
    await page.getByRole('link', { name: ticketTitle }).click()
    await page.getByRole('button', { name: 'Asignar agente' }).click()
    await page.getByLabel('Agente').selectOption({ index: 1 })
    await page.getByRole('button', { name: 'Asignar' }).click()
    await expect(page.getByText('Agente Soporte')).toBeVisible()

    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await login(page, 'agent@helpdesk.com')
    await page.goto(ticketUrl)
    await page.getByRole('button', { name: 'Iniciar atención' }).click()
    await expect(page.getByText('En proceso')).toBeVisible()

    await page.getByPlaceholder('Escribe un comentario...').fill('Comentario de prueba E2E')
    await page.getByRole('button', { name: 'Agregar comentario' }).click()
    await expect(page.getByText('Comentario de prueba E2E')).toBeVisible()

    await page.getByRole('button', { name: 'Resolver' }).click()
    await expect(page.getByText('Resuelto')).toBeVisible()

    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await login(page, 'requester@helpdesk.com')
    await page.goto(ticketUrl)
    await page.getByRole('button', { name: 'Cerrar ticket' }).click()
    await page.getByRole('button', { name: 'Cerrar' }).click()
    await expect(page.getByText('Cerrado')).toBeVisible()

    await page.getByRole('button', { name: '5' }).click()
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(page.getByText('Calificación: 5/5')).toBeVisible()
  })
})
