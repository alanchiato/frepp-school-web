import { resolveBffBaseUrl } from './config'
import { ApiError } from './errors'
import { readAuthenticated, readErrorCode, readLogin, readOverview, readSession, readUnits, readUnit, readUnitAdminInvite, readAvailableUnitAdmins, readUnitAdminAssignment, readAcademicYears, readAcademicYear, readUnitOverview } from './validation'
import type { AcademicYearInput, UnitInput } from './contracts'

export function createBffClient(base: string | undefined) {
  const baseUrl = resolveBffBaseUrl(base)
  async function request<T>(path: string, method: 'GET' | 'POST' | 'PATCH', read: (value: unknown) => T, signal: AbortSignal, body?: object, expectedStatus=200): Promise<T> {
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
    if (response.status !== (path === '/auth/logout' ? 204 : expectedStatus)) throw new ApiError(502, 'invalid_response')
    return read(value)
  }
  return {
    login: (input: { email: string; password: string }, signal: AbortSignal) => request('/auth/login', 'POST', readLogin, signal, input),
    selectSchool: (input: { challengeToken: string; schoolId: string }, signal: AbortSignal) => request('/auth/select-school', 'POST', readAuthenticated, signal, input),
    session: (signal: AbortSignal) => request('/session', 'GET', readSession, signal),
    logout: (signal: AbortSignal) => request('/auth/logout', 'POST', () => undefined, signal),
    overview: (signal: AbortSignal) => request('/admin/overview', 'GET', readOverview, signal),
    academicYears: (signal:AbortSignal) => request('/admin/academic-years','GET',readAcademicYears,signal),
    academicYear: (yearId:string,signal:AbortSignal) => request(`/admin/academic-years/${encodeURIComponent(yearId)}`,'GET',readAcademicYear,signal),
    createAcademicYear: (input:AcademicYearInput,signal:AbortSignal) => request('/admin/academic-years','POST',readAcademicYear,signal,input,201),
    updateAcademicYear: (yearId:string,input:Partial<AcademicYearInput>,signal:AbortSignal) => request(`/admin/academic-years/${encodeURIComponent(yearId)}`,'PATCH',readAcademicYear,signal,input),
    units: (signal:AbortSignal) => request('/admin/units','GET',readUnits,signal),
    assignedUnits: (signal:AbortSignal) => request('/unit/units','GET',readUnits,signal),
    unitOverview: (unitId:string,signal:AbortSignal) => request(`/unit-overview/${encodeURIComponent(unitId)}`,'GET',readUnitOverview,signal),
    unitAcademicYears: (unitId:string,signal:AbortSignal) => request(`/unit/${encodeURIComponent(unitId)}/academic-years`,'GET',readAcademicYears,signal),
    createUnit: (input:UnitInput,signal:AbortSignal) => request('/admin/units','POST',readUnit,signal,input,201),
    inviteUnitAdmin: (input:{fullName:string;email:string;unitIds:string[]},signal:AbortSignal) => request('/admin/unit-admins','POST',readUnitAdminInvite,signal,input,201),
    availableUnitAdmins: (unitId:string,signal:AbortSignal) => request(`/admin/units/${encodeURIComponent(unitId)}/available-admins`,'GET',readAvailableUnitAdmins,signal),
    assignUnitAdmin: (unitId:string,userId:string,signal:AbortSignal) => request(`/admin/units/${encodeURIComponent(unitId)}/unit-admins`,'POST',readUnitAdminAssignment,signal,{userId},201),
  }
}
export type BffClient = ReturnType<typeof createBffClient>
