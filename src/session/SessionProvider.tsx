import { useCallback, useEffect, useReducer, useRef, type ReactNode } from 'react'
import type { BffClient } from '../shared/api/client'
import { ApiError, errorMessage } from '../shared/api/errors'
import { authReducer } from './model'
import { SessionContext } from './context'
export function SessionProvider({ api, children }: { api: BffClient; children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, { status: 'unknown' })
  const [attempt, retryRestore] = useReducer((n: number) => n + 1, 0)
  const mounted = useRef(false)
  const operation = useRef<AbortController | null>(null)
  const invalidate = useCallback(() => {
    operation.current?.abort()
    dispatch({ type: 'unauthenticated' })
  }, [])
  const bootstrap = useCallback(async (signal: AbortSignal) => {
    try {
      const session = await api.session(signal)
      if (!signal.aborted && mounted.current) dispatch({ type: 'session', session })
    } catch (error) {
      if (signal.aborted || !mounted.current) return
      if (error instanceof ApiError && error.status === 401) dispatch({ type: 'unauthenticated' })
      else dispatch({ type: 'restore_failed', message: errorMessage(error) })
    }
  }, [api])
  useEffect(() => {
    mounted.current = true
    const controller = new AbortController()
    // Defer the initial GET so StrictMode's discarded effect sends no request.
    queueMicrotask(() => {
      if (controller.signal.aborted) return
      dispatch({ type: 'restore' })
      void bootstrap(controller.signal)
    })
    return () => { mounted.current = false; controller.abort(); operation.current?.abort() }
  }, [bootstrap, attempt])
  async function login(input: { email: string; password: string }, signal: AbortSignal) {
    if (operation.current || state.status !== 'unauthenticated') return
    const controller = new AbortController(); operation.current = controller
    const combined = AbortSignal.any([signal, controller.signal])
    dispatch({ type: 'login' })
    try {
      const result = await api.login(input, combined)
      if (combined.aborted || !mounted.current) return
      dispatch({ type: 'login_result', result })
      // The form unmounts on success; bootstrap belongs to the provider.
      if (result.status === 'authenticated') await bootstrap(controller.signal)
    } catch (error) {
      if (mounted.current && !controller.signal.aborted) dispatch({ type: 'unauthenticated', message: signal.aborted ? undefined : errorMessage(error) })
    } finally { if (operation.current === controller) operation.current = null }
  }
  async function selectSchool(schoolId: string, signal: AbortSignal) {
    if (operation.current || state.status !== 'selecting_school') return
    const controller = new AbortController(); operation.current = controller
    const combined = AbortSignal.any([signal, controller.signal])
    dispatch({ type: 'select' })
    try {
      await api.selectSchool({ challengeToken: state.selection.challengeToken, schoolId }, combined)
      if (combined.aborted || !mounted.current) return
      dispatch({ type: 'restore' }) // Immediately releases the single-use challenge.
      await bootstrap(controller.signal)
    } catch (error) {
      // An ambiguous POST is never replayed. A fresh login starts a new flow.
      if (mounted.current && !controller.signal.aborted) dispatch({ type: 'unauthenticated', message: signal.aborted ? undefined : errorMessage(error) })
    } finally { if (operation.current === controller) operation.current = null }
  }
  async function logout() {
    if (operation.current || state.status !== 'authenticated') return
    const controller = new AbortController(); operation.current = controller
    dispatch({ type: 'logout' })
    try {
      await api.logout(controller.signal)
      if (mounted.current && !controller.signal.aborted) dispatch({ type: 'unauthenticated' })
    } catch (error) {
      if (!mounted.current || controller.signal.aborted) return
      if (error instanceof ApiError && error.status === 401) dispatch({ type: 'unauthenticated' })
      else { dispatch({ type: 'logout_failed' }); throw error }
    } finally { if (operation.current === controller) operation.current = null }
  }
  return <SessionContext.Provider value={{ state, api, login, selectSchool, logout, invalidate,
    discardSelection: invalidate, restore: retryRestore }}>{children}</SessionContext.Provider>
}
