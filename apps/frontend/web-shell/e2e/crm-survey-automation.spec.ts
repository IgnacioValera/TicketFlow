import { test, expect, type Page } from '@playwright/test'
import { chooseSelectOption } from './select'

async function login(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('password')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).not.toHaveURL(/\/login$/)
}

async function clickNav(page: Page, name: string) {
  await page.getByRole('navigation').getByRole('link', { name, exact: true }).click()
}

async function createWonSurvey(page: Page, title: string) {
  await clickNav(page, 'Encuestas')
  await expect(page.getByRole('heading', { name: 'Encuestas' })).toBeVisible()
  await page.getByRole('button', { name: 'Nueva encuesta' }).click()
  const createDialog = page.getByRole('dialog', { name: 'Nueva encuesta' })
  await createDialog.getByLabel('Título').fill(title)
  await chooseSelectOption(createDialog.getByLabel('Disparador'), { label: 'Oportunidad ganada' })
  await createDialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('button', { name: 'Agregar pregunta' })).toBeVisible()
  await page.getByRole('button', { name: 'Agregar pregunta' }).click()
  await page.getByRole('textbox', { name: 'Pregunta' }).fill('¿Cómo calificarías la atención comercial?')
  await chooseSelectOption(page.getByLabel('Tipo'), 'RATING')
  await page.getByRole('dialog', { name: 'Pregunta' }).getByRole('button', { name: 'Agregar', exact: true }).click()
  await expect(page.getByText('1. ¿Cómo calificarías la atención comercial?')).toBeVisible()
  await page.getByRole('button', { name: 'Activar' }).click()
  await expect(page.getByText('Encuesta activada')).toBeVisible()
}

async function markOpportunityWon(page: Page, title: string) {
  await clickNav(page, 'Oportunidades')
  await expect(page.getByRole('heading', { name: 'Oportunidades' })).toBeVisible()
  await page.locator('article').filter({ hasText: title }).getByRole('button', { name: 'Editar' }).click()
  const editor = page.getByRole('dialog', { name: 'Editar oportunidad' })
  await chooseSelectOption(editor.getByLabel('Etapa'), { label: 'Ganada' })
  await editor.getByRole('button', { name: 'Guardar' }).click()
}

test.describe('Automatización real de encuestas CRM', () => {
  test('ganar una oportunidad genera un enlace de un solo uso y la respuesta queda vinculada', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await login(page, 'admin@helpdesk.com')
    await createWonSurvey(page, 'Satisfacción postventa')
    await markOpportunityWon(page, 'Renovación')

    const modal = page.getByRole('dialog', { name: 'Encuesta generada' })
    await expect(modal).toBeVisible()
    await expect(modal.getByText('Satisfacción postventa')).toBeVisible()
    await expect(modal.getByText('Copia el enlace ahora. Por seguridad, no volverá a mostrarse.')).toBeVisible()
    const responseUrl = (await modal.locator('.font-mono').innerText()).trim()
    expect(responseUrl).toMatch(/\/public\/surveys\/[a-f0-9]{64}$/)
    expect(responseUrl).not.toContain('demo-active-token')

    await modal.getByRole('button', { name: 'Copiar enlace' }).click()
    await expect(modal.getByText('Enlace copiado')).toBeVisible()
    const clipboard = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboard).toBe(responseUrl)

    const popupPromise = page.waitForEvent('popup')
    await modal.getByRole('button', { name: 'Abrir encuesta' }).click()
    const popup = await popupPromise
    await expect(popup).toHaveURL(/\/public\/surveys\/[a-f0-9]{64}/)
    await popup.close()

    const surveyPage = await context.newPage()
    await surveyPage.goto(responseUrl, { waitUntil: 'domcontentloaded' })
    await expect(surveyPage.getByRole('heading', { name: 'Satisfacción postventa' })).toBeVisible()
    await expect(surveyPage.getByText(/o-renovacion/)).toHaveCount(0)
    await surveyPage.getByLabel('Escala de 1 a 5').fill('5')
    await surveyPage.getByRole('button', { name: 'Enviar respuestas' }).click()
    await expect(surveyPage.getByText('Gracias por tu respuesta')).toBeVisible()
    await expect(surveyPage.getByText('Tu encuesta se envió correctamente y quedó registrada una sola vez.')).toBeVisible()

    await surveyPage.goto(responseUrl, { waitUntil: 'domcontentloaded' })
    await expect(surveyPage.getByText('La encuesta ya fue respondida')).toBeVisible()
    await surveyPage.close()

    await modal.getByRole('button', { name: 'Finalizar' }).click()
    await expect(modal).toHaveCount(0)
    const persisted = await page.evaluate(() => ({
      local: Object.values(localStorage).join(' '),
      session: Object.values(sessionStorage).join(' '),
    }))
    expect(persisted.local).not.toContain(responseUrl)
    expect(persisted.session).not.toContain(responseUrl)

    await clickNav(page, 'Encuestas')
    await page.locator('li').filter({ hasText: 'Satisfacción postventa' }).getByRole('link', { name: 'Resultados' }).click()
    await expect(page.getByText('Oportunidad: Renovación')).toBeVisible()
    await expect(page.getByText(/Cliente: Acme Corp/)).toBeVisible()
    await expect(page.getByText('Disparador: Oportunidad ganada')).toBeVisible()
  })

  test('sin encuesta activa se puede ganar y no se inventa una invitación', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await clickNav(page, 'Oportunidades')
    await page.locator('article').filter({ hasText: 'Expansión' }).getByRole('button', { name: 'Editar' }).click()
    const editor = page.getByRole('dialog', { name: 'Editar oportunidad' })
    await chooseSelectOption(editor.getByLabel('Etapa'), { label: 'Ganada' })
    await editor.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByRole('dialog', { name: 'Encuesta generada' })).toHaveCount(0)
    await expect(page.getByRole('status')).toContainText('No hay una encuesta activa para este disparador')
  })

  test('un doble envío al ganar produce una sola petición de etapa', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await createWonSurvey(page, 'Postventa única')
    let stageCalls = 0
    page.on('request', (request) => {
      if (request.method() === 'PATCH' && request.url().includes('/crm/opportunities/') && request.url().includes('/stage')) {
        stageCalls += 1
      }
    })
    await clickNav(page, 'Oportunidades')
    await page.locator('article').filter({ hasText: 'Renovación' }).getByRole('button', { name: 'Editar' }).click()
    const editor = page.getByRole('dialog', { name: 'Editar oportunidad' })
    await chooseSelectOption(editor.getByLabel('Etapa'), { label: 'Ganada' })
    const save = editor.getByRole('button', { name: 'Guardar' })
    await save.dblclick()
    await expect(page.getByRole('dialog', { name: 'Encuesta generada' })).toBeVisible()
    expect(stageCalls).toBe(1)
  })

  test('una invitación expirada permite regenerar con confirmación y el token anterior deja de funcionar', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await clickNav(page, 'Oportunidades')
    await page.locator('article').filter({ hasText: 'Soporte anual' }).getByRole('button', { name: 'Gestionar encuesta' }).click()
    const detail = page.getByRole('dialog').filter({ hasText: 'Encuesta de satisfacción' })
    await expect(detail.getByText('Estado: Enlace expirado')).toBeVisible()
    await expect(detail.getByRole('button', { name: 'Generar nuevo enlace' })).toBeVisible()
    await detail.getByRole('button', { name: 'Generar nuevo enlace' }).click()
    const regenerate = page.getByRole('dialog', { name: '¿Generar un enlace nuevo?' })
    await expect(regenerate).toBeVisible()
    await regenerate.getByRole('button', { name: 'Generar uno nuevo' }).click()
    const modal = page.getByRole('dialog', { name: 'Encuesta generada' })
    await expect(modal).toBeVisible()
    const responseUrl = (await modal.locator('.font-mono').innerText()).trim()
    expect(responseUrl).not.toContain('demo-expired-opp-token')
    await page.goto('/public/surveys/demo-expired-opp-token', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/Enlace de encuesta inválido|El enlace de encuesta expiró/)).toBeVisible()
  })

  test('una encuesta manual se genera desde el detalle sin ganar la oportunidad', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await clickNav(page, 'Oportunidades')
    await page.locator('article').filter({ hasText: 'Renovación' }).getByRole('button', { name: 'Gestionar encuesta' }).click()
    const detail = page.getByRole('dialog').filter({ hasText: 'Encuesta de satisfacción' })
    await expect(detail.getByText('Enviar ahora (manual)')).toBeVisible()
    await expect(detail.getByRole('button', { name: 'Generar encuesta', exact: true })).toHaveCount(0)
    await detail.getByLabel('Encuesta manual').scrollIntoViewIfNeeded()
    await chooseSelectOption(detail.getByLabel('Encuesta manual'), { label: 'NPS de cliente' })
    await detail.getByRole('button', { name: 'Generar encuesta manual' }).click()
    const modal = page.getByRole('dialog', { name: 'Encuesta generada' })
    await expect(modal).toBeVisible()
    await expect(modal.getByText('NPS de cliente')).toBeVisible()
  })

  test('el supervisor consulta el detalle pero no genera invitaciones', async ({ page }) => {
    await login(page, 'supervisor@helpdesk.com')
    await page.getByRole('navigation').getByRole('link', { name: 'Oportunidades' }).click()
    await page.locator('article').filter({ hasText: 'Renovación' }).getByRole('button', { name: 'Gestionar encuesta' }).click()
    const detail = page.getByRole('dialog').filter({ hasText: 'Encuesta de satisfacción' })
    await expect(detail.getByText('Encuesta de satisfacción')).toBeVisible()
    await expect(detail.getByRole('button', { name: 'Generar encuesta', exact: true })).toHaveCount(0)
    await expect(detail.getByRole('button', { name: 'Generar encuesta manual' })).toHaveCount(0)
    await expect(detail.getByRole('button', { name: 'Generar nuevo enlace' })).toHaveCount(0)
    const status = await page.evaluate(async () => {
      const token = localStorage.getItem('helpdesk_access_token')
      const response = await fetch('http://localhost:8000/api/v1/crm/opportunities/o-renovacion/survey-invitation', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      return response.status
    })
    expect(status).toBe(403)
  })

  test('no se puede activar una segunda encuesta automática para el mismo disparador', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await createWonSurvey(page, 'Primera postventa')
    await page.getByRole('link', { name: '← Encuestas' }).click()
    await page.getByRole('button', { name: 'Nueva encuesta' }).click()
    const createDialog = page.getByRole('dialog', { name: 'Nueva encuesta' })
    await createDialog.getByLabel('Título').fill('Segunda postventa')
    await chooseSelectOption(createDialog.getByLabel('Disparador'), { label: 'Oportunidad ganada' })
    await createDialog.getByRole('button', { name: 'Guardar' }).click()
    await page.getByRole('button', { name: 'Agregar pregunta' }).click()
    await page.getByRole('textbox', { name: 'Pregunta' }).fill('¿Repetirías?')
    await chooseSelectOption(page.getByLabel('Tipo'), 'TEXT')
    await page.getByRole('dialog', { name: 'Pregunta' }).getByRole('button', { name: 'Agregar', exact: true }).click()
    await page.getByRole('button', { name: 'Activar' }).click()
    await expect(
      page.getByRole('status').filter({ hasText: 'Ya existe una encuesta activa para el disparador Oportunidad ganada.' }),
    ).toBeVisible()
  })

  test('un enlace expirado o inexistente muestra el estado correcto en la página pública', async ({ page }) => {
    await page.goto('/public/surveys/demo-expired-token', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('El enlace de encuesta expiró')).toBeVisible()
    await page.goto('/public/surveys/token-que-no-existe', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Enlace de encuesta inválido')).toBeVisible()
  })
})
