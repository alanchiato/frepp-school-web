import { createContext, useContext } from 'react'
import type { BffClient } from '../shared/api/client'
import type { AuthState } from './model'

export interface SessionContextValue {
  state: AuthState
  api: BffClient
  login: (input: { email: string; password: string }, signal: AbortSignal) => Promise<void>
  selectSchool: (schoolId: string, signal: AbortSignal) => Promise<void>
  logout: () => Promise<void>
  restore: () => void
  invalidate: () => void
  discardSelection: () => void
}
export const SessionContext = createContext<SessionContextValue | null>(null)
export function useSession() {
  const context = useContext(SessionContext)
  if (!context) throw new Error('SessionProvider ausente.')
  return context
}
