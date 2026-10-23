import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './shared/styles/global.css'
import { ErrorBoundary } from './app/ErrorBoundary'
import { Bootstrap } from './app/Bootstrap'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary><Bootstrap /></ErrorBoundary>
  </StrictMode>,
)
