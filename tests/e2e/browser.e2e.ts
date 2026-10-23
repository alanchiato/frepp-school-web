import { expect, test, type Page } from '@playwright/test'
import { authenticated, overview, selection, session } from '../support/fixtures'

async function boundary(page: Page, options: { restored?: boolean; multi?: boolean; status?: number; kind?: 'empty' | 'partial' | 'configured' } = {}) {
  let signedIn = !!options.restored
  const calls: { path: string; body: unknown }[] = []
  await page.route('**/bff/**', async (route) => {
    const request = route.request(); const path = new URL(request.url()).pathname.replace('/bff', '')
    const raw = request.postData(); calls.push({ path, body: raw ? JSON.parse(raw) : null })
    let status = 200; let body: unknown
    if (path === '/session') { status = signedIn ? 200 : 401; body = signedIn ? session : { error: { code: 'unauthorized' } } }
    else if (path === '/auth/login') { signedIn = !options.multi; body = options.multi ? selection : authenticated }
    else if (path === '/auth/select-school') { signedIn = true; body = authenticated }
    else if (path === '/auth/logout') { signedIn = false; status = 204 }
    else if (path === '/admin/overview') { status = options.status ?? 200; body = status === 200 ? overview(options.kind) : { error: { code: status === 403 ? 'forbidden' : status === 401 ? 'unauthorized' : 'bad_gateway' } } }
    else { status = 501 }
    await route.fulfill({ status, contentType: 'application/json', ...(status === 204 ? {} : { body: JSON.stringify(body) }) })
  })
  return calls
}
async function login(page: Page) {
  await page.getByLabel('Email', { exact: true }).fill('admin@school.example')
  await page.getByLabel('Senha', { exact: true }).fill('synthetic-browser-password')
  await page.getByLabel('Senha', { exact: true }).press('Enter')
}
test('direct login, overview, restore and logout', async ({ page }) => {
  const calls = await boundary(page)
  await page.goto('/'); await login(page)
  await expect(page.getByRole('heading', { name: 'Visão geral da escola' })).toBeVisible()
  expect(calls.map((c) => c.path)).toEqual(['/session', '/auth/login', '/session', '/admin/overview'])
  await page.reload(); await expect(page.getByRole('heading', { name: 'Visão geral da escola' })).toBeVisible()
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
})
test('multi-school challenge stays in memory and refresh requires a fresh login', async ({ page }) => {
  const calls = await boundary(page, { multi: true })
  await page.goto('/login'); await login(page)
  await expect(page.getByRole('heading', { name: 'Escolha sua escola' })).toBeVisible()
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, url: location.href }))).toEqual({ local: 0, session: 0, url: 'http://127.0.0.1:4173/select-school' })
  await page.reload(); await expect(page).toHaveURL(/\/login$/)
  await login(page)
  await page.getByRole('radio', { name: 'Outra escola de teste' }).check()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { name: 'Visão geral da escola' })).toBeVisible()
  expect(calls.filter((c) => c.path === '/auth/select-school')).toHaveLength(1)
})
for (const kind of ['empty', 'partial', 'configured'] as const) {
  test(`overview ${kind} and baseline responsive layout`, async ({ page }) => {
    const calls = await boundary(page, { restored: true, kind })
    await page.goto('/')
    await expect(page.getByRole('progressbar')).toHaveAttribute('value', String(overview(kind).setup.progress))
    const illustration = page.locator('img[src*="admin-home-welcome"]')
    const banner = page.locator('section').filter({ has: illustration })
    await expect(illustration).toHaveAttribute('alt', '')
    await expect(illustration).toHaveAttribute('aria-hidden', 'true')
    await expect(illustration).toHaveJSProperty('naturalWidth', 1774)
    expect(calls.map((c) => c.path)).toEqual(['/session', '/admin/overview'])
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 })
      const imageBox = await illustration.boundingBox()
      const textBox = await banner.locator('div').first().boundingBox()
      const bannerBox = await banner.boundingBox()
      expect(imageBox && textBox && bannerBox).toBeTruthy()
      if (imageBox && textBox && bannerBox) {
        expect(imageBox.x).toBeGreaterThanOrEqual(bannerBox.x - 1)
        expect(imageBox.x + imageBox.width).toBeLessThanOrEqual(bannerBox.x + bannerBox.width + 1)
        expect(imageBox.y + imageBox.height).toBeLessThanOrEqual(bannerBox.y + bannerBox.height + 1)
        expect(Math.abs(imageBox.width / imageBox.height - 2)).toBeLessThan(0.01)
        if (width >= 768) expect(imageBox.x).toBeGreaterThanOrEqual(textBox.x + textBox.width - 1)
        else expect(imageBox.y).toBeGreaterThanOrEqual(textBox.y + textBox.height - 1)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await expect(page.getByRole('button', { name: 'Sair', exact: true })).toBeVisible()
      if (process.env.CAPTURE_SPEC002 === '1' && (kind === 'empty' || width === 1440)) {
        await page.screenshot({ path: `docs/implementation/evidence/SPEC-002-${kind}-${width}.png`, fullPage: width === 1440 })
      }
    }
  })
}
test('401 removes shell; 403 preserves session; temporary errors allow retry', async ({ page }) => {
  await boundary(page, { restored: true, status: 401 }); await page.goto('/')
  await expect(page).toHaveURL(/\/login$/); await expect(page.getByRole('button', { name: 'Sair' })).toHaveCount(0)
  await page.unrouteAll()
  await boundary(page, { restored: true, status: 403 }); await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Acesso não permitido' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sair', exact: true })).toBeVisible()
  await page.unrouteAll()
  await boundary(page, { restored: true, status: 502 }); await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Não foi possível carregar a visão geral' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
  await expect(page.getByRole('progressbar')).toHaveCount(0)
})
test('keyboard login and narrow viewport stay usable', async ({ page }) => {
  await boundary(page); await page.setViewportSize({ width: 320, height: 800 }); await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Sua escola, mais conectada.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Sua escola, mais conectada.' })).toBeFocused()
  await page.keyboard.press('Tab'); await expect(page.getByLabel('Email', { exact: true })).toBeFocused()
  await page.keyboard.type('admin@school.example'); await page.keyboard.press('Tab')
  await expect(page.getByLabel('Senha', { exact: true })).toBeFocused()
  await page.keyboard.type('synthetic-password')
  await expect(page.getByLabel('Senha', { exact: true })).toBeFocused()
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('admin@school.example')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Visão geral da escola' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
