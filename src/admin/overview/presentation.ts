import type { OverviewAlert } from '../../shared/api/contracts'
import type { IconName } from '../../shared/components/Icon'

const steps: Record<string, { label: string; description: string; icon: IconName }> = {
  school_units: { label: 'Unidades', description: 'Estrutura das unidades da sua escola.', icon: 'school' },
  academic_year: { label: 'Ano letivo', description: 'Período de funcionamento acadêmico.', icon: 'calendar' },
  classes: { label: 'Turmas', description: 'Organização das turmas e seus professores.', icon: 'people' },
  teachers: { label: 'Professores', description: 'Equipe docente e suas atribuições.', icon: 'teacher' },
  students: { label: 'Alunos', description: 'Alunos e seus vínculos com responsáveis.', icon: 'student' },
  guardians: { label: 'Responsáveis', description: 'Responsáveis pelos alunos da escola.', icon: 'guardians' },
}
export const stepPresentation = (code: string) => Object.hasOwn(steps, code) ? steps[code] : { label: 'Configuração adicional', description: 'Etapa informada pela escola.', icon: 'school' as const }
export function alertPresentation(alert: OverviewAlert): { title: string; description: string; icon: IconName } {
  const count = alert.count.toLocaleString('pt-BR')
  switch (alert.code) {
    case 'no_current_academic_year': return { title: 'Nenhum ano letivo vigente', description: 'Sua escola ainda não possui um ano letivo vigente.', icon: 'calendar' }
    case 'classes_without_teacher': return { title: `${count} ${alert.count === 1 ? 'turma sem professor' : 'turmas sem professor'}`, description: 'Há turmas sem professor atribuído.', icon: 'people' }
    case 'students_without_guardian': return { title: `${count} ${alert.count === 1 ? 'aluno sem responsável' : 'alunos sem responsável'}`, description: 'Há alunos sem um responsável vinculado.', icon: 'student' }
    case 'teachers_without_assignment': return { title: `${count} ${alert.count === 1 ? 'professor sem atribuição' : 'professores sem atribuição'}`, description: 'Há professores sem uma turma atribuída.', icon: 'teacher' }
    default: return { title: 'Pendência de configuração', description: `${count} ocorrência(s) informada(s) pela escola.`, icon: 'alert' }
  }
}
// Expose only destinations backed by an implemented School Web flow.
const actionRoutes = new Map<string, string>([['create_unit', '/admin/units'], ['create_academic_year', '/admin/academic-years'], ['create_class', '/admin/academic-structure?tab=turmas'], ['add_teacher','/admin/teachers'], ['assign_teachers','/admin/teachers'], ['add_student','/admin/students']])
export function actionDestination(code: string): string | undefined { return actionRoutes.get(code) }
export function actionLabel(code: string): string { return code === 'create_unit' ? 'Cadastrar unidade' : code === 'create_academic_year' ? 'Cadastrar ano letivo' : code === 'create_class' ? 'Cadastrar turma' : code === 'add_teacher' ? 'Cadastrar professor' : code === 'assign_teachers' ? 'Vincular professores às turmas' : code }
