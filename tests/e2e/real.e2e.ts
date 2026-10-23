import { expect, test, type Page } from '@playwright/test'
interface Fixture {
  password: string; email: string
  accounts: Record<'admin' | 'teacher' | 'multi', { email: string }>
  overview: { schoolA: string; schoolB: string; emailA: string; emailB: string }
  discovery: { sharedEmail: string; schoolB: string }
}
let fixture: Fixture
async function mutate(operation: string) {
  const response = await fetch(`http://127.0.0.1:4176/mutate/${operation}`, { method: 'POST' })
  expect(response.ok, 'Controlled fixture mutation must succeed').toBe(true)
}
async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(fixture.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}
async function home(page: Page) { await expect(page.getByRole('heading', { name: 'Visão geral da escola' })).toBeVisible() }
test.describe.serial('real Web → BFF → Core → PostgreSQL', () => {
  test.beforeAll(async () => {
    const response = await fetch('http://127.0.0.1:4176/fixture')
    if (!response.ok) throw new Error('Real fixture unavailable')
    fixture = await response.json() as Fixture
  })
  test('direct login emits HttpOnly cookie, restores after reload and logs out', async ({ page, context }) => {
    const paths: string[] = []
    page.on('request', (request) => { const path = new URL(request.url()).pathname; if (path.startsWith('/bff/')) paths.push(path) })
    await login(page, fixture.email); await home(page)
    expect(paths).toContain('/bff/auth/login'); expect(paths).toContain('/bff/session'); expect(paths).toContain('/bff/admin/overview')
    const cookie = (await context.cookies()).find((c) => c.name === 'frepp_school_session')
    expect(cookie?.httpOnly).toBe(true); expect(cookie?.sameSite).toBe('Strict'); expect(cookie?.path).toBe('/')
    expect(await page.evaluate(() => document.cookie.includes('frepp_school_session'))).toBe(false)
    await page.reload(); await home(page)
    await page.getByRole('button', { name: 'Sair', exact: true }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.reload(); await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
    expect((await page.request.get('/bff/session')).status()).toBe(401)
  })
  test('multi-school login selects a real school; no session exists before selection', async ({ page }) => {
    await mutate('activate_discovery_options')
    await login(page, fixture.discovery.sharedEmail)
    await expect(page.getByRole('heading', { name: 'Escolha sua escola' })).toBeVisible()
    expect((await page.request.get('/bff/session')).status()).toBe(401)
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0)
    await page.getByRole('radio', { name: 'Selected fixture', exact: true }).check()
    await page.getByRole('button', { name: 'Continuar' }).click(); await home(page)
    const session = await (await page.request.get('/bff/session')).json()
    expect(session.school.id === fixture.discovery.schoolB).toBe(true)
    await page.getByRole('button', { name: 'Sair', exact: true }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
  test('empty overview comes from the actual BFF aggregate', async ({ page }) => {
    await login(page, fixture.overview.emailA); await home(page)
    await expect(page.getByRole('progressbar')).toHaveAttribute('value', '0')
    await expect(page.getByText('Não iniciado', { exact: true })).toHaveCount(6)
    await expect(page.getByText('Nenhum ano letivo vigente', { exact: true })).toBeVisible()
    const dto = await (await page.request.get('/bff/admin/overview')).json()
    expect(dto.counts).toEqual({ units: 0, classes: 0, teachers: 0, students: 0, guardians: 0 })
  })
  test('partial overview uses real counts, attention steps and Core current year', async ({ page }) => {
    await mutate('overview_partial'); await login(page, fixture.overview.emailA); await home(page)
    await expect(page.getByRole('progressbar')).toHaveAttribute('value', '50')
    await expect(page.getByText('Concluído', { exact: true })).toHaveCount(3)
    await expect(page.getByText('2001', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: '1 turma sem professor' })).toBeVisible()
    const dto = await (await page.request.get('/bff/admin/overview')).json()
    expect(dto.counts).toEqual({ units: 1, classes: 2, teachers: 2, students: 2, guardians: 2 })
  })
  test('configured overview reflects real fixture changes in the same browser session', async ({ page }) => {
    await login(page, fixture.overview.emailA); await home(page)
    await mutate('overview_complete'); await page.reload(); await home(page)
    await expect(page.getByRole('progressbar')).toHaveAttribute('value', '100')
    await expect(page.getByText('Nenhuma pendência de configuração', { exact: true })).toBeVisible()
    await expect(page.getByText('Concluído', { exact: true })).toHaveCount(6)
  })
  test('Teacher remains authenticated in unsupported state; real BFF denies overview', async ({ page }) => {
    await login(page, fixture.accounts.teacher.email)
    await expect(page.getByRole('heading', { name: 'Acesso não permitido' })).toBeVisible()
    expect((await page.request.get('/bff/admin/overview')).status()).toBe(403)
    expect((await page.request.get('/bff/session')).status()).toBe(200)
    await expect(page.getByRole('button', { name: 'Sair', exact: true })).toBeVisible()
  })
  test('multi-role Admin and Teacher uses the Admin Home with real grants', async ({ page }) => {
    await login(page, fixture.accounts.multi.email); await home(page)
    const dto = await (await page.request.get('/bff/session')).json()
    expect(dto.experiences).toEqual({ admin: true, teacher: true })
    expect((await page.request.get('/bff/admin/overview')).status()).toBe(200)
  })
  test('tenant isolation: separate cookies see distinct real aggregates without selectors', async ({ browser }) => {
    const a = await browser.newContext({ baseURL: 'http://127.0.0.1:4175' })
    const b = await browser.newContext({ baseURL: 'http://127.0.0.1:4175' })
    try {
      const pageA = await a.newPage(); const pageB = await b.newPage()
      await login(pageA, fixture.overview.emailA); await home(pageA)
      await login(pageB, fixture.overview.emailB); await home(pageB)
      const dtoA = await (await pageA.request.get('/bff/admin/overview')).json()
      const dtoB = await (await pageB.request.get('/bff/admin/overview')).json()
      expect(dtoA.school.id === fixture.overview.schoolA).toBe(true); expect(dtoB.school.id === fixture.overview.schoolB).toBe(true)
      expect(dtoA.counts).toEqual({ units: 1, classes: 2, teachers: 2, students: 2, guardians: 2 })
      expect(dtoB.counts).toEqual({ units: 2, classes: 3, teachers: 3, students: 3, guardians: 3 })
      expect((await pageA.request.get(`/bff/admin/overview?schoolId=${fixture.overview.schoolB}`)).status()).toBe(400)
    } finally { await a.close(); await b.close() }
  })
  test('real upstream 500 remains an error and manual retry recovers', async ({ page }) => {
    await login(page, fixture.overview.emailA); await home(page)
    await mutate('overview_invalid_timezone'); await page.reload()
    await expect(page.getByRole('heading', { name: 'Não foi possível carregar a visão geral' })).toBeVisible()
    await expect(page.getByRole('progressbar')).toHaveCount(0)
    await mutate('overview_restore'); await page.getByRole('button', { name: 'Tentar novamente' }).click(); await home(page)
  })
  test('real permission revocation gives 403 without logging out', async ({ page }) => {
    await login(page, fixture.overview.emailB); await home(page)
    await mutate('overview_revoke_permission'); await page.reload()
    await expect(page.getByRole('heading', { name: 'Acesso não permitido' })).toBeVisible()
    expect((await page.request.get('/bff/session')).status()).toBe(200)
    await expect(page.getByRole('button', { name: 'Sair', exact: true })).toBeVisible()
  })
})
