import { expect, test, type Page } from '@playwright/test'
import { chooseSelectOption } from './select'

async function login(page: Page, email: string, password = 'password') {
  const currentUrl = page.url()
  const pathname = currentUrl && currentUrl !== 'about:blank' ? new URL(currentUrl).pathname : '/'
  if (pathname !== '/login') {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
  }
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
}

async function loginSuccessfully(page: Page, email: string, password = 'password') {
  await login(page, email, password)
  await expect(page).not.toHaveURL(/login/)
}

async function navigateSpa(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
}

async function logout(page: Page) {
  await page.locator('header button[aria-label="Perfil"]').click()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/login/)
}

async function createManagedUser(page: Page, fullName: string, email: string, roleLabel: string) {
  if (!new URL(page.url()).pathname.startsWith('/users')) {
    await page.getByRole('navigation').getByRole('link', { name: 'Usuarios' }).click()
  }
  await page.getByRole('button', { name: 'Nuevo usuario' }).click()
  await expect(page.getByRole('heading', { name: 'Nuevo usuario' })).toBeVisible()
  await page.getByLabel('Nombre completo').fill(fullName)
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña inicial').fill('Password1!')
  await page.getByLabel('Confirmar contraseña').fill('Password1!')
  await chooseSelectOption(page.getByLabel('Rol', { exact: true }), { label: roleLabel })
  if (roleLabel === 'Solicitante') {
    await page.locator('#clientId').click()
    await expect(page.getByRole('option').nth(1)).toBeVisible({ timeout: 10000 })
    await page.getByRole('option').nth(1).click()
  }
  await page.getByRole('button', { name: 'Crear usuario' }).click()
  await expect(page).toHaveURL(/\/users$/)
  await expect(page.getByRole('button', { name: `Editar usuario ${fullName}` })).toBeVisible({
    timeout: 15000,
  })
}

test('ciclo de usuarios: alta, desactivación, restablecimiento y cambio obligatorio', async ({ page, context }) => {
  test.setTimeout(120000)
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const stamp = Date.now()
  const agentName = `QA Agente ${stamp}`
  const agentEmail = `qa.agent.${stamp}@helpdesk.com`

  await loginSuccessfully(page, 'admin@helpdesk.com')
  await expect(page).toHaveURL(/dashboard/)
  await createManagedUser(page, `QA Admin ${stamp}`, `qa.admin.${stamp}@helpdesk.com`, 'Administrador')
  await createManagedUser(page, `QA Supervisor ${stamp}`, `qa.supervisor.${stamp}@helpdesk.com`, 'Supervisor')
  await createManagedUser(page, `QA Solicitante ${stamp}`, `qa.requester.${stamp}@helpdesk.com`, 'Solicitante')
  await createManagedUser(page, agentName, agentEmail, 'Agente de soporte')

  await expect(page.getByRole('button', { name: `Desactivar usuario ${agentName}` })).toBeVisible({
    timeout: 15000,
  })
  await page.getByRole('button', { name: `Desactivar usuario ${agentName}` }).click()
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText(/Estado de .* actualizado a Inactivo/)).toBeVisible()

  await logout(page)
  await login(page, agentEmail, 'Password1!')
  await expect(page.getByText('Credenciales inválidas o cuenta no disponible.')).toBeVisible()

  await loginSuccessfully(page, 'admin@helpdesk.com')
  await page.getByRole('navigation').getByRole('link', { name: 'Usuarios' }).click()
  await expect(page.getByRole('button', { name: `Activar usuario ${agentName}` })).toBeVisible()
  await page.getByRole('button', { name: `Activar usuario ${agentName}` }).click()
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText(/Estado de .* actualizado a Activo/)).toBeVisible()

  await logout(page)
  await loginSuccessfully(page, agentEmail, 'Password1!')
  await logout(page)

  await loginSuccessfully(page, 'admin@helpdesk.com')
  await page.getByRole('navigation').getByRole('link', { name: 'Usuarios' }).click()
  await expect(page.getByRole('button', { name: `Restablecer contraseña de ${agentName}` })).toBeVisible()
  await page.getByRole('button', { name: `Restablecer contraseña de ${agentName}` }).click()
  await expect(page.getByRole('heading', { name: 'Restablecer contraseña' })).toBeVisible()
  await page.getByRole('button', { name: 'Restablecer', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Contraseña temporal generada' })).toBeVisible()
  await page.getByRole('button', { name: 'Mostrar contraseña' }).click()
  const temporaryPassword = (await page.locator('code').innerText()).trim()
  expect(temporaryPassword.length).toBeGreaterThanOrEqual(12)
  await page.getByRole('button', { name: 'Copiar contraseña' }).click()
  await expect(page.getByRole('button', { name: 'Contraseña copiada' })).toBeVisible()
  await page.getByRole('button', { name: 'Finalizar' }).click()
  await expect(page.getByText(temporaryPassword)).toHaveCount(0)

  const stored = await page.evaluate(() => ({
    local: JSON.stringify(localStorage),
    session: JSON.stringify(sessionStorage),
  }))
  expect(stored.local).not.toContain(temporaryPassword)
  expect(stored.session).not.toContain(temporaryPassword)

  await logout(page)
  await login(page, agentEmail, 'Password1!')
  await expect(page.getByText('Credenciales inválidas o cuenta no disponible.')).toBeVisible()

  await login(page, agentEmail, temporaryPassword)
  await expect(page).toHaveURL(/change-password/)
  await navigateSpa(page, '/tickets')
  await expect(page).toHaveURL(/change-password/)
  await navigateSpa(page, '/dashboard')
  await expect(page).toHaveURL(/change-password/)

  await page.getByLabel('Contraseña temporal actual').fill(temporaryPassword)
  await page.getByLabel('Nueva contraseña', { exact: true }).fill('NuevaClave1!')
  await page.getByLabel('Confirmar nueva contraseña').fill('NuevaClave1!')
  await page.getByRole('button', { name: 'Actualizar contraseña' }).click()
  await expect(page).toHaveURL(/login/)
  await expect(page.getByText('Tu contraseña se actualizó correctamente.')).toBeVisible()

  await login(page, agentEmail, temporaryPassword)
  await expect(page.getByText('Credenciales inválidas o cuenta no disponible.')).toBeVisible()

  await loginSuccessfully(page, agentEmail, 'NuevaClave1!')
  await expect(page).not.toHaveURL(/change-password/)
})

test.describe('Roles sin administración de usuarios', () => {
  test('supervisor no ve el menú ni accede a usuarios', async ({ page }) => {
    await loginSuccessfully(page, 'supervisor@helpdesk.com')
    await expect(page.getByRole('link', { name: 'Usuarios' })).toHaveCount(0)
    await page.goto('/users', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Acceso restringido')).toBeVisible()
  })

  test('agente no ve el menú ni accede a usuarios', async ({ page }) => {
    await loginSuccessfully(page, 'agent@helpdesk.com')
    await expect(page.getByRole('link', { name: 'Usuarios' })).toHaveCount(0)
    await page.goto('/users', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Acceso restringido')).toBeVisible()
  })

  test('solicitante no ve el menú ni accede a usuarios', async ({ page }) => {
    await loginSuccessfully(page, 'requester@helpdesk.com')
    await expect(page.getByRole('link', { name: 'Usuarios' })).toHaveCount(0)
    await page.goto('/users', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Acceso restringido')).toBeVisible()
  })
})
