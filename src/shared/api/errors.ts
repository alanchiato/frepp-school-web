export class ApiError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string) {
    super('Não foi possível concluir a solicitação.')
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}
export const isAborted = (error: unknown) => error instanceof DOMException && error.name === 'AbortError'
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'invalid_credentials') return 'Email ou senha inválidos.'
    if (error.code === 'invalid_login_challenge') return 'Sua seleção expirou ou não está mais disponível. Entre novamente.'
    if (error.status === 401) return 'Sua sessão terminou. Entre novamente.'
    if (error.status === 403) return 'Você não tem permissão para acessar esta área.'
  }
  return 'Não foi possível conectar ao serviço agora. Tente novamente em instantes.'
}
