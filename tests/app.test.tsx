import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { once } from 'node:events'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../src/app/App'
import { ErrorBoundary } from '../src/app/ErrorBoundary'
import { SessionProvider } from '../src/session/SessionProvider'
import { createBffClient } from '../src/shared/api/client'
import { OverviewContent } from '../src/admin/overview/AdminHome'
import adminHomeWelcome from '../src/assets/illustrations/admin-home-welcome.png'
import { ErrorState } from '../src/shared/components/ui'
import { authenticated, overview, selection, session } from './support/fixtures'

// Only the BFF HTTP boundary is mocked. Production fetch, client, provider,
// route guards and views all execute against an actual disposable HTTP server.
type Request = { method: string; path: string; body: unknown }
let calls: Request[]
let signedIn: boolean
let multiple: boolean
let overviewStatus: number
let loginStatus: number
let selectStatus: number
let logoutStatus: number
let restoreStatus: number | undefined
let overviewKind: 'empty' | 'partial' | 'configured'
let holdSession: Promise<void> | undefined
let holdLogin: Promise<void> | undefined
let holdOverview: Promise<void> | undefined
let currentSession: typeof session
let base: string
const failure = (status: number) => ({ error: { code: status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'bad_gateway', message: 'Untrusted backend text.' } })
function send(response: ServerResponse, status: number, value?: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json' })
  response.end(status === 204 ? undefined : JSON.stringify(value ?? failure(status)))
}
async function handle(request: IncomingMessage, response: ServerResponse) {
  let raw = ''; for await (const chunk of request) raw += chunk
  const body: unknown = raw ? JSON.parse(raw) : undefined
  calls.push({ method: request.method ?? '', path: request.url ?? '', body })
  switch (request.url) {
    case '/session':
      await holdSession
      return send(response, restoreStatus ?? (signedIn ? 200 : 401), signedIn ? currentSession : undefined)
    case '/auth/login':
      await holdLogin
      if (loginStatus !== 200) return send(response, loginStatus, { error: { code: 'invalid_credentials', message: 'Untrusted text' } })
      if (!multiple) signedIn = true
      return send(response, 200, multiple ? selection : authenticated)
    case '/auth/select-school':
      if (selectStatus !== 200) return send(response, selectStatus, { error: { code: 'invalid_login_challenge' } })
      signedIn = true; return send(response, 200, authenticated)
    case '/auth/logout':
      if (logoutStatus === 204) signedIn = false
      return send(response, logoutStatus)
    case '/admin/overview': await holdOverview; return send(response, overviewStatus, overviewStatus === 200 ? overview(overviewKind) : undefined)
    default: return send(response, 404)
  }
}
const server = createServer((req, res) => { void handle(req, res) })
beforeEach(async () => {
  calls = []; signedIn = false; multiple = false; overviewStatus = 200; loginStatus = 200; selectStatus = 200; logoutStatus = 204
  overviewKind = 'empty'; holdSession = undefined; holdLogin = undefined; holdOverview = undefined; currentSession = session; restoreStatus = undefined
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('Missing HTTP fixture')
  base = `http://127.0.0.1:${address.port}`
})
afterEach(async () => { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())) })
function start(path = '/') { return render(<StrictMode><MemoryRouter initialEntries={[path]}><SessionProvider api={createBffClient(base)}><App /></SessionProvider></MemoryRouter></StrictMode>) }
async function enter() {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Email'), 'admin@school.example')
  await user.type(screen.getByLabelText('Senha'), 'test-password{Enter}')
  return user
}

describe('application flows over HTTP', () => {
  it('overview loading keeps the shell and a stable skeleton layout', async () => {
    signedIn = true
    let release: () => void = () => {}; holdOverview = new Promise((resolve) => { release = resolve })
    start()
    expect(await screen.findByRole('heading', { name: 'Carregando visão geral' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    await act(async () => release())
    expect(await screen.findByRole('heading', { name: 'Visão geral da escola' })).toBeInTheDocument()
  })
  it('restores before showing any login, with one StrictMode GET', async () => {
    signedIn = true
    let release: () => void = () => {}; holdSession = new Promise((resolve) => { release = resolve })
    start()
    expect(screen.getByRole('heading', { name: 'Restaurando sessão' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument()
    await waitFor(() => expect(calls).toHaveLength(1))
    await act(async () => release())
    expect(await screen.findByRole('heading', { name: 'Visão geral da escola' })).toBeInTheDocument()
    expect(calls.filter((c) => c.path === '/session')).toHaveLength(1)
    expect(calls.filter((c) => c.path === '/admin/overview')).toHaveLength(1)
  })
  it('no session redirects to login; direct login bootstraps session and overview', async () => {
    start(); await enter()
    expect(await screen.findByRole('heading', { name: 'Visão geral da escola' })).toBeInTheDocument()
    expect(calls.map((c) => c.path)).toEqual(['/session', '/auth/login', '/session', '/admin/overview'])
    expect(calls.find((c) => c.path === '/auth/login')?.body).toEqual({ email: 'admin@school.example', password: 'test-password' })
    expect(screen.getByText(session.user.email)).toBeInTheDocument()
  })
  it('multi-school sends only the opaque challenge and chosen id, then bootstraps', async () => {
    multiple = true; start(); const user = await enter()
    await user.click(await screen.findByRole('radio', { name: 'Outra escola de teste' }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByRole('heading', { name: 'Visão geral da escola' })).toBeInTheDocument()
    expect(calls.find((c) => c.path === '/auth/select-school')?.body).toEqual({ challengeToken: selection.challengeToken, schoolId: selection.schools[1].id })
    expect(document.body.textContent).not.toContain(selection.challengeToken)
    expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0)
  })
  it('direct selection access without memory returns to login', async () => {
    start('/select-school'); expect(await screen.findByLabelText('Email')).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })
  it('can discard a selection and start another login', async () => {
    multiple = true; start(); const user = await enter()
    await user.click(await screen.findByRole('button', { name: 'Voltar ao login' }))
    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })
  it.each([401, 502])('failed selection %s discards challenge and never retries the POST', async (status) => {
    multiple = true; selectStatus = status; start(); const user = await enter()
    await user.click(await screen.findByRole('radio', { name: 'Outra escola de teste' })); await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
    expect(calls.filter((c) => c.path === '/auth/select-school')).toHaveLength(1)
    expect(screen.getByRole('alert')).not.toHaveTextContent('Untrusted')
  })
  it('403 keeps the authenticated shell and supports manual retry', async () => {
    signedIn = true; overviewStatus = 403; start()
    expect(await screen.findByRole('heading', { name: 'Acesso não permitido' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
    overviewStatus = 200; await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByRole('heading', { name: 'Visão geral da escola' })).toBeInTheDocument()
  })
  it('Teacher-only has safe unsupported state without fetching admin data', async () => {
    signedIn = true; currentSession = { ...session, experiences: { admin: false, teacher: true } }; start()
    expect(await screen.findByRole('heading', { name: 'Acesso não permitido' })).toBeInTheDocument()
    expect(calls.some((c) => c.path === '/admin/overview')).toBe(false)
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })
  it('401 from overview clears local session and removes shell', async () => {
    signedIn = true; overviewStatus = 401; start()
    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
  })
  it.each([500, 502, 504])('%s is a temporary error, never empty setup', async (status) => {
    signedIn = true; overviewStatus = status; start()
    expect(await screen.findByRole('heading', { name: 'Não foi possível carregar a visão geral' })).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).not.toHaveTextContent('Untrusted')
  })
  it('restore network/upstream failure remains recoverable without claiming no session', async () => {
    restoreStatus = 502; start()
    expect(await screen.findByRole('heading', { name: 'Não foi possível restaurar a sessão' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument()
    restoreStatus = undefined
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
  })
  it('logout success clears the shell; failure keeps the session and shows an error', async () => {
    signedIn = true; logoutStatus = 502; start()
    await userEvent.click(await screen.findByRole('button', { name: 'Sair' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível sair')
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
    logoutStatus = 204; await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
  })
  it('validates inputs, associates errors, and uses safe invalid-credential messaging', async () => {
    loginStatus = 401; start(); const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Entrar' }))
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Informe um email válido.')
    expect(screen.getByLabelText('Email')).toHaveFocus()
    await enter()
    expect(await screen.findByRole('alert')).toHaveTextContent('Email ou senha inválidos.')
    expect(screen.getByLabelText('Senha')).toHaveValue('')
    expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'current-password')
  })
  it('prevents duplicate login submissions while the request is pending', async () => {
    let release: () => void = () => {}; holdLogin = new Promise((resolve) => { release = resolve })
    start(); await enter()
    const button = screen.getByRole('button', { name: /Entrando/ }); expect(button).toBeDisabled()
    await userEvent.click(button)
    await waitFor(() => expect(calls.filter((c) => c.path === '/auth/login')).toHaveLength(1))
    await act(async () => release())
    expect(await screen.findByRole('heading', { name: 'Visão geral da escola' })).toBeInTheDocument()
  })
  it('renders a useful 404', async () => {
    start('/not-a-route')
    expect(await screen.findByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar para o login' })).toHaveAttribute('href', '/login')
  })
})
describe('overview components', () => {
  it.each(['empty', 'partial', 'configured'] as const)('renders %s using BFF values', (kind) => {
    const data = overview(kind); render(<OverviewContent data={data} />)
    const illustration = document.querySelector('img[src="' + adminHomeWelcome + '"]')
    expect(illustration).toHaveAttribute('alt', '')
    expect(illustration).toHaveAttribute('aria-hidden', 'true')
    expect(illustration).toHaveAttribute('width', '1774')
    expect(illustration).toHaveAttribute('height', '887')
    expect(screen.queryByRole('img', { name: /mascote|ilustração/i })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: data.school.name })).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', String(data.setup.progress))
    const counts = screen.getByRole('region', { name: 'Principais números' })
    expect(within(counts).getByText('Professores')).toBeInTheDocument()
    for (const step of data.setup.steps) expect(screen.getAllByText(step.status === 'complete' ? 'Concluído' : step.status === 'attention' ? 'Atenção' : 'Não iniciado').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    if (kind === 'empty') expect(screen.getByText('Não definido')).toBeInTheDocument()
    else expect(screen.getByText('2001')).toBeInTheDocument()
    if (kind === 'configured') expect(screen.getByText('Nenhuma pendência de configuração')).toBeInTheDocument()
  })
  it('renders an accessible generic error', () => {
    render(<ErrorState message="Erro temporário" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Erro temporário')
  })
  it('contains unexpected render failures in an error boundary', () => {
    function Broken(): never { throw new Error('Synthetic render failure') }
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      render(<ErrorBoundary><Broken /></ErrorBoundary>)
      expect(screen.getByRole('heading', { name: 'Não foi possível exibir esta página' })).toBeInTheDocument()
      expect(screen.queryByText('Synthetic render failure')).not.toBeInTheDocument()
    } finally { consoleError.mockRestore() }
  })
})
