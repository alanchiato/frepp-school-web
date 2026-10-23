import type { AdminOverview, Authenticated, LoginResult, OverviewAlert, School, Session, SetupStep } from './contracts'
import { ApiError } from './errors'

// Small boundary readers check transport shapes, without reproducing Core rules.
const invalid = () => new ApiError(502, 'invalid_response')
function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw invalid()
  return value as Record<string, unknown>
}
function string(value: unknown): string { if (typeof value !== 'string' || !value) throw invalid(); return value }
function boolean(value: unknown): boolean { if (typeof value !== 'boolean') throw invalid(); return value }
function number(value: unknown): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw invalid(); return value }
function year(value: unknown): number { if (typeof value !== 'number' || !Number.isInteger(value) || value < -2147483648 || value > 2147483647) throw invalid(); return value }
function array<T>(value: unknown, read: (item: unknown) => T): T[] { if (!Array.isArray(value)) throw invalid(); return value.map(read) }
function active(value: unknown): 'ACTIVE' { if (value !== 'ACTIVE') throw invalid(); return value }
function school(value: unknown): School {
  const s = object(value); return { id: string(s.id), name: string(s.name), timezone: string(s.timezone) }
}
export function readAuthenticated(value: unknown): Authenticated {
  const v = object(value); const u = object(v.user)
  if (v.status !== 'authenticated' || v.challengeToken !== undefined || v.schools !== undefined) throw invalid()
  return { status: 'authenticated', user: { id: string(u.id), schoolId: string(u.schoolId), email: string(u.email), status: active(u.status) } }
}
export function readLogin(value: unknown): LoginResult {
  const v = object(value)
  if (v.status === 'authenticated') return readAuthenticated(v)
  if (v.status !== 'school_selection_required' || v.user !== undefined) throw invalid()
  const schools = array(v.schools, (item) => { const s = object(item); return { id: string(s.id), name: string(s.name) } })
  if (schools.length < 2) throw invalid()
  return { status: 'school_selection_required', challengeToken: string(v.challengeToken), schools }
}
export function readSession(value: unknown): Session {
  const v = object(value); const u = object(v.user); const e = object(v.experiences)
  return { user: { id: string(u.id), email: string(u.email), status: active(u.status) }, school: school(v.school),
    roles: array(v.roles, string), permissions: array(v.permissions, string), experiences: { admin: boolean(e.admin), teacher: boolean(e.teacher) } }
}
export function readOverview(value: unknown): AdminOverview {
  const v = object(value); const a = object(v.academicYear); const s = object(v.setup); const c = object(v.counts)
  const hasCurrent = boolean(a.hasCurrent)
  let current: AdminOverview['academicYear']['current'] = null
  if (hasCurrent) {
    const y = object(a.current)
    current = { id: string(y.id), year: year(y.year), startDate: string(y.startDate), endDate: string(y.endDate) }
  } else if (a.current !== null) throw invalid()
  const progress = number(s.progress); if (progress > 100) throw invalid()
  const steps = array(s.steps, (item): SetupStep => {
    const step = object(item)
    if (step.status !== 'complete' && step.status !== 'attention' && step.status !== 'not_started') throw invalid()
    return { code: string(step.code), status: step.status }
  })
  const alerts = array(v.alerts, (item): OverviewAlert => {
    const alert = object(item); if (alert.severity !== 'warning') throw invalid()
    return { code: string(alert.code), severity: alert.severity, count: number(alert.count), ...(alert.action === undefined ? {} : { action: string(alert.action) }) }
  })
  return { school: school(v.school), academicYear: { hasCurrent, current }, setup: { progress, steps },
    counts: { units: number(c.units), classes: number(c.classes), teachers: number(c.teachers), students: number(c.students), guardians: number(c.guardians) },
    alerts, quickActions: array(v.quickActions, string) }
}
export function readErrorCode(value: unknown): string {
  try { return string(object(object(value).error).code) } catch { return 'request_failed' }
}
