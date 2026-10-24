/** Public BFF DTOs, audited against the sibling BFF's handlers and view models. */
export interface School { id: string; name: string; timezone: string }
export interface SchoolOption { id: string; name: string }
export interface Authenticated {
  status: 'authenticated'
  user: { id: string; schoolId: string; email: string; status: 'ACTIVE' }
}
export interface SchoolSelection {
  status: 'school_selection_required'
  challengeToken: string
  schools: SchoolOption[]
}
export type LoginResult = Authenticated | SchoolSelection
export interface Session {
  user: { id: string; email: string; status: 'ACTIVE' }
  school: School
  roles: string[]
  permissions: string[]
  unitScopes?: { unitId: string; role: 'UNIT_ADMIN' }[]
  experiences: { admin: boolean; teacher: boolean; unitAdmin?: boolean }
}
export interface UnitOption { id: string; name: string; city?: string; state?: string }
export interface UnitOverview {
  unit: { id: string; name: string }
  academicYear: { hasCurrent: boolean; current: null | { id: string; year: number; startDate: string; endDate: string } }
  counts: { classes: number; teachers: number; students: number; guardians: number }
}
export interface AcademicYear { id: string; year: number; startDate: string; endDate: string; createdAt: string; updatedAt: string }
export type AcademicYearInput = Pick<AcademicYear, 'year' | 'startDate' | 'endDate'>
export interface UnitInput {
  name: string; city: string; state: string; countryCode: string
  code?: string | null; documentNumber?: string | null; street?: string | null
  addressNumber?: string | null; complement?: string | null; district?: string | null
  postalCode?: string | null; timezone?: string | null
}
export interface AvailableUnitAdmin { userId: string; fullName: string; email: string; status: 'ACTIVE' | 'INVITED' }
export interface UnitAdminAssignment { userId: string; unitId: string }
export interface UnitAdminInvite { userId: string; email: string; status: 'INVITED'; unitIds: string[]; invitation: { status: 'sent' | 'pending' } }
export type StepStatus = 'complete' | 'attention' | 'not_started'
export interface SetupStep { code: string; status: StepStatus }
export interface OverviewAlert { code: string; severity: 'warning'; count: number; action?: string }
export interface AdminOverview {
  school: School
  academicYear: { hasCurrent: boolean; current: null | { id: string; year: number; startDate: string; endDate: string } }
  setup: { progress: number; steps: SetupStep[] }
  counts: { units: number; classes: number; teachers: number; students: number; guardians: number }
  alerts: OverviewAlert[]
  quickActions: string[]
}
