import { test, expect, type Page } from '@playwright/test'

async function login(page: Page, email = 'admin@helpdesk.com') {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('password')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).not.toHaveURL(/login/)
}

async function openKnowledge(page: Page) {
  await page.goto('/knowledge', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Base de conocimiento' })).toBeVisible()
}

test.describe('Base de conocimiento', () => {
  test('lista artículos iniciales y muestra chips de etiquetas', async ({ page }) => {
    await login(page)
    await openKnowledge(page)
    await expect(page.getByRole('link', { name: 'Cómo restablecer la contraseña' })).toBeVisible()
    await expect(page.getByText('contraseña', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Encuesta al cerrar un ticket')).toBeVisible()
  })

  test('busca por título, contenido y etiquetas', async ({ page }) => {
    await login(page)
    await openKnowledge(page)
    await page.getByPlaceholder('Buscar por título, contenido o etiquetas').fill('encuesta')
    await expect(page.getByRole('link', { name: 'Encuesta al cerrar un ticket' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Cómo crear un ticket' })).toHaveCount(0)

    await page.getByPlaceholder('Buscar por título, contenido o etiquetas').fill('SLA')
    await expect(page.getByRole('link', { name: 'Qué significa el SLA' })).toBeVisible()

    await page.getByPlaceholder('Buscar por título, contenido o etiquetas').fill('asignación')
    await expect(page.getByRole('link', { name: 'Asignar un ticket a un agente' })).toBeVisible()
  })

  test('muestra detalle del artículo de contraseña sin correo ni SMS', async ({ page }) => {
    await login(page)
    await openKnowledge(page)
    await page.getByRole('link', { name: 'Cómo restablecer la contraseña' }).click()
    await expect(page).toHaveURL(/\/knowledge\/k1$/)
    await expect(page.locator('.whitespace-pre-wrap')).toContainText('administrador')
    await expect(page.locator('.whitespace-pre-wrap')).toContainText('contraseña temporal')
    await expect(page.getByText(/SMS/i)).toHaveCount(0)
    await expect(page.getByText(/correo institucional/i)).toHaveCount(0)
  })

  test('filtra por categoría o tema', async ({ page }) => {
    await login(page)
    await openKnowledge(page)
    await page.locator('#knowledge-topic-filter').click()
    await page.getByRole('option', { name: 'SLA' }).click()
    await expect(page.getByRole('link', { name: 'Qué significa el SLA' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Cómo crear un ticket' })).toHaveCount(0)
  })

  test('admin puede crear y editar artículo con acentos', async ({ page }) => {
    await login(page)
    await openKnowledge(page)
    await page.getByRole('button', { name: 'Nuevo artículo' }).click()
    const title = `Guía técnica ñ ${Date.now()}`
    await page.getByLabel('Título').fill(title)
    await page.getByLabel('Contenido').fill(
      'Contenido de prueba con información detallada, acentos y caracteres especiales como ñ.',
    )
    await page.getByLabel('Etiquetas').fill('información, técnica')
    await page.getByRole('button', { name: 'Publicar' }).click()
    await expect(page.getByRole('link', { name: title })).toBeVisible()
    await expect(page.getByText('información', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: `Editar ${title}` }).click()
    await page.getByLabel('Título').fill(`${title} actualizada`)
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByRole('link', { name: `${title} actualizada` })).toBeVisible()
  })

  test('admin ve confirmación al desactivar un artículo', async ({ page }) => {
    await login(page)
    await openKnowledge(page)
    await page.getByRole('button', { name: 'Nuevo artículo' }).click()
    const title = `Artículo temporal ${Date.now()}`
    await page.getByLabel('Título').fill(title)
    await page.getByLabel('Contenido').fill(
      'Contenido temporal para validar la confirmación al desactivar un artículo de prueba.',
    )
    await page.getByRole('button', { name: 'Publicar' }).click()
    await expect(page.getByRole('link', { name: title })).toBeVisible()

    await page.getByRole('button', { name: `Eliminar ${title}` }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click()
    await expect(page.getByRole('status')).toContainText('Artículo desactivado')
    await expect(page.getByRole('status')).toContainText(title)
    await expect(page.getByRole('link', { name: title })).toHaveCount(0)
  })

  test('requester no puede acceder al módulo', async ({ page }) => {
    await login(page, 'requester@helpdesk.com')
    await page.goto('/knowledge', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Acceso restringido')).toBeVisible()
  })
})
