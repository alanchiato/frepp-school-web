import { Component, type ReactNode } from 'react'
import { ErrorState, Logo } from '../shared/components/ui'
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <main><Logo /><ErrorState title="Não foi possível exibir esta página" message="Recarregue a aplicação para tentar novamente." onRetry={() => window.location.reload()} /></main>
    return this.props.children
  }
}
