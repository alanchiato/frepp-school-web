import { BrowserRouter } from 'react-router-dom'
import { SessionProvider } from '../session/SessionProvider'
import { createBffClient } from '../shared/api/client'
import { ErrorState } from '../shared/components/ui'
import { App } from './App'

function loadClient() {
  try { return createBffClient(import.meta.env.VITE_BFF_BASE_URL) } catch { return null }
}
const api = loadClient()
export function Bootstrap() {
  if (!api) return <main><ErrorState title="Configuração indisponível" message="Verifique a configuração de VITE_BFF_BASE_URL para iniciar a aplicação." /></main>
  return <BrowserRouter><SessionProvider api={api}><App /></SessionProvider></BrowserRouter>
}
