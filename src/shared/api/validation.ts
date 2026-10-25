import type { AcademicYear, GradeLevel, Classroom, ClassWorkspace, Subject, Teacher, TeacherAssignment, TeacherOnboarding, TeacherUser, Student, Enrollment, Guardian, StudentGuardian, AdminOverview, Authenticated, LoginResult, OverviewAlert, School, Session, SetupStep, UnitOption, UnitDetails, UnitAdminInvite, AvailableUnitAdmin, AssignedUnitAdmin, UnitAdminAssignment, UnitOverview } from './contracts'
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
function gradeLevel(value: unknown): GradeLevel {
  const v=object(value);return {id:string(v.id),code:string(v.code),name:string(v.name),displayOrder:number(v.displayOrder),createdAt:string(v.createdAt),updatedAt:string(v.updatedAt)}
}
export function readGradeLevels(value: unknown): {gradeLevels:GradeLevel[]} {return {gradeLevels:array(object(value).gradeLevels,gradeLevel)}}
export function readGradeLevel(value: unknown): {gradeLevel:GradeLevel} {return {gradeLevel:gradeLevel(object(value).gradeLevel)}}
function subject(value: unknown): Subject {
  const v=object(value);return {id:string(v.id),code:string(v.code),name:string(v.name),createdAt:string(v.createdAt),updatedAt:string(v.updatedAt)}
}
export function readSubjects(value: unknown): {subjects:Subject[]} {return {subjects:array(object(value).subjects,subject)}}
export function readSubject(value: unknown): {subject:Subject} {return {subject:subject(object(value).subject)}}
function teacher(value: unknown): Teacher {
  const v=object(value);return {id:string(v.id),name:string(v.name),email:v.email===null?null:string(v.email),createdAt:string(v.createdAt),updatedAt:string(v.updatedAt)}
}
export function readTeachers(value: unknown): {teachers:Teacher[]} {return {teachers:array(object(value).teachers,teacher)}}
export function readTeacher(value: unknown): {teacher:Teacher} {return {teacher:teacher(object(value).teacher)}}
function teacherAssignment(value: unknown): TeacherAssignment {
  const v=object(value)
  if (!['REGENT_TEACHER','SUBJECT_TEACHER','SUBSTITUTE_TEACHER'].includes(String(v.role)) || !['ACTIVE','SCHEDULED','ENDED','CANCELLED'].includes(String(v.status))) throw invalid()
  return {id:string(v.id),teacherId:string(v.teacherId),classId:string(v.classId),subjectId:v.subjectId===null?null:string(v.subjectId),role:v.role as TeacherAssignment['role'],startDate:date(v.startDate),endDate:v.endDate===null?null:date(v.endDate),status:v.status as TeacherAssignment['status'],createdAt:string(v.createdAt),updatedAt:string(v.updatedAt)}
}
export function readTeacherAssignments(value: unknown): {teacherAssignments:TeacherAssignment[]} {return {teacherAssignments:array(object(value).teacherAssignments,teacherAssignment)}}
export function readTeacherAssignment(value: unknown): {teacherAssignment:TeacherAssignment} {return {teacherAssignment:teacherAssignment(object(value).teacherAssignment)}}
export function readTeacherUsers(value: unknown): {teacherUsers:TeacherUser[]} {return {teacherUsers:array(object(value).teacherUsers,item=>{const v=object(item);return {userId:string(v.userId),teacherId:string(v.teacherId)}})}}
export function readTeacherOnboarding(value: unknown): {onboarding:TeacherOnboarding} {
  const v=object(object(value).onboarding)
  if (v.profileType!=='TEACHER'||v.role!=='TEACHER'||(v.userStatus!=='INVITED'&&v.userStatus!=='ACTIVE')||!['invitation_sent','invitation_pending','not_required'].includes(String(v.activation))) throw invalid()
  return {onboarding:{profileType:'TEACHER',profileId:string(v.profileId),userId:string(v.userId),email:string(v.email),userStatus:v.userStatus,role:'TEACHER',activation:v.activation as TeacherOnboarding['activation']}}
}
function student(value:unknown):Student {const v=object(value);if(v.status!=='ACTIVE'&&v.status!=='INACTIVE')throw invalid();return {id:string(v.id),fullName:string(v.fullName),preferredName:v.preferredName===null?null:string(v.preferredName),birthDate:v.birthDate===null?null:date(v.birthDate),documentNumber:v.documentNumber===null?null:string(v.documentNumber),status:v.status,createdAt:string(v.createdAt),updatedAt:string(v.updatedAt)}}
export function readStudents(value:unknown):{students:Student[]}{return {students:array(object(value).students,student)}}
export function readStudent(value:unknown):{student:Student}{return {student:student(object(value).student)}}
function enrollment(value:unknown):Enrollment{const v=object(value);if(!['ACTIVE','TRANSFERRED','COMPLETED','CANCELLED'].includes(String(v.status)))throw invalid();return {id:string(v.id),studentId:string(v.studentId),classId:string(v.classId),startDate:date(v.startDate),endDate:v.endDate===null?null:date(v.endDate),status:v.status as Enrollment['status'],createdAt:string(v.createdAt),updatedAt:string(v.updatedAt)}}
export function readEnrollments(value:unknown):{enrollments:Enrollment[]}{return {enrollments:array(object(value).enrollments,enrollment)}}
export function readEnrollment(value:unknown):{enrollment:Enrollment}{return {enrollment:enrollment(object(value).enrollment)}}
export function readStudentWithEnrollment(value:unknown):{student:Student;enrollment:Enrollment}{const v=object(value);return {student:student(v.student),enrollment:enrollment(v.enrollment)}}
function guardian(value:unknown):Guardian{const v=object(value);if(v.status!=='ACTIVE'&&v.status!=='INACTIVE')throw invalid();return {id:string(v.id),fullName:string(v.fullName),preferredName:v.preferredName===null?null:string(v.preferredName),documentNumber:v.documentNumber===null?null:string(v.documentNumber),email:v.email===null?null:string(v.email),phone:v.phone===null?null:string(v.phone),status:v.status,createdAt:string(v.createdAt),updatedAt:string(v.updatedAt)}}
export function readGuardians(value:unknown):{guardians:Guardian[]}{return {guardians:array(object(value).guardians,guardian)}}
export function readGuardian(value:unknown):{guardian:Guardian}{return {guardian:guardian(object(value).guardian)}}
function studentGuardian(value:unknown):StudentGuardian{const v=object(value);if(v.status!=='ACTIVE'&&v.status!=='INACTIVE')throw invalid();return {id:string(v.id),studentId:string(v.studentId),guardianId:string(v.guardianId),relationship:string(v.relationship),isLegalGuardian:boolean(v.isLegalGuardian),isPrimaryContact:boolean(v.isPrimaryContact),isFinancialResponsible:boolean(v.isFinancialResponsible),status:v.status,createdAt:string(v.createdAt),updatedAt:string(v.updatedAt)}}
export function readStudentGuardians(value:unknown):{studentGuardians:StudentGuardian[]}{return {studentGuardians:array(object(value).studentGuardians,studentGuardian)}}
export function readStudentGuardian(value:unknown):{studentGuardian:StudentGuardian}{return {studentGuardian:studentGuardian(object(value).studentGuardian)}}
export function readGuardianWithLink(value:unknown):{guardian:Guardian;studentGuardian:StudentGuardian}{const v=object(value);return {guardian:guardian(v.guardian),studentGuardian:studentGuardian(v.studentGuardian)}}
function classroom(value: unknown): Classroom {
  const v=object(value);return {id:string(v.id),schoolUnitId:string(v.schoolUnitId),academicYearId:string(v.academicYearId),gradeLevelId:v.gradeLevelId===null?null:string(v.gradeLevelId),name:string(v.name),createdAt:string(v.createdAt),updatedAt:string(v.updatedAt)}
}
export function readClassrooms(value: unknown): {classes:Classroom[]} {return {classes:array(object(value).classes,classroom)}}
export function readClassroom(value: unknown): {class:Classroom} {return {class:classroom(object(value).class)}}
export function readClassWorkspace(value: unknown): {workspace:ClassWorkspace} {
  const v=object(object(value).workspace), counts=object(v.counts)
  return {workspace:{class:classroom(v.class),unitName:string(v.unitName),academicYear:year(v.academicYear),gradeLevelName:v.gradeLevelName===null?null:string(v.gradeLevelName),
    students:array(v.students,item=>{const s=object(item);return {id:string(s.id),fullName:string(s.fullName),preferredName:s.preferredName===null?null:string(s.preferredName),enrollmentId:string(s.enrollmentId),startDate:date(s.startDate)}}),
    teachers:array(v.teachers,item=>{const t=object(item),role=string(t.role);if(!['REGENT_TEACHER','SUBJECT_TEACHER','SUBSTITUTE_TEACHER'].includes(role))throw invalid();return {id:string(t.id),name:string(t.name),assignmentId:string(t.assignmentId),role:role as ClassWorkspace['teachers'][number]['role'],subjectId:t.subjectId===null?null:string(t.subjectId),subjectName:t.subjectName===null?null:string(t.subjectName),startDate:date(t.startDate),endDate:t.endDate===null?null:date(t.endDate)}}),
    subjects:array(v.subjects,item=>{const s=object(item);return {id:string(s.id),name:string(s.name),teacherIds:array(s.teacherIds,string)}}),
    counts:{students:number(counts.students),teachers:number(counts.teachers),subjects:number(counts.subjects)}}}
}
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
export function readUnitDetails(value:unknown): {unit:UnitDetails} {
  const v=object(value);const u=object(v.unit)
  if(u.status!=='ACTIVE'&&u.status!=='INACTIVE')throw invalid()
  const nullable=(value:unknown)=>value===null?null:string(value)
  return {unit:{id:string(u.id),name:string(u.name),status:u.status,code:nullable(u.code),documentNumber:nullable(u.documentNumber),street:nullable(u.street),addressNumber:nullable(u.addressNumber),complement:nullable(u.complement),district:nullable(u.district),city:string(u.city),state:string(u.state),postalCode:nullable(u.postalCode),countryCode:string(u.countryCode),timezone:nullable(u.timezone)}}
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
export function readAssignedUnitAdmins(value:unknown): {admins:AssignedUnitAdmin[]} {
  const v=object(value)
  return {admins:array(v.admins,item=>{const a=object(item);if(a.status!=='ACTIVE'&&a.status!=='INVITED'&&a.status!=='INACTIVE')throw invalid();return {userId:string(a.userId),fullName:string(a.fullName),email:string(a.email),status:a.status}})}
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
