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
  experiences: { admin: boolean; teacher: boolean }
}
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
