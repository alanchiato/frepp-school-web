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
export interface UnitDetails extends UnitOption {
  status: 'ACTIVE' | 'INACTIVE'; code: string | null; documentNumber: string | null
  street: string | null; addressNumber: string | null; complement: string | null
  district: string | null; city: string; state: string; postalCode: string | null
  countryCode: string; timezone: string | null
}
export interface UnitOverview {
  unit: { id: string; name: string }
  academicYear: { hasCurrent: boolean; current: null | { id: string; year: number; startDate: string; endDate: string } }
  counts: { classes: number; teachers: number; students: number; guardians: number }
}
export interface AcademicYear { id: string; year: number; startDate: string; endDate: string; createdAt: string; updatedAt: string }
export type AcademicYearInput = Pick<AcademicYear, 'year' | 'startDate' | 'endDate'>
export interface GradeLevel { id: string; code: string; name: string; displayOrder: number; createdAt: string; updatedAt: string }
export type GradeLevelInput = Pick<GradeLevel, 'code' | 'name' | 'displayOrder'>
export interface Subject { id: string; code: string; name: string; createdAt: string; updatedAt: string }
export type SubjectInput = Pick<Subject, 'code' | 'name'>
export interface Teacher { id: string; name: string; email: string | null; createdAt: string; updatedAt: string }
export type TeacherInput = { name: string; email: string | null }
export type TeacherRole = 'REGENT_TEACHER' | 'SUBJECT_TEACHER' | 'SUBSTITUTE_TEACHER'
export interface TeacherAssignment { id: string; teacherId: string; classId: string; subjectId: string | null; role: TeacherRole; startDate: string; endDate: string | null; status: 'ACTIVE' | 'SCHEDULED' | 'ENDED' | 'CANCELLED'; createdAt: string; updatedAt: string }
export type TeacherAssignmentInput = { teacherId: string; classId: string; subjectId: string | null; role: TeacherRole; startDate: string; endDate?: string | null }
export type TeacherAssignmentDatesPatch = { startDate: string; endDate: string | null }
export interface Student { id:string; fullName:string; preferredName:string|null; birthDate:string|null; documentNumber:string|null; status:'ACTIVE'|'INACTIVE'; createdAt:string; updatedAt:string }
export type StudentInput = { fullName:string; preferredName?:string|null; birthDate?:string|null; documentNumber?:string|null; status?:Student['status'] }
export interface Enrollment { id:string; studentId:string; classId:string; startDate:string; endDate:string|null; status:'ACTIVE'|'TRANSFERRED'|'COMPLETED'|'CANCELLED'; createdAt:string; updatedAt:string }
export type EnrollmentInput = { studentId:string; classId:string; startDate:string; endDate?:string|null }
export interface Guardian { id:string; fullName:string; preferredName:string|null; documentNumber:string|null; email:string|null; phone:string|null; status:'ACTIVE'|'INACTIVE'; createdAt:string; updatedAt:string }
export type GuardianInput = { fullName:string; preferredName?:string|null; documentNumber?:string|null; email?:string|null; phone?:string|null }
export interface GuardianFamilySummary { guardian:Guardian; linkedStudents:number }
export interface GuardianFamilyPage { items:GuardianFamilySummary[]; page:number; pageSize:number; total:number; withLinks:number; withoutLinks:number }
export interface GuardianFamilyStudent { id:string; studentId:string; studentName:string; relationship:string; isLegalGuardian:boolean; isPrimaryContact:boolean; isFinancialResponsible:boolean; status:'ACTIVE'|'INACTIVE'; unitId:string|null; unitName:string|null; className:string|null; updatedAt:string }
export interface GuardianFamilyAccess { identityStatus:'NOT_CONFIGURED'|'INVITED'|'ACTIVE'|'INACTIVE'; invitationStatus:'NONE'|'PENDING'|'EXPIRED'; loginEmail:string|null }
export interface GuardianFamilyDetail { guardian:Guardian; students:GuardianFamilyStudent[]; access:GuardianFamilyAccess }
export interface StudentGuardian { id:string; studentId:string; guardianId:string; relationship:string; isLegalGuardian:boolean; isPrimaryContact:boolean; isFinancialResponsible:boolean; status:'ACTIVE'|'INACTIVE'; createdAt:string; updatedAt:string }
export type StudentGuardianInput = { studentId:string; guardianId:string; relationship:string; isLegalGuardian?:boolean; isPrimaryContact?:boolean; isFinancialResponsible?:boolean }
export interface TeacherUser { userId: string; teacherId: string }
export interface TeacherOnboarding { profileType: 'TEACHER'; profileId: string; userId: string; email: string; userStatus: 'INVITED' | 'ACTIVE'; role: 'TEACHER'; activation: 'invitation_sent' | 'invitation_pending' | 'not_required' }
export interface GuardianOnboarding { profileType: 'GUARDIAN'; profileId: string; userId: string; email: string; userStatus: 'INVITED' | 'ACTIVE'; role: 'GUARDIAN'; activation: 'invitation_sent' | 'invitation_pending' | 'not_required' }
export interface Classroom { id: string; schoolUnitId: string; academicYearId: string; gradeLevelId: string | null; name: string; createdAt: string; updatedAt: string }
export interface ClassWorkspace {
  class: Classroom; unitName: string; academicYear: number; gradeLevelName: string | null
  students: { id: string; fullName: string; preferredName: string | null; enrollmentId: string; startDate: string }[]
  teachers: { id: string; name: string; assignmentId: string; role: 'REGENT_TEACHER' | 'SUBJECT_TEACHER' | 'SUBSTITUTE_TEACHER'; subjectId: string | null; subjectName: string | null; startDate: string; endDate: string | null }[]
  subjects: { id: string; name: string; teacherIds: string[] }[]
  counts: { students: number; teachers: number; subjects: number }
}
export type ClassroomInput = { schoolUnitId: string; academicYearId: string; gradeLevelId: string; name: string }
export type ClassroomPatch = { gradeLevelId?: string; name?: string }
export interface UnitInput {
  name: string; city: string; state: string; countryCode: string
  code?: string | null; documentNumber?: string | null; street?: string | null
  addressNumber?: string | null; complement?: string | null; district?: string | null
  postalCode?: string | null; timezone?: string | null
}
export interface AvailableUnitAdmin { userId: string; fullName: string; email: string; status: 'ACTIVE' | 'INVITED' }
export interface AssignedUnitAdmin { userId: string; fullName: string; email: string; status: 'ACTIVE' | 'INVITED' | 'INACTIVE' }
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
