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

test('mobile school menu and overview cards behave as a carousel', async ({ page }) => {
  await boundary(page, { restored: true, kind: 'configured' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Visão geral da escola' })).toBeVisible()
  const header=page.getByRole('banner')
  await expect(header.getByRole('img', { name: 'Frepp School' })).toBeVisible()
  await expect(header.getByTitle('Escola de teste')).toBeVisible()
  const nav=page.getByRole('navigation', { name: 'Navegação principal' })
  const sidebar=page.locator('#school-navigation')
  const overlay=page.locator('button[aria-label="Fechar menu de navegação"]')
  await expect(nav).toBeHidden()
  if(process.env.CAPTURE_MOBILE_NAV==='1')await page.screenshot({path:'docs/implementation/evidence/SCHOOL-MOBILE-overview.png',fullPage:true})
  const toggle=page.getByRole('button', { name: 'Abrir menu' })
  await toggle.click()
  await expect(nav).toBeVisible()
  await expect(sidebar).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')
  await expect(overlay).toHaveCSS('opacity', '1')
  expect(await sidebar.evaluate(element=>getComputedStyle(element).transitionDuration)).toContain('0.32s')
  await expect(page.getByRole('button', { name: 'Fechar menu', exact: true })).toHaveAttribute('aria-expanded','true')
  if(process.env.CAPTURE_MOBILE_NAV==='1')await page.screenshot({path:'docs/implementation/evidence/SCHOOL-MOBILE-menu.png',fullPage:true})
  await page.keyboard.press('Escape')
  await expect(nav).toBeHidden()
  await expect(overlay).toBeHidden()
  await expect(toggle).toBeFocused()
  await toggle.click()
  await expect(overlay).toHaveCSS('opacity', '1')
  await overlay.click({position:{x:350,y:100}})
  await expect(nav).toBeHidden()
  const counts=page.getByRole('region', { name: 'Principais números' })
  expect(await counts.evaluate(element=>element.scrollWidth>element.clientWidth)).toBe(true)
  await counts.evaluate(element=>{element.scrollLeft=element.scrollWidth})
  await expect(counts.locator('section').last()).toBeInViewport()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('class workspace navigation, sections and five responsive viewports', async ({ page }) => {
  const classId='44444444-4444-4444-8444-444444444444',unitId='55555555-5555-4555-8555-555555555555',yearId='66666666-6666-4666-8666-666666666666',gradeId='77777777-7777-4777-8777-777777777777'
  const studentId='88888888-8888-4888-8888-888888888888',teacherId='99999999-9999-4999-8999-999999999999',subjectId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const stamp='2026-10-25T12:00:00Z'
  const classroom={id:classId,schoolUnitId:unitId,academicYearId:yearId,gradeLevelId:gradeId,name:'Turma A',createdAt:stamp,updatedAt:stamp}
  const data={class:classroom,unitName:'Centro',academicYear:2026,gradeLevelName:'1º Ano',students:[{id:studentId,fullName:'Estudante Teste',preferredName:null,enrollmentId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',startDate:'2026-02-01'}],teachers:[{id:teacherId,name:'Sonia Maria Madureira De Chiato',assignmentId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',role:'SUBJECT_TEACHER',subjectId,subjectName:'Matemática',startDate:'2026-02-01',endDate:null},{id:teacherId,name:'Sonia Maria Madureira De Chiato',assignmentId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',role:'SUBJECT_TEACHER',subjectId:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',subjectName:'Ciências',startDate:'2026-03-01',endDate:null}],subjects:[{id:subjectId,name:'Matemática',teacherIds:[teacherId]},{id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',name:'Ciências',teacherIds:[teacherId]}],counts:{students:1,teachers:1,subjects:2}}
  let emptyWorkspace=false
  const calls:string[]=[]
  await page.route('**/bff/**',async route=>{
    const path=new URL(route.request().url()).pathname.replace('/bff','');calls.push(path)
    const responses:Record<string,unknown>={'/session':session,'/admin/grade-levels':{gradeLevels:[{id:gradeId,code:'1ANO',name:'1º Ano',displayOrder:1,createdAt:stamp,updatedAt:stamp}]},'/admin/classes':{classes:[classroom]},'/admin/academic-years':{academicYears:[{id:yearId,year:2026,startDate:'2026-01-01',endDate:'2026-12-31',createdAt:stamp,updatedAt:stamp}]},'/admin/units':{units:[{id:unitId,name:'Centro'}]},[`/admin/classes/${classId}/workspace`]:{workspace:emptyWorkspace?{...data,students:[],teachers:[],subjects:[],counts:{students:0,teachers:0,subjects:0}}:data}}
    await route.fulfill({status:path in responses?200:404,contentType:'application/json',body:JSON.stringify(responses[path]??{error:{code:'not_found'}})})
  })
  await page.goto('/admin/academic-structure?tab=turmas')
  await expect(page.getByRole('link',{name:'Turma A'})).toBeVisible()
  if(process.env.CAPTURE_CLASS_WORKSPACE==='1')await page.screenshot({path:'docs/implementation/evidence/CLASS-WORKSPACE-list.png',fullPage:true})
  await page.getByRole('link',{name:'Turma A'}).click()
  await expect(page).toHaveURL(new RegExp(`/admin/classes/${classId}`))
  await expect(page.getByRole('heading',{name:'Turma A'})).toBeVisible()
  expect(calls.filter(path=>path.includes('/workspace'))).toHaveLength(1)
  for(const [width,height] of [[1440,900],[1280,800],[768,1024],[390,844],[360,800]] as const){
    await page.setViewportSize({width,height})
    await expect(page.getByRole('heading',{name:'Turma A'})).toBeVisible()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    if(process.env.CAPTURE_CLASS_WORKSPACE==='1')await page.screenshot({path:`docs/implementation/evidence/CLASS-WORKSPACE-${width}.png`,fullPage:true})
  }
  for(const [name,marker] of [['Professores','Sonia Maria Madureira De Chiato'],['Disciplinas','Matemática'],['Informações','Ano letivo']] as const){
    await page.getByRole('tab',{name}).click();await expect(page.getByText(marker,{exact:true}).first()).toBeVisible()
    if(name==='Professores'){
      const table=page.getByRole('table',{name:'Professores atribuídos à turma'})
      const teacherLink=table.getByRole('link',{name:'Sonia Maria Madureira De Chiato'})
      await expect(teacherLink).toHaveCount(1)
      expect(await teacherLink.evaluate(link=>getComputedStyle(link).whiteSpace)).toBe('nowrap')
      await expect(table.locator('th').filter({hasText:'Tipo de vínculo'})).toBeAttached()
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
      await expect(table.getByText('Matemática')).toBeVisible()
      await expect(table.getByText('Ciências')).toBeVisible()
      if(process.env.CAPTURE_CLASS_WORKSPACE==='1'){
        await page.setViewportSize({width:1440,height:900})
        await page.screenshot({path:'docs/implementation/evidence/CLASS-WORKSPACE-Professores-desktop.png',fullPage:true})
        await page.setViewportSize({width:360,height:800})
      }
    }
    if(process.env.CAPTURE_CLASS_WORKSPACE==='1')await page.screenshot({path:`docs/implementation/evidence/CLASS-WORKSPACE-${name}.png`,fullPage:true})
  }
  emptyWorkspace=true
  await page.goto(`/admin/classes/${classId}`);await expect(page.getByText('Nenhum aluno com matrícula vigente nesta turma.')).toBeVisible()
  if(process.env.CAPTURE_CLASS_WORKSPACE==='1')await page.screenshot({path:'docs/implementation/evidence/CLASS-WORKSPACE-empty.png',fullPage:true})
  await page.reload();await expect(page.getByRole('heading',{name:'Turma A'})).toBeVisible()
  await page.getByRole('link',{name:'Voltar às turmas'}).click();await expect(page.getByRole('link',{name:'Turma A'})).toBeVisible()
})
