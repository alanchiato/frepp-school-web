import { resolveBffBaseUrl } from './config'
import { ApiError } from './errors'
import { readAuthenticated, readErrorCode, readLogin, readOverview, readSession } from './validation'

export function createBffClient(base: string | undefined) {
  const baseUrl = resolveBffBaseUrl(base)
  async function request<T>(path: string, method: 'GET' | 'POST', read: (value: unknown) => T, signal: AbortSignal, body?: object): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      method, signal, credentials: 'include', cache: 'no-store', redirect: 'error',
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    let value: unknown
    if (response.status !== 204) {
      try { value = await response.json() } catch (error) { if (signal.aborted) throw error; value = undefined }
    }
    if (!response.ok) throw new ApiError(response.status, readErrorCode(value))
    if (response.status !== (path === '/auth/logout' ? 204 : 200)) throw new ApiError(502, 'invalid_response')
    return read(value)
  }
  return {
    login: (input: { email: string; password: string }, signal: AbortSignal) => request('/auth/login', 'POST', readLogin, signal, input),
    selectSchool: (input: { challengeToken: string; schoolId: string }, signal: AbortSignal) => request('/auth/select-school', 'POST', readAuthenticated, signal, input),
    session: (signal: AbortSignal) => request('/session', 'GET', readSession, signal),
    logout: (signal: AbortSignal) => request('/auth/logout', 'POST', () => undefined, signal),
    overview: (signal: AbortSignal) => request('/admin/overview', 'GET', readOverview, signal),
  }
}
export type BffClient = ReturnType<typeof createBffClient>
