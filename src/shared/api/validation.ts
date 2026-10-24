import type { AcademicYear, AdminOverview, Authenticated, LoginResult, OverviewAlert, School, Session, SetupStep, UnitOption, UnitAdminInvite, AvailableUnitAdmin, UnitAdminAssignment, UnitOverview } from './contracts'
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
function date(value: unknown): string { const text=string(value); if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw invalid(); return text }
function academicYear(value: unknown): AcademicYear {
  const v=object(value);return {id:string(v.id),year:year(v.year),startDate:date(v.startDate),endDate:date(v.endDate),createdAt:string(v.createdAt),updatedAt:string(v.updatedAt)}
}
export function readAcademicYears(value: unknown): {academicYears:AcademicYear[]} {return {academicYears:array(object(value).academicYears,academicYear)}}
export function readAcademicYear(value: unknown): {academicYear:AcademicYear} {return {academicYear:academicYear(object(value).academicYear)}}
export function readUnitOverview(value:unknown):UnitOverview {
  const v=object(value),u=object(v.unit),a=object(v.academicYear),c=object(v.counts)
  const hasCurrent=boolean(a.hasCurrent)
  const current=hasCurrent?object(a.current):null
  if (!hasCurrent && a.current!==null) throw invalid()
  return {unit:{id:string(u.id),name:string(u.name)},academicYear:{hasCurrent,current:current?{id:string(current.id),year:year(current.year),startDate:date(current.startDate),endDate:date(current.endDate)}:null},
    counts:{classes:number(c.classes),teachers:number(c.teachers),students:number(c.students),guardians:number(c.guardians)}}
}
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
    roles: array(v.roles, string), permissions: array(v.permissions, string),
    ...(v.unitScopes === undefined ? {} : { unitScopes: array(v.unitScopes, (item) => { const s=object(item); if(s.role!=='UNIT_ADMIN') throw invalid(); return {unitId:string(s.unitId),role:s.role} }) }),
    experiences: { admin: boolean(e.admin), teacher: boolean(e.teacher), ...(e.unitAdmin===undefined?{}:{unitAdmin:boolean(e.unitAdmin)}) } }
}
export function readUnits(value: unknown): {units:UnitOption[]} {
  const v=object(value)
  return { units:array(v.units,(item)=>{ const u=object(item);return {id:string(u.id),name:string(u.name),...(u.city===undefined?{}:{city:string(u.city)}),...(u.state===undefined?{}:{state:string(u.state)})} }) }
}
export function readUnit(value:unknown): {unit:UnitOption} {
  const v=object(value);const u=object(v.unit);return {unit:{id:string(u.id),name:string(u.name),...(u.city===undefined?{}:{city:string(u.city)}),...(u.state===undefined?{}:{state:string(u.state)})}}
}
export function readUnitAdminInvite(value: unknown): UnitAdminInvite {
  const v=object(value);const i=object(v.invitation)
  if (v.status!=='INVITED'||(i.status!=='sent'&&i.status!=='pending')) throw invalid()
  return {userId:string(v.userId),email:string(v.email),status:v.status,unitIds:array(v.unitIds,string),invitation:{status:i.status}}
}
export function readAvailableUnitAdmins(value:unknown): {admins:AvailableUnitAdmin[]} {
  const v=object(value)
  return {admins:array(v.admins,item=>{const a=object(item);if(a.status!=='ACTIVE'&&a.status!=='INVITED')throw invalid();return {userId:string(a.userId),fullName:string(a.fullName),email:string(a.email),status:a.status}})}
}
export function readUnitAdminAssignment(value:unknown):UnitAdminAssignment {
  const v=object(value);return {userId:string(v.userId),unitId:string(v.unitId)}
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
