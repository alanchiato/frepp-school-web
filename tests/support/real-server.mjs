// Test infrastructure only. Reuse the owner's disposable Go/PostgreSQL fixture
// and actual production BFF. The Web and its browser tests never call Core.
import { createServer as createHttpServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { createServer as createViteServer } from 'vite'
import { startRealCore } from '../../../frepp-school-bff/tests/real-core/harness.ts'
import { buildApp } from '../../../frepp-school-bff/src/app/build-app.ts'
import { loadConfig } from '../../../frepp-school-bff/src/config/config.ts'

const webRoot = fileURLToPath(new URL('../../', import.meta.url))
const bffRoot = fileURLToPath(new URL('../../../frepp-school-bff/', import.meta.url))
const cleanups = []
let closing
async function close() {
  if (closing) return closing
  closing = (async () => { for (const cleanup of cleanups.reverse()) await cleanup() })()
  return closing
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { void close().then(() => process.exit(0)).catch(() => process.exit(1)) })
try {
  process.chdir(bffRoot)
  const { fixture, mutate } = await startRealCore({ after: (callback) => cleanups.push(callback) })
  const bff = buildApp(loadConfig({ NODE_ENV: 'test', CORE_BASE_URL: fixture.url }), { logger: false })
  const bffUrl = await bff.listen({ host: '127.0.0.1', port: 0 })
  cleanups.push(() => bff.close())
  // Control plane is separate from BFF and Web; fixed fixture operations only.
  // Metadata remains on loopback and in memory; no Core URL leaves this process.
  const allowed = new Set(['activate_discovery_options', 'overview_partial', 'overview_complete', 'overview_revoke_role', 'overview_revoke_permission', 'overview_invalid_timezone', 'overview_restore'])
  const control = createHttpServer((request, response) => {
    response.setHeader('Content-Type', 'application/json'); response.setHeader('Cache-Control', 'no-store')
    if (request.method === 'GET' && request.url === '/fixture') {
      response.end(JSON.stringify({ password: fixture.password, email: fixture.email, accounts: fixture.accounts, overview: fixture.overview, discovery: { sharedEmail: fixture.discovery.sharedEmail, schoolB: fixture.discovery.schoolB } }))
    } else if (request.method === 'POST' && request.url?.startsWith('/mutate/')) {
      const operation = request.url.slice('/mutate/'.length)
      if (!allowed.has(operation)) { response.writeHead(400); response.end('{}'); return }
      void mutate(operation).then(() => response.end('{}')).catch(() => { response.writeHead(500); response.end('{}') })
    } else { response.writeHead(404); response.end('{}') }
  })
  await new Promise((resolve, reject) => { control.once('error', reject); control.listen(4176, '127.0.0.1', resolve) })
  cleanups.push(() => new Promise((resolve) => { control.closeAllConnections(); control.close(resolve) }))
  const vite = await createViteServer({ root: webRoot, configFile: `${webRoot}vite.config.ts`, cacheDir: `${webRoot}node_modules/.vite-real-e2e`,
    server: { host: '127.0.0.1', port: 4175, strictPort: true, proxy: { '/bff': { target: bffUrl, changeOrigin: true, rewrite: (path) => path.replace(/^\/bff(?=\/|$)/, '') } } } })
  await vite.listen(); cleanups.push(() => vite.close())
  process.stdout.write('Web, BFF, Core e PostgreSQL de teste prontos.\n')
} catch {
  process.stderr.write('Falha ao iniciar a cadeia real. Confira Go, dependências do BFF e PostgreSQL de teste.\n')
  await close().catch(() => {})
  process.exitCode = 1
}
