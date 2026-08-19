import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('password')
  await page.getByRole('button', { name: 'Ingresar' }).click()
}

test.describe('Encuestas CRM y ticket cerrado', () => {
  test('crea, agrega preguntas y activa una encuesta', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await page.goto('/crm/surveys', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Encuestas' })).toBeVisible()

    await page.getByRole('button', { name: '+ Nueva encuesta' }).click()
    await page.getByLabel('Título').fill('   ')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText(/título.*obligatorio/i).first()).toBeVisible()

    await page.getByLabel('Título').fill(`Encuesta QA ${Date.now()}`)
    await page.getByLabel('Descripción').fill('Validación de preguntas y activación')
    await page.getByRole('button', { name: 'Guardar' }).click()

    await expect(page.getByRole('button', { name: 'Agregar pregunta' })).toBeVisible()
    await page.getByRole('button', { name: 'Agregar pregunta' }).click()
    await page.getByRole('textbox', { name: 'Pregunta' }).fill('¿Cómo calificarías la atención?')
    await page.getByLabel('Tipo').selectOption('RATING')
    await page.getByRole('dialog', { name: 'Pregunta' }).getByRole('button', { name: 'Agregar', exact: true }).click()
    await expect(page.getByText('¿Cómo calificarías la atención?')).toBeVisible()
    await expect(page.getByText(/Obligatoria/)).toBeVisible()

    await page.getByRole('button', { name: 'Activar' }).click()
    await expect(page.getByText('Encuesta activada')).toBeVisible()
  })

  test('muestra porcentajes reales y el vacío sin respuestas', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await page.goto('/crm/surveys/s-nps/results', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'NPS de cliente' })).toBeVisible()
    await expect(page.getByText('3 respuestas registradas')).toBeVisible()
    await expect(page.getByText('2 · 67%')).toBeVisible()
    await expect(page.getByText('1 · 33%').first()).toBeVisible()

    await page.goto('/crm/surveys/s-empty/results', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Aún no hay respuestas')).toBeVisible()
    await expect(page.getByText(/datos simulados/i)).toBeVisible()
  })

  test('la encuesta activa se responde una sola vez y la inactiva no acepta respuestas', async ({ page }) => {
    await page.goto('/public/surveys/demo-active-token', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Encuesta sin respuestas' })).toBeVisible()
    await page.getByLabel('Calificación de 0 a 10').fill('9')
    await page.getByText('Sí', { exact: true }).click()
    await page.getByRole('button', { name: 'Enviar respuestas' }).click()
    await expect(page.getByText('Gracias por tu respuesta')).toBeVisible()

    await page.goto('/public/surveys/demo-used-token', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('La encuesta ya fue respondida')).toBeVisible()

    await page.goto('/public/surveys/demo-closed-token', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('La encuesta ya no está disponible')).toBeVisible()
  })

  test('el supervisor consulta resultados pero no administra', async ({ page }) => {
    await login(page, 'supervisor@helpdesk.com')
    await page.goto('/crm/surveys', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: '+ Nueva encuesta' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Editar' })).toHaveCount(0)
    await page.locator('li').filter({ hasText: 'NPS de cliente' }).getByRole('link', { name: 'Resultados' }).click()
    await expect(page.getByRole('heading', { name: 'NPS de cliente' })).toBeVisible()
    await expect(page.getByText('3 respuestas registradas')).toBeVisible()
  })

  test('el solicitante responde la encuesta de un ticket cerrado una sola vez', async ({ page }) => {
    await login(page, 'requester@helpdesk.com')
    await page.goto('/tickets/t8', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Encuesta de satisfacción' })).toBeVisible()
    await page.getByRole('button', { name: 'Calificación 4' }).click()
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(page.getByText('Calificación: 4/5')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Encuesta de satisfacción' })).toHaveCount(0)
  })
})
