import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    cacheDir: env.FREPP_VITE_CACHE_DIR || 'node_modules/.vite',
    server: {
      host: '127.0.0.1',
      proxy: {
        '/bff': {
          target: env.BFF_PROXY_TARGET || 'http://127.0.0.1:3001',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/bff(?=\/|$)/, ''),
        },
      },
    },
  }
})
