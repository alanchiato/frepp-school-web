import { describe, expect, it } from 'vitest'
import { authReducer } from '../src/session/model'
import { actionDestination, alertPresentation, stepPresentation } from '../src/admin/overview/presentation'
import { ApiError, errorMessage } from '../src/shared/api/errors'
import { resolveBffBaseUrl } from '../src/shared/api/config'
import { readLogin, readOverview, readSession } from '../src/shared/api/validation'
import { authenticated, overview, selection, session } from './support/fixtures'

describe('auth transitions', () => {
  it('restores before making routing decisions', () => {
    const restoring = authReducer({ status: 'unknown' }, { type: 'restore' })
    expect(restoring.status).toBe('restoring')
    expect(authReducer(restoring, { type: 'session', session })).toEqual({ status: 'authenticated', session })
    expect(authReducer(restoring, { type: 'unauthenticated' }).status).toBe('unauthenticated')
    expect(authReducer(restoring, { type: 'restore_failed', message: 'temporary' }).status).toBe('restore_error')
  })
  it('handles both login branches and only keeps challenge during selection', () => {
    const loggingIn = authReducer({ status: 'unauthenticated' }, { type: 'login' })
    expect(loggingIn.status).toBe('logging_in')
    expect(authReducer(loggingIn, { type: 'login_result', result: authenticated })).toEqual({ status: 'restoring' })
    const selecting = authReducer(loggingIn, { type: 'login_result', result: selection })
    expect(selecting).toEqual({ status: 'selecting_school', selection })
    expect(authReducer(selecting, { type: 'select' }).status).toBe('selecting')
    expect(authReducer(selecting, { type: 'unauthenticated' })).toEqual({ status: 'unauthenticated', message: undefined })
    expect(authReducer(selecting, { type: 'restore' })).not.toHaveProperty('selection')
  })
  it('retains authenticated session when logout fails', () => {
    const before = { status: 'authenticated' as const, session }
    const busy = authReducer(before, { type: 'logout' })
    expect(busy.status).toBe('logging_out')
    expect(authReducer(busy, { type: 'logout_failed' })).toEqual(before)
    expect(authReducer(busy, { type: 'unauthenticated' })).not.toHaveProperty('session')
  })
})
describe('presentation mappings', () => {
  it.each([['school_units', 'Unidades'], ['academic_year', 'Ano letivo'], ['classes', 'Turmas'], ['teachers', 'Professores'], ['students', 'Alunos'], ['guardians', 'Responsáveis']])('maps %s to %s', (code, label) => expect(stepPresentation(code).label).toBe(label))
  it('handles future step codes without displaying raw backend content', () => expect(stepPresentation('<internal>')).toMatchObject({ label: 'Configuração adicional' }))
  it('handles unknown keys without inheriting object properties', () => {
    expect(stepPresentation('__proto__').label).toBe('Configuração adicional')
    expect(actionDestination('__proto__')).toBeUndefined()
  })
  it.each(['no_current_academic_year', 'classes_without_teacher', 'students_without_guardian', 'teachers_without_assignment'])('maps alert %s', (code) => {
    const result = alertPresentation({ code, severity: 'warning', count: 2 })
    expect(result.title).not.toContain(code)
    expect(result.description).not.toBe('')
    if (code !== 'no_current_academic_year') expect(result.title).toContain('2')
  })
  it('exposes the implemented unit flow', () => expect(actionDestination('create_unit')).toBe('/admin/units'))
  it('exposes the implemented academic year flow', () => expect(actionDestination('create_academic_year')).toBe('/admin/academic-years'))
  it('exposes the implemented class flow', () => expect(actionDestination('create_class')).toBe('/admin/academic-structure?tab=turmas'))
  it('routes teacher actions to the implemented flow', () => { expect(actionDestination('add_teacher')).toBe('/admin/teachers'); expect(actionDestination('assign_teachers')).toBe('/admin/teachers') })
  it('routes the student action to the implemented flow', () => expect(actionDestination('add_student')).toBe('/admin/students'))
  it.each(['add_guardian', 'link_guardians', 'future_action'])('does not expose a dead destination for %s', (code) => expect(actionDestination(code)).toBeUndefined())
  it('does not reflect backend messages or distinguish invalid identities', () => {
    expect(errorMessage(new ApiError(401, 'invalid_credentials'))).toBe('Email ou senha inválidos.')
    expect(errorMessage(new Error('sensitive backend failure'))).not.toContain('sensitive')
    expect(errorMessage(new ApiError(401, 'invalid_login_challenge'))).toContain('Entre novamente')
    expect(errorMessage(new ApiError(403, 'forbidden'))).toContain('permissão')
  })
})
describe('boundary validation', () => {
  it('accepts exact DTOs and keeps values supplied by the BFF', () => {
    expect(readSession(session)).toEqual(session)
    expect(readLogin(selection)).toEqual(selection)
    expect(readLogin(authenticated)).toEqual(authenticated)
    for (const kind of ['empty', 'partial', 'configured'] as const) expect(readOverview(overview(kind))).toEqual(overview(kind))
    const input = overview('partial'); input.setup.progress = 17
    expect(readOverview(input).setup.progress).toBe(17)
  })
  it.each([{ status: 'unknown' }, { ...authenticated, schools: [] }, { ...selection, user: authenticated.user }, { ...selection, schools: [] }])('rejects malformed union', (value) => expect(() => readLogin(value)).toThrow(ApiError))
  it('rejects malformed overview, without converting errors into empty setup', () => {
    expect(() => readOverview({})).toThrow(ApiError)
    expect(() => readOverview({ ...overview(), setup: { progress: 101, steps: [] } })).toThrow(ApiError)
    expect(() => readOverview({ ...overview(), counts: { units: -1 } })).toThrow(ApiError)
  })
  it.each(['', '//host', 'javascript:alert(1)', 'https://u:p@example.com', '/bff?tenant=1', '/bff/../core', '/bff%2fcore', 'https://example.com/#token', 'https://example.com/../core'])('rejects invalid base URL %s', (base) => expect(() => resolveBffBaseUrl(base)).toThrow())
  it('supports same origin default and a configured BFF path prefix', () => {
    expect(resolveBffBaseUrl(undefined)).toBe('/bff')
    expect(resolveBffBaseUrl('/')).toBe('')
    expect(resolveBffBaseUrl('https://bff.example.com/prefix/')).toBe('https://bff.example.com/prefix')
  })
})
