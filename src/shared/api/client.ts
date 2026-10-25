import { resolveBffBaseUrl } from './config'
import { ApiError } from './errors'
import { readClassWorkspace, readAuthenticated, readErrorCode, readLogin, readOverview, readSession, readUnits, readUnit, readUnitDetails, readUnitAdminInvite, readAvailableUnitAdmins, readAssignedUnitAdmins, readUnitAdminAssignment, readAcademicYears, readAcademicYear, readGradeLevels, readGradeLevel, readClassrooms, readClassroom, readSubjects, readSubject, readTeachers, readTeacher, readTeacherAssignments, readTeacherAssignment, readTeacherUsers, readTeacherOnboarding, readUnitOverview, readStudents, readStudent, readStudentWithEnrollment, readEnrollments, readEnrollment, readGuardians, readGuardian, readGuardianWithLink, readStudentGuardians, readStudentGuardian } from './validation'
import type { AcademicYearInput, GradeLevelInput, ClassroomInput, ClassroomPatch, SubjectInput, TeacherInput, TeacherAssignmentInput, TeacherAssignmentDatesPatch, StudentInput, EnrollmentInput, GuardianInput, StudentGuardianInput, UnitInput } from './contracts'

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
    gradeLevels: (signal:AbortSignal) => request('/admin/grade-levels','GET',readGradeLevels,signal),
    createGradeLevel: (input:GradeLevelInput,signal:AbortSignal) => request('/admin/grade-levels','POST',readGradeLevel,signal,input,201),
    updateGradeLevel: (gradeLevelId:string,input:GradeLevelInput,signal:AbortSignal) => request(`/admin/grade-levels/${encodeURIComponent(gradeLevelId)}`,'PATCH',readGradeLevel,signal,input),
    subjects: (signal:AbortSignal) => request('/admin/subjects','GET',readSubjects,signal),
    createSubject: (input:SubjectInput,signal:AbortSignal) => request('/admin/subjects','POST',readSubject,signal,input,201),
    updateSubject: (subjectId:string,input:SubjectInput,signal:AbortSignal) => request(`/admin/subjects/${encodeURIComponent(subjectId)}`,'PATCH',readSubject,signal,input),
    unitSubjects: (unitId:string,signal:AbortSignal) => request(`/unit/${encodeURIComponent(unitId)}/subjects`,'GET',readSubjects,signal),
    teachers: (signal:AbortSignal) => request('/admin/teachers','GET',readTeachers,signal),
    teacher: (teacherId:string,signal:AbortSignal) => request(`/admin/teachers/${encodeURIComponent(teacherId)}`,'GET',readTeacher,signal),
    createTeacher: (input:TeacherInput,signal:AbortSignal) => request('/admin/teachers','POST',readTeacher,signal,input,201),
    updateTeacher: (teacherId:string,input:TeacherInput,signal:AbortSignal) => request(`/admin/teachers/${encodeURIComponent(teacherId)}`,'PATCH',readTeacher,signal,input),
    unitTeachers: (unitId:string,signal:AbortSignal) => request(`/unit/${encodeURIComponent(unitId)}/teachers`,'GET',readTeachers,signal),
    unitTeacher: (unitId:string,teacherId:string,signal:AbortSignal) => request(`/unit/${encodeURIComponent(unitId)}/teachers/${encodeURIComponent(teacherId)}`,'GET',readTeacher,signal),
    teacherAssignments: (signal:AbortSignal) => request('/admin/teacher-assignments','GET',readTeacherAssignments,signal),
    createTeacherAssignment: (input:TeacherAssignmentInput,signal:AbortSignal) => request('/admin/teacher-assignments','POST',readTeacherAssignment,signal,input,201),
    updateTeacherAssignmentDates: (assignmentId:string,input:TeacherAssignmentDatesPatch,signal:AbortSignal) => request(`/admin/teacher-assignments/${encodeURIComponent(assignmentId)}`,'PATCH',readTeacherAssignment,signal,input),
    unitTeacherAssignments: (unitId:string,signal:AbortSignal) => request(`/unit/${encodeURIComponent(unitId)}/teacher-assignments`,'GET',readTeacherAssignments,signal),
    createUnitTeacherAssignment: (unitId:string,input:TeacherAssignmentInput,signal:AbortSignal) => request(`/unit/${encodeURIComponent(unitId)}/teacher-assignments`,'POST',readTeacherAssignment,signal,input,201),
    updateUnitTeacherAssignmentDates: (unitId:string,assignmentId:string,input:TeacherAssignmentDatesPatch,signal:AbortSignal) => request(`/unit/${encodeURIComponent(unitId)}/teacher-assignments/${encodeURIComponent(assignmentId)}`,'PATCH',readTeacherAssignment,signal,input),
    teacherUsers: (signal:AbortSignal) => request('/admin/teacher-users','GET',readTeacherUsers,signal),
    onboardTeacher: (input:{teacherId:string;email:string},signal:AbortSignal) => request('/admin/teacher-onboarding','POST',readTeacherOnboarding,signal,input,201),
    students: (signal:AbortSignal) => request('/admin/students','GET',readStudents,signal),
    createStudent: (input:StudentInput,signal:AbortSignal) => request('/admin/students','POST',readStudent,signal,input,201),
    updateStudent: (studentId:string,input:StudentInput,signal:AbortSignal) => request(`/admin/students/${encodeURIComponent(studentId)}`,'PATCH',readStudent,signal,input),
    unitStudents: (unitId:string,signal:AbortSignal) => request(`/unit/${encodeURIComponent(unitId)}/students`,'GET',readStudents,signal),
    createUnitStudent: (unitId:string,input:{student:StudentInput;enrollment:Omit<EnrollmentInput,'studentId'>},signal:AbortSignal) => request(`/unit/${encodeURIComponent(unitId)}/students`,'POST',readStudentWithEnrollment,signal,input,201),
    updateUnitStudent: (unitId:string,studentId:string,input:StudentInput,signal:AbortSignal) => request(`/unit/${encodeURIComponent(unitId)}/students/${encodeURIComponent(studentId)}`,'PATCH',readStudent,signal,input),
    enrollments: (signal:AbortSignal) => request('/admin/enrollments','GET',readEnrollments,signal),
    createEnrollment: (input:EnrollmentInput,signal:AbortSignal) => request('/admin/enrollments','POST',readEnrollment,signal,input,201),
    unitEnrollments: (unitId:string,signal:AbortSignal) => request(`/unit/${encodeURIComponent(unitId)}/enrollments`,'GET',readEnrollments,signal),
    guardians: (signal:AbortSignal) => request('/admin/guardians','GET',readGuardians,signal),
    createGuardian: (input:GuardianInput,signal:AbortSignal) => request('/admin/guardians','POST',readGuardian,signal,input,201),
    unitGuardians: (unitId:string,signal:AbortSignal) => request(`/unit/${encodeURIComponent(unitId)}/guardians`,'GET',readGuardians,signal),
    createUnitGuardian: (unitId:string,input:{guardian:GuardianInput;link:Omit<StudentGuardianInput,'guardianId'>},signal:AbortSignal) => request(`/unit/${encodeURIComponent(unitId)}/guardians`,'POST',readGuardianWithLink,signal,input,201),
    studentGuardians: (signal:AbortSignal) => request('/admin/student-guardians','GET',readStudentGuardians,signal),
    createStudentGuardian: (input:StudentGuardianInput,signal:AbortSignal) => request('/admin/student-guardians','POST',readStudentGuardian,signal,input,201),
    unitStudentGuardians: (unitId:string,signal:AbortSignal) => request(`/unit/${encodeURIComponent(unitId)}/student-guardians`,'GET',readStudentGuardians,signal),
    createUnitStudentGuardian: (unitId:string,input:StudentGuardianInput,signal:AbortSignal) => request(`/unit/${encodeURIComponent(unitId)}/student-guardians`,'POST',readStudentGuardian,signal,input,201),
    classrooms: (signal:AbortSignal) => request('/admin/classes','GET',readClassrooms,signal),
    classWorkspace: (classId:string,signal:AbortSignal) => request(`/admin/classes/${encodeURIComponent(classId)}/workspace`,'GET',readClassWorkspace,signal),
    unitClassWorkspace: (unitId:string,classId:string,signal:AbortSignal) => request(`/unit/${encodeURIComponent(unitId)}/classes/${encodeURIComponent(classId)}/workspace`,'GET',readClassWorkspace,signal),
    createClassroom: (input:ClassroomInput,signal:AbortSignal) => request('/admin/classes','POST',readClassroom,signal,input,201),
    updateClassroom: (classId:string,input:ClassroomPatch,signal:AbortSignal) => request(`/admin/classes/${encodeURIComponent(classId)}`,'PATCH',readClassroom,signal,input),
    unitGradeLevels: (unitId:string,signal:AbortSignal) => request(`/unit/${encodeURIComponent(unitId)}/grade-levels`,'GET',readGradeLevels,signal),
    unitClassrooms: (unitId:string,signal:AbortSignal) => request(`/unit/${encodeURIComponent(unitId)}/classes`,'GET',readClassrooms,signal),
    createUnitClassroom: (unitId:string,input:ClassroomInput,signal:AbortSignal) => request(`/unit/${encodeURIComponent(unitId)}/classes`,'POST',readClassroom,signal,input,201),
    updateUnitClassroom: (unitId:string,classId:string,input:ClassroomPatch,signal:AbortSignal) => request(`/unit/${encodeURIComponent(unitId)}/classes/${encodeURIComponent(classId)}`,'PATCH',readClassroom,signal,input),
    units: (signal:AbortSignal) => request('/admin/units','GET',readUnits,signal),
    unitDetails: (unitId:string,signal:AbortSignal) => request(`/admin/units/${encodeURIComponent(unitId)}`,'GET',readUnitDetails,signal),
    assignedUnitAdmins: (unitId:string,signal:AbortSignal) => request(`/admin/units/${encodeURIComponent(unitId)}/unit-admins`,'GET',readAssignedUnitAdmins,signal),
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
