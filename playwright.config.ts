import { defineConfig, devices } from '@playwright/test'
const mode = process.env.E2E_MODE
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 30000,
  use: { ...devices['Desktop Chrome'], trace: 'off', video: 'off', screenshot: 'off' },
  projects: [
    { name: 'browser', testMatch: 'browser.e2e.ts', use: { baseURL: 'http://127.0.0.1:4173' } },
    { name: 'real-bff', testMatch: 'real.e2e.ts', use: { baseURL: 'http://127.0.0.1:4175' } },
  ],
  webServer: [
    ...(mode === 'real' ? [] : [{ command: 'pnpm dev --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: false, env: { VITE_BFF_BASE_URL: '/bff', FREPP_VITE_CACHE_DIR: 'node_modules/.vite-browser-e2e' } }]),
    ...(mode === 'browser' ? [] : [{
      command: 'node tests/support/launch-real.mjs',
      url: 'http://127.0.0.1:4175', timeout: 120000, reuseExistingServer: false,
      env: { VITE_BFF_BASE_URL: '/bff' },
      gracefulShutdown: { signal: 'SIGTERM' as const, timeout: 15000 },
    }]),
  ],
})
