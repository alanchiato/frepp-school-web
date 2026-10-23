import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createInterface } from 'node:readline'
import { createServer } from 'vite'
import { chromium } from '@playwright/test'

// All simulation traffic evidence stays in memory. No verbose payloads/history.
const simulation = spawn('postman', ['simulation', 'run', 'postman/simulations/bff.sim.yaml', '--port', '4901', '--output', 'ndjson', '--no-history'], { detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
const exited = once(simulation, 'exit')
const lines = createInterface({ input: simulation.stdout })
const events = []
let ready
const listening = new Promise((resolve) => { ready = resolve })
lines.on('line', (line) => {
  try {
    const event = JSON.parse(line)
    if (event.event === 'listening' || event.type === 'listening') ready()
    if (event.event === 'request') events.push({ path: event.path, status: event.statusCode, member: event.routeKey })
  } catch { /* Ignore non-JSON CLI notices. */ }
})
// Drain CLI diagnostics without writing response data or environment values.
simulation.stderr.resume()
let vite; let browser
const timeout = setTimeout(() => { process.stderr.write('Simulation timed out.\n'); void finish().finally(() => process.exit(1)) }, 30000)
async function finish() {
  clearTimeout(timeout)
  await browser?.close(); await vite?.close()
  if (simulation.pid && simulation.exitCode === null) { process.kill(-simulation.pid, 'SIGINT'); await exited }
  lines.close()
}
try {
  await Promise.race([listening, exited.then(() => { throw new Error('Postman simulation failed to start.') })])
  vite = await createServer({ cacheDir: 'node_modules/.vite-simulation', define: { 'import.meta.env.VITE_BFF_BASE_URL': JSON.stringify('/bff') }, server: { host: '127.0.0.1', port: 4185, strictPort: true, proxy: { '/bff': { target: 'http://127.0.0.1:4901', rewrite: (path) => path } } } })
  await vite.listen(); browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto('http://127.0.0.1:4185/')
  await page.getByRole('heading', { name: 'Acesso não permitido' }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Sair', exact: true }).count(), 1)
  // Event delivery can trail HTTP completion; wait on actual events, not sleeps.
  if (events.length < 2) await new Promise((resolve) => lines.on('line', () => { if (events.length >= 2) resolve() }))
  assert.ok(events.some((e) => e.member === 'bff' && e.path === '/session' && e.status === 200))
  assert.ok(events.some((e) => e.member === 'bff' && e.path === '/admin/overview' && e.status === 403))
  process.stdout.write('Postman local: browser restore → real HTTP overview 403 → authenticated forbidden passed; request events verified.\n')
} finally { await finish() }
