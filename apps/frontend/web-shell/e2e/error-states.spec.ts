import { expect, test, type Page } from '@playwright/test'

async function login(page: Page, email: string, password = 'password') {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).not.toHaveURL(/login/)
}

function isUsersCollection(url: string) {
  const pathname = new URL(url).pathname.replace(/\/$/, '')
  return pathname.includes('/api/') && pathname.endsWith('/users')
}

test.describe('Páginas de error y carga', () => {
  test('una ruta inexistente muestra 404 y no redirige sola', async ({ page }) => {
    await page.goto('/ruta-que-no-existe')
    await expect(page).toHaveURL(/ruta-que-no-existe/)
    await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible()
    await expect(page).toHaveTitle(/Página no encontrada/)
    await expect(page.getByText('stack', { exact: false })).toHaveCount(0)
    await page.getByRole('button', { name: 'Ir al inicio' }).focus()
    await expect(page.getByRole('button', { name: 'Ir al inicio' })).toBeFocused()
    await page.getByRole('button', { name: 'Volver' }).focus()
    await expect(page.getByRole('button', { name: 'Volver' })).toBeFocused()
  })

  test('rutas anidadas inexistentes también muestran 404', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await page.goto('/users/incorrecto/otra-ruta')
    await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible()
  })

  test('un id inválido en una ruta de ticket no usa el 404 global', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await page.goto('/tickets/ruta-inexistente', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toHaveCount(0)
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByText(/no encontrado/i)).toBeVisible()
  })

  test('sin sesión, Ir al inicio lleva al login', async ({ page }) => {
    await page.goto('/ruta-que-no-existe')
    await page.getByRole('button', { name: 'Ir al inicio' }).click()
    await expect(page).toHaveURL(/login/)
  })

  test('con sesión, Ir al inicio lleva al panel del rol', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await page.goto('/ruta-que-no-existe')
    await page.getByRole('button', { name: 'Ir al inicio' }).click()
    await expect(page).toHaveURL(/dashboard/)
  })

  test('solicitante autenticado va a tickets desde 404', async ({ page }) => {
    await login(page, 'requester@helpdesk.com')
    await page.goto('/ruta-que-no-existe')
    await page.getByRole('button', { name: 'Ir al inicio' }).click()
    await expect(page).toHaveURL(/tickets/)
  })

  test('un usuario autenticado sin permiso ve acceso restringido', async ({ page }) => {
    await login(page, 'agent@helpdesk.com')
    await page.goto('/users')
    await expect(page.getByRole('heading', { name: 'Acceso restringido' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ir a mi panel' })).toBeVisible()
  })

  test('mustChangePassword tiene prioridad sobre 404', async ({ page, context }) => {
    test.setTimeout(60000)
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await login(page, 'admin@helpdesk.com')
    await page.goto('/users')
    await page.getByRole('button', { name: 'Restablecer contraseña de Agente Soporte' }).click()
    await page.getByRole('button', { name: 'Restablecer', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Contraseña temporal generada' })).toBeVisible()
    await page.getByRole('button', { name: 'Mostrar contraseña' }).click()
    const temporaryPassword = (await page.locator('code').innerText()).trim()
    await page.getByRole('button', { name: 'Copiar contraseña' }).click()
    await page.getByRole('button', { name: 'Finalizar' }).click()
    await expect(page.getByRole('heading', { name: 'Contraseña temporal generada' })).toHaveCount(0)
    await page.locator('header button[aria-label="Perfil"]').click()
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await page.getByLabel('Correo electrónico').fill('agent@helpdesk.com')
    await page.getByLabel('Contraseña').fill(temporaryPassword)
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page).toHaveURL(/change-password/)
    await page.evaluate(() => {
      window.history.pushState({}, '', '/ruta-que-no-existe')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await expect(page).toHaveURL(/change-password/)
  })

  test('la validación de sesión muestra el loader y no el panel', async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'X-TicketFlow-Delay-Ms': '900' })
    await page.addInitScript(() => {
      localStorage.setItem('helpdesk_access_token', 'mock-token-1')
      localStorage.setItem('helpdesk_refresh_token', 'mock-refresh-1')
    })
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Cargando información…')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Panel' })).toHaveCount(0)
    await expect(page.getByRole('status').first()).toHaveAttribute('aria-live', 'polite')
    await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Cargando información…')).toHaveCount(0)
  })

  test('un error reemplaza al loader y Reintentar dispara una sola consulta', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    let usersListCalls = 0
    page.on('request', (request) => {
      if (request.method() === 'GET' && isUsersCollection(request.url())) {
        usersListCalls += 1
      }
    })
    await page.setExtraHTTPHeaders({ 'X-TicketFlow-Fail-Users': '1' })
    await page.goto('/users', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'No se pudieron cargar los usuarios.' })).toBeVisible()
    await expect(page.locator('.tf-skeleton')).toHaveCount(0)
    const callsBeforeRetry = usersListCalls
    await page.setExtraHTTPHeaders({ 'X-TicketFlow-Fail-Users': '0' })
    await page.getByRole('button', { name: 'Reintentar' }).click()
    await expect(page.getByText('Admin Sistema')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'No se pudieron cargar los usuarios.' })).toHaveCount(0)
    expect(usersListCalls).toBe(callsBeforeRetry + 1)
  })

  test('doble clic en Ingresar produce una sola petición', async ({ page }) => {
    let loginCalls = 0
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/auth/login')) {
        loginCalls += 1
      }
    })
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Correo electrónico').fill('admin@helpdesk.com')
    await page.getByLabel('Contraseña').fill('password')
    await page.getByRole('button', { name: 'Ingresar' }).dblclick()
    await expect(page).toHaveURL(/dashboard/)
    expect(loginCalls).toBe(1)
  })

  test('un listado vacío no muestra skeleton', async ({ page }) => {
    await login(page, 'admin@helpdesk.com')
    await page.goto('/users', { waitUntil: 'domcontentloaded' })
    await page.getByPlaceholder('Buscar por nombre o correo...').fill('zzz-sin-coincidencias')
    await expect(page.getByText('No hay usuarios que coincidan con los filtros.')).toBeVisible()
    await expect(page.locator('.tf-skeleton')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Limpiar filtros' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Crear usuario' })).toBeVisible()
  })

  test('el ErrorBoundary evita una pantalla blanca y Reintentar remonta una vez', async ({ page }) => {
    await page.goto('/__render-error', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Ocurrió un problema' })).toBeVisible()
    await expect(page.getByText('TicketFlow test render error')).toHaveCount(0)
    await page.getByRole('button', { name: 'Reintentar' }).click()
    await expect(page.getByRole('heading', { name: 'Ocurrió un problema' })).toBeVisible()
  })

  test('prefers-reduced-motion conserva el texto de carga', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setExtraHTTPHeaders({ 'X-TicketFlow-Delay-Ms': '900' })
    await page.addInitScript(() => {
      localStorage.setItem('helpdesk_access_token', 'mock-token-1')
      localStorage.setItem('helpdesk_refresh_token', 'mock-refresh-1')
    })
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Cargando información…')).toBeVisible()
    await expect(page.getByRole('status').first()).toHaveAttribute('aria-live', 'polite')
    await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible({ timeout: 15000 })
  })
})
