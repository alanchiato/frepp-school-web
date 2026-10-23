import type { LoginResult, SchoolSelection, Session } from '../shared/api/contracts'

export type AuthState =
  | { status: 'unknown' | 'restoring' }
  | { status: 'restore_error'; message: string }
  | { status: 'unauthenticated' | 'logging_in'; message?: string }
  | { status: 'selecting_school' | 'selecting'; selection: SchoolSelection }
  | { status: 'authenticated' | 'logging_out'; session: Session }
export type AuthEvent =
  | { type: 'restore' }
  | { type: 'restore_failed'; message: string }
  | { type: 'unauthenticated'; message?: string }
  | { type: 'login' }
  | { type: 'login_result'; result: LoginResult }
  | { type: 'select' }
  | { type: 'session'; session: Session }
  | { type: 'logout' }
  | { type: 'logout_failed' }
export function authReducer(state: AuthState, event: AuthEvent): AuthState {
  switch (event.type) {
    case 'restore': return { status: 'restoring' }
    case 'restore_failed': return { status: 'restore_error', message: event.message }
    case 'unauthenticated': return { status: 'unauthenticated', message: event.message }
    case 'login': return { status: 'logging_in' }
    case 'login_result': return event.result.status === 'school_selection_required'
      ? { status: 'selecting_school', selection: event.result } : { status: 'restoring' }
    case 'select': return state.status === 'selecting_school' ? { status: 'selecting', selection: state.selection } : state
    case 'session': return { status: 'authenticated', session: event.session }
    case 'logout': return state.status === 'authenticated' ? { status: 'logging_out', session: state.session } : state
    case 'logout_failed': return state.status === 'logging_out' ? { status: 'authenticated', session: state.session } : state
  }
}
