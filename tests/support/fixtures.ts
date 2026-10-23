import type { AdminOverview, Session } from '../../src/shared/api/contracts'
export const school = { id: '11111111-1111-4111-8111-111111111111', name: 'Escola de teste', timezone: 'America/Sao_Paulo' }
export const session: Session = { user: { id: '22222222-2222-4222-8222-222222222222', email: 'admin@school.example', status: 'ACTIVE' }, school,
  roles: ['SCHOOL_ADMIN'], permissions: ['school_admin_overview.read'], experiences: { admin: true, teacher: false } }
export const authenticated = { status: 'authenticated' as const, user: { ...session.user, schoolId: school.id } }
export const selection = { status: 'school_selection_required' as const, challengeToken: 'opaque-test-challenge', schools: [{ id: school.id, name: school.name }, { id: '33333333-3333-4333-8333-333333333333', name: 'Outra escola de teste' }] }
const codes = ['school_units', 'academic_year', 'classes', 'teachers', 'students', 'guardians']
export function overview(kind: 'empty' | 'partial' | 'configured' = 'empty'): AdminOverview {
  return { school,
    academicYear: kind === 'empty' ? { hasCurrent: false, current: null } : { hasCurrent: true, current: { id: '44444444-4444-4444-8444-444444444444', year: 2001, startDate: '2001-01-01', endDate: '2099-12-31' } },
    setup: { progress: kind === 'empty' ? 0 : kind === 'partial' ? 50 : 100, steps: codes.map((code, index) => ({ code, status: kind === 'empty' ? 'not_started' : kind === 'partial' && index >= 2 && index <= 4 ? 'attention' : 'complete' })) },
    counts: kind === 'empty' ? { units: 0, classes: 0, teachers: 0, students: 0, guardians: 0 } : { units: 1, classes: 2, teachers: 2, students: 2, guardians: 2 },
    alerts: kind === 'empty' ? [{ code: 'no_current_academic_year', severity: 'warning', count: 1, action: 'create_academic_year' }] : kind === 'partial' ? [
      { code: 'classes_without_teacher', severity: 'warning', count: 1, action: 'assign_teachers' },
      { code: 'students_without_guardian', severity: 'warning', count: 1, action: 'link_guardians' },
      { code: 'teachers_without_assignment', severity: 'warning', count: 1, action: 'assign_teachers' },
    ] : [],
    quickActions: kind === 'empty' ? ['create_unit', 'create_academic_year', 'add_teacher', 'add_student', 'add_guardian'] : kind === 'partial' ? ['assign_teachers', 'link_guardians'] : [],
  }
}
