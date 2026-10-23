import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const loader = fileURLToPath(new URL('../../../frepp-school-bff/node_modules/tsx/dist/loader.mjs', import.meta.url))
const child = spawn(process.execPath, ['--import', loader, 'tests/support/real-server.mjs'], { stdio: 'inherit' })
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
child.on('exit', (code) => { process.exitCode = code ?? 1 })
child.on('error', () => { process.stderr.write('Não foi possível iniciar o harness real.\n'); process.exitCode = 1 })
