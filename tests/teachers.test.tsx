import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TeachersPage } from '../src/admin/teachers/TeachersPage'
import { UnitScopeProvider } from '../src/admin/unitadmins/UnitScopeContext'
import { SessionContext, type SessionContextValue } from '../src/session/context'
import type { BffClient } from '../src/shared/api/client'

const unit={id:'11111111-1111-4111-8111-111111111111',name:'Centro'}
const teacher={id:'22222222-2222-4222-8222-222222222222',name:'Mariana Costa',email:'mariana@escola.test',createdAt:'2026-10-25T12:00:00Z',updatedAt:'2026-10-25T12:00:00Z'}
const classroom={id:'55555555-5555-4555-8555-555555555555',schoolUnitId:unit.id,academicYearId:'66666666-6666-4666-8666-666666666666',gradeLevelId:'77777777-7777-4777-8777-777777777777',name:'Turma A',createdAt:teacher.createdAt,updatedAt:teacher.updatedAt}
const subject={id:'88888888-8888-4888-8888-888888888888',code:'MAT',name:'Matemática',createdAt:teacher.createdAt,updatedAt:teacher.updatedAt}
const grade={id:classroom.gradeLevelId,code:'1ANO',name:'1º Ano',displayOrder:1,createdAt:teacher.createdAt,updatedAt:teacher.updatedAt}
const year={id:classroom.academicYearId,year:2026,startDate:'2026-01-01',endDate:'2026-12-31',createdAt:teacher.createdAt,updatedAt:teacher.updatedAt}
const emptyCatalog={teacherAssignments:[],classes:[],subjects:[],units:[unit],gradeLevels:[],academicYears:[],teacherUsers:[]}

function renderPage(api:Partial<BffClient>,unitAdmin=false,path='/admin/teachers'){
  const state={status:'authenticated',session:{user:{id:'33333333-3333-4333-8333-333333333333',email:'admin@escola.test'},school:{id:'44444444-4444-4444-8444-444444444444',name:'Escola',timezone:'America/Sao_Paulo'},permissions:unitAdmin?['teachers.read']:['teachers.read','teachers.create','teachers.update','teacher_assignments.read','teacher_assignments.create','teacher_users.read','teacher_onboarding.create']}}
  const context={api,invalidate:vi.fn(),state} as unknown as SessionContextValue
  return render(<MemoryRouter initialEntries={[path]}><SessionContext.Provider value={context}><UnitScopeProvider enabled={unitAdmin}><Routes><Route path="/admin/teachers" element={<TeachersPage />} /><Route path="/admin/teachers/:teacherId" element={<TeachersPage />} /></Routes></UnitScopeProvider></SessionContext.Provider></MemoryRouter>)
}

describe('Cadastro de professores',()=>{
  it('conta turmas distintas mesmo quando o professor leciona duas disciplinas na mesma turma',async()=>{
    const assignment={id:'99999999-9999-4999-8999-999999999999',teacherId:teacher.id,classId:classroom.id,subjectId:subject.id,role:'SUBJECT_TEACHER',startDate:'2026-02-03',endDate:null,status:'ACTIVE',createdAt:teacher.createdAt,updatedAt:teacher.updatedAt}
    const secondAssignment={...assignment,id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',subjectId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}
    const view=renderPage({teachers:vi.fn().mockResolvedValue({teachers:[teacher]}),teacherAssignments:vi.fn().mockResolvedValue({teacherAssignments:[assignment,secondAssignment]}),classrooms:vi.fn().mockResolvedValue({classes:[classroom]}),subjects:vi.fn().mockResolvedValue({subjects:[subject]}),units:vi.fn().mockResolvedValue({units:[unit]}),gradeLevels:vi.fn().mockResolvedValue({gradeLevels:[grade]}),academicYears:vi.fn().mockResolvedValue({academicYears:[year]}),teacherUsers:vi.fn().mockResolvedValue({teacherUsers:[]})})
    const row=within(await screen.findByRole('table')).getAllByRole('row')[1]
    expect(view.container.querySelectorAll('[data-person-avatar="small"]')).toHaveLength(1)
    expect(within(row).getAllByRole('cell')[2]).toHaveTextContent('1')
  })

  it('mostra os vínculos do perfil em tabela com contexto acadêmico e situação legível',async()=>{
    const assignment={id:'99999999-9999-4999-8999-999999999999',teacherId:teacher.id,classId:classroom.id,subjectId:subject.id,role:'SUBJECT_TEACHER',startDate:'2026-02-03',endDate:null,status:'ACTIVE',createdAt:teacher.createdAt,updatedAt:teacher.updatedAt}
    renderPage({teachers:vi.fn().mockResolvedValue({teachers:[teacher]}),teacherAssignments:vi.fn().mockResolvedValue({teacherAssignments:[assignment]}),classrooms:vi.fn().mockResolvedValue({classes:[classroom]}),subjects:vi.fn().mockResolvedValue({subjects:[subject]}),units:vi.fn().mockResolvedValue({units:[unit]}),gradeLevels:vi.fn().mockResolvedValue({gradeLevels:[grade]}),academicYears:vi.fn().mockResolvedValue({academicYears:[year]}),teacherUsers:vi.fn().mockResolvedValue({teacherUsers:[]})},false,`/admin/teachers/${teacher.id}`)
    const table=await screen.findByRole('table',{name:'Vínculos acadêmicos do professor'})
    expect(within(table).getByRole('columnheader',{name:'Série'})).toBeInTheDocument()
    const row=within(table).getAllByRole('row')[1]
    expect(within(row).getByText('1º Ano')).toBeInTheDocument()
    expect(within(row).getByText('Turma A')).toBeInTheDocument()
    expect(within(row).getByText('Matemática')).toBeInTheDocument()
    expect(within(row).getByText('Centro')).toBeInTheDocument()
    expect(within(row).getByText('03/02/2026')).toBeInTheDocument()
    expect(within(row).getByText('Ativo')).toBeInTheDocument()
  })

  it('edita a vigência de um vínculo existente e mantém a data final em aberto',async()=>{
    const assignment={id:'99999999-9999-4999-8999-999999999999',teacherId:teacher.id,classId:classroom.id,subjectId:subject.id,role:'SUBJECT_TEACHER',startDate:'2026-11-01',endDate:'2026-12-01',status:'ACTIVE',createdAt:teacher.createdAt,updatedAt:teacher.updatedAt}
    const updateTeacherAssignmentDates=vi.fn().mockResolvedValue({teacherAssignment:{...assignment,startDate:'2026-10-25',endDate:null}})
    renderPage({teachers:vi.fn().mockResolvedValue({teachers:[teacher]}),teacherAssignments:vi.fn().mockResolvedValue({teacherAssignments:[assignment]}),classrooms:vi.fn().mockResolvedValue({classes:[classroom]}),subjects:vi.fn().mockResolvedValue({subjects:[subject]}),units:vi.fn().mockResolvedValue({units:[unit]}),gradeLevels:vi.fn().mockResolvedValue({gradeLevels:[grade]}),academicYears:vi.fn().mockResolvedValue({academicYears:[year]}),teacherUsers:vi.fn().mockResolvedValue({teacherUsers:[]}),updateTeacherAssignmentDates},false,`/admin/teachers/${teacher.id}`)
    fireEvent.click(await screen.findByRole('button',{name:'Editar vigência'}))
    fireEvent.change(screen.getByLabelText('Data de início'),{target:{value:'2026-10-25'}})
    fireEvent.change(screen.getByLabelText('Data final (opcional)'),{target:{value:''}})
    fireEvent.click(screen.getByRole('button',{name:'Salvar vigência'}))
    await waitFor(()=>expect(updateTeacherAssignmentDates).toHaveBeenCalledWith(assignment.id,{startDate:'2026-10-25',endDate:null},expect.any(AbortSignal)))
    expect(await screen.findByText('Vigência do vínculo atualizada.')).toBeInTheDocument()
  })

  it('permite deixar vínculos e convite para depois e cadastra apenas o professor',async()=>{
    const createTeacher=vi.fn().mockResolvedValue({teacher})
    const createTeacherAssignment=vi.fn()
    const onboardTeacher=vi.fn()
    renderPage({teachers:vi.fn().mockResolvedValue({teachers:[]}),teacherAssignments:vi.fn().mockResolvedValue({teacherAssignments:emptyCatalog.teacherAssignments}),classrooms:vi.fn().mockResolvedValue({classes:[]}),subjects:vi.fn().mockResolvedValue({subjects:[]}),units:vi.fn().mockResolvedValue({units:[unit]}),gradeLevels:vi.fn().mockResolvedValue({gradeLevels:[]}),academicYears:vi.fn().mockResolvedValue({academicYears:[]}),teacherUsers:vi.fn().mockResolvedValue({teacherUsers:[]}),createTeacher,createTeacherAssignment,onboardTeacher})
    fireEvent.click(await screen.findByRole('button',{name:'Novo professor'}))
    const progress=screen.getByRole('list',{name:'Etapas do cadastro do professor'})
    const stages=within(progress).getAllByRole('listitem')
    expect(stages.map(item=>item.getAttribute('data-state'))).toEqual(['current','future','future','future'])
    expect(progress.parentElement?.querySelector<HTMLElement>('[class*="fill"]')?.style.width).toBe('0%')
    fireEvent.change(screen.getByLabelText('Nome completo'),{target:{value:'Mariana Costa'}})
    fireEvent.change(screen.getByLabelText('Email de contato (opcional)'),{target:{value:'mariana@escola.test'}})
    fireEvent.click(screen.getByRole('button',{name:'Próximo'}))
    expect(screen.getByRole('heading',{name:'Vínculos acadêmicos'})).toBeInTheDocument()
    expect(stages.map(item=>item.getAttribute('data-state'))).toEqual(['completed','current','future','future'])
    expect(progress.parentElement?.querySelector<HTMLElement>('[class*="fill"]')?.style.width).toBe('33.33333333333333%')
    await waitFor(()=>expect(screen.getByRole('heading',{name:'Vínculos acadêmicos'})).toHaveFocus())
    expect(screen.queryByRole('button',{name:'Próximo'})).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Deixar para depois'}))
    expect(screen.getByRole('heading',{name:'Acesso ao Frepp'})).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Revisar cadastro'}))
    expect(screen.getAllByText('Deixar para depois')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button',{name:'Cadastrar professor'}))
    await waitFor(()=>expect(createTeacher).toHaveBeenCalledWith({name:'Mariana Costa',email:'mariana@escola.test'},expect.any(AbortSignal)))
    expect(createTeacherAssignment).not.toHaveBeenCalled()
    expect(onboardTeacher).not.toHaveBeenCalled()
  })

  it('UNIT_ADMIN consulta professores da unidade sem cadastro global',async()=>{
    const unitTeachers=vi.fn().mockResolvedValue({teachers:[teacher]})
    renderPage({assignedUnits:vi.fn().mockResolvedValue({units:[unit]}),unitTeachers,unitTeacherAssignments:vi.fn().mockResolvedValue({teacherAssignments:[]}),unitClassrooms:vi.fn().mockResolvedValue({classes:[]}),unitSubjects:vi.fn().mockResolvedValue({subjects:[]}),unitGradeLevels:vi.fn().mockResolvedValue({gradeLevels:[]}),unitAcademicYears:vi.fn().mockResolvedValue({academicYears:[]})},true)
    expect(await screen.findByText('Mariana Costa')).toBeInTheDocument()
    expect(unitTeachers).toHaveBeenCalledWith(unit.id,expect.any(AbortSignal))
    expect(screen.queryByRole('button',{name:'Novo professor'})).not.toBeInTheDocument()
  })

  it('cria vínculo com turma e disciplina e só depois envia convite quando escolhidos',async()=>{
    const createTeacher=vi.fn().mockResolvedValue({teacher})
    const createTeacherAssignment=vi.fn().mockResolvedValue({teacherAssignment:{id:'99999999-9999-4999-8999-999999999999'}})
    const onboardTeacher=vi.fn().mockResolvedValue({onboarding:{activation:'invitation_sent'}})
    renderPage({teachers:vi.fn().mockResolvedValue({teachers:[]}),teacherAssignments:vi.fn().mockResolvedValue({teacherAssignments:[]}),classrooms:vi.fn().mockResolvedValue({classes:[classroom]}),subjects:vi.fn().mockResolvedValue({subjects:[subject]}),units:vi.fn().mockResolvedValue({units:[unit]}),gradeLevels:vi.fn().mockResolvedValue({gradeLevels:[grade]}),academicYears:vi.fn().mockResolvedValue({academicYears:[year]}),teacherUsers:vi.fn().mockResolvedValue({teacherUsers:[]}),createTeacher,createTeacherAssignment,onboardTeacher})
    fireEvent.click(await screen.findByRole('button',{name:'Novo professor'}))
    fireEvent.change(screen.getByLabelText('Nome completo'),{target:{value:'Mariana Costa'}})
    fireEvent.change(screen.getByLabelText('Email de contato (opcional)'),{target:{value:'mariana@escola.test'}})
    fireEvent.click(screen.getByRole('button',{name:'Próximo'}))
    fireEvent.click(screen.getByRole('button',{name:'Adicionar vínculo'}))
    fireEvent.change(screen.getByLabelText('Turma'),{target:{value:classroom.id}})
    fireEvent.change(screen.getByLabelText('Disciplina'),{target:{value:subject.id}})
    fireEvent.click(screen.getByRole('button',{name:'Próximo'}))
    fireEvent.click(screen.getByLabelText('Enviar convite de acesso ao Frepp'))
    fireEvent.click(screen.getByRole('button',{name:'Revisar cadastro'}))
    fireEvent.click(screen.getByRole('button',{name:'Cadastrar professor'}))
    await waitFor(()=>expect(onboardTeacher).toHaveBeenCalledWith({teacherId:teacher.id,email:'mariana@escola.test'},expect.any(AbortSignal)))
    expect(createTeacher).toHaveBeenCalledTimes(1)
    expect(createTeacherAssignment).toHaveBeenCalledWith(expect.objectContaining({teacherId:teacher.id,classId:classroom.id,subjectId:subject.id,role:'SUBJECT_TEACHER'}),expect.any(AbortSignal))
    expect(createTeacherAssignment.mock.invocationCallOrder[0]).toBeLessThan(onboardTeacher.mock.invocationCallOrder[0])
  })

  it('UNIT_ADMIN cria vínculo apenas pela rota local da unidade ativa',async()=>{
    const createUnitTeacherAssignment=vi.fn().mockResolvedValue({teacherAssignment:{id:'99999999-9999-4999-8999-999999999999'}})
    const createTeacherAssignment=vi.fn()
    renderPage({assignedUnits:vi.fn().mockResolvedValue({units:[unit]}),unitTeachers:vi.fn().mockResolvedValue({teachers:[teacher]}),unitTeacherAssignments:vi.fn().mockResolvedValue({teacherAssignments:[]}),unitClassrooms:vi.fn().mockResolvedValue({classes:[classroom]}),unitSubjects:vi.fn().mockResolvedValue({subjects:[subject]}),unitGradeLevels:vi.fn().mockResolvedValue({gradeLevels:[grade]}),unitAcademicYears:vi.fn().mockResolvedValue({academicYears:[year]}),createUnitTeacherAssignment,createTeacherAssignment},true,`/admin/teachers/${teacher.id}`)
    fireEvent.click(await screen.findByRole('button',{name:'Adicionar vínculo'}))
    fireEvent.change(screen.getByLabelText('Turma'),{target:{value:classroom.id}})
    fireEvent.change(screen.getByLabelText('Disciplina'),{target:{value:subject.id}})
    fireEvent.click(screen.getByRole('button',{name:'Salvar vínculo'}))
    await waitFor(()=>expect(createUnitTeacherAssignment).toHaveBeenCalledWith(unit.id,expect.objectContaining({teacherId:teacher.id,classId:classroom.id,subjectId:subject.id}),expect.any(AbortSignal)))
    expect(createTeacherAssignment).not.toHaveBeenCalled()
    expect(screen.queryByRole('button',{name:'Editar dados'})).not.toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'Convidar professor'})).not.toBeInTheDocument()
  })

  it('UNIT_ADMIN edita a vigência pela rota da unidade ativa',async()=>{
    const assignment={id:'99999999-9999-4999-8999-999999999999',teacherId:teacher.id,classId:classroom.id,subjectId:null,role:'REGENT_TEACHER',startDate:'2026-11-01',endDate:null,status:'ACTIVE',createdAt:teacher.createdAt,updatedAt:teacher.updatedAt}
    const updateUnitTeacherAssignmentDates=vi.fn().mockResolvedValue({teacherAssignment:{...assignment,startDate:'2026-10-25'}})
    const updateTeacherAssignmentDates=vi.fn()
    renderPage({assignedUnits:vi.fn().mockResolvedValue({units:[unit]}),unitTeachers:vi.fn().mockResolvedValue({teachers:[teacher]}),unitTeacherAssignments:vi.fn().mockResolvedValue({teacherAssignments:[assignment]}),unitClassrooms:vi.fn().mockResolvedValue({classes:[classroom]}),unitSubjects:vi.fn().mockResolvedValue({subjects:[]}),unitGradeLevels:vi.fn().mockResolvedValue({gradeLevels:[grade]}),unitAcademicYears:vi.fn().mockResolvedValue({academicYears:[year]}),updateUnitTeacherAssignmentDates,updateTeacherAssignmentDates},true,`/admin/teachers/${teacher.id}`)
    fireEvent.click(await screen.findByRole('button',{name:'Editar vigência'}))
    fireEvent.change(screen.getByLabelText('Data de início'),{target:{value:'2026-10-25'}})
    fireEvent.click(screen.getByRole('button',{name:'Salvar vigência'}))
    await waitFor(()=>expect(updateUnitTeacherAssignmentDates).toHaveBeenCalledWith(unit.id,assignment.id,{startDate:'2026-10-25',endDate:null},expect.any(AbortSignal)))
    expect(updateTeacherAssignmentDates).not.toHaveBeenCalled()
  })
})
