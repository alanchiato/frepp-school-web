import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { StudentsPage } from '../src/admin/students/StudentsPage'
import { UnitScopeProvider } from '../src/admin/unitadmins/UnitScopeContext'
import { SessionContext, type SessionContextValue } from '../src/session/context'
import type { BffClient } from '../src/shared/api/client'

const unit={id:'11111111-1111-4111-8111-111111111111',name:'Centro'}
const classroom={id:'22222222-2222-4222-8222-222222222222',schoolUnitId:unit.id,academicYearId:'33333333-3333-4333-8333-333333333333',gradeLevelId:'44444444-4444-4444-8444-444444444444',name:'Turma A',createdAt:'2026-10-25T12:00:00Z',updatedAt:'2026-10-25T12:00:00Z'}
const grade={id:classroom.gradeLevelId,code:'1ANO',name:'1º Ano',displayOrder:1,createdAt:classroom.createdAt,updatedAt:classroom.updatedAt}
const year={id:classroom.academicYearId,year:2026,startDate:'2026-01-01',endDate:'2026-12-31',createdAt:classroom.createdAt,updatedAt:classroom.updatedAt}
const student={id:'55555555-5555-4555-8555-555555555555',fullName:'Maria Silva',preferredName:null,birthDate:null,documentNumber:null,status:'ACTIVE',createdAt:classroom.createdAt,updatedAt:classroom.updatedAt}
const enrollment={id:'66666666-6666-4666-8666-666666666666',studentId:student.id,classId:classroom.id,startDate:'2026-10-25',endDate:null,status:'ACTIVE',createdAt:classroom.createdAt,updatedAt:classroom.updatedAt}
function apiMocks(unitAdmin=false):Partial<BffClient>{
  const common={students:vi.fn().mockResolvedValue({students:[]}),enrollments:vi.fn().mockResolvedValue({enrollments:[]}),guardians:vi.fn().mockResolvedValue({guardians:[]}),studentGuardians:vi.fn().mockResolvedValue({studentGuardians:[]}),classrooms:vi.fn().mockResolvedValue({classes:[classroom]}),gradeLevels:vi.fn().mockResolvedValue({gradeLevels:[grade]}),academicYears:vi.fn().mockResolvedValue({academicYears:[year]}),units:vi.fn().mockResolvedValue({units:[unit]})}
  if(!unitAdmin)return common
  return {...common,assignedUnits:vi.fn().mockResolvedValue({units:[unit]}),unitStudents:vi.fn().mockResolvedValue({students:[]}),unitEnrollments:vi.fn().mockResolvedValue({enrollments:[]}),unitGuardians:vi.fn().mockResolvedValue({guardians:[]}),unitStudentGuardians:vi.fn().mockResolvedValue({studentGuardians:[]}),unitClassrooms:vi.fn().mockResolvedValue({classes:[classroom]}),unitGradeLevels:vi.fn().mockResolvedValue({gradeLevels:[grade]}),unitAcademicYears:vi.fn().mockResolvedValue({academicYears:[year]})}
}
function renderPage(api:Partial<BffClient>,unitAdmin=false,path='/admin/students'){
  const state={status:'authenticated',session:{user:{id:'77777777-7777-4777-8777-777777777777',email:'admin@school.test'},school:{id:'88888888-8888-4888-8888-888888888888',name:'Escola',timezone:'America/Sao_Paulo'},permissions:['students.read','students.create'],experiences:{admin:!unitAdmin,teacher:false,unitAdmin}}}
  return render(<MemoryRouter initialEntries={[path]}><SessionContext.Provider value={{api,invalidate:vi.fn(),state} as unknown as SessionContextValue}><UnitScopeProvider enabled={unitAdmin}><Routes><Route path="/admin/students" element={<StudentsPage/>}/><Route path="/admin/students/:studentId" element={<StudentsPage/>}/></Routes></UnitScopeProvider></SessionContext.Provider></MemoryRouter>)
}
describe('Cadastro de alunos',()=>{
  it('SCHOOL_ADMIN cria aluno e matrícula e pode deixar responsáveis para depois',async()=>{
    const createStudent=vi.fn().mockResolvedValue({student}),createEnrollment=vi.fn().mockResolvedValue({enrollment})
    renderPage({...apiMocks(),createStudent,createEnrollment})
    fireEvent.click(await screen.findByRole('button',{name:'Novo aluno'}))
    expect(screen.getByRole('list',{name:'Etapas do cadastro do aluno'})).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Nome completo'),{target:{value:'Maria Silva'}})
    fireEvent.click(screen.getByRole('button',{name:'Próximo'}))
    fireEvent.change(screen.getByLabelText('Série e turma'),{target:{value:classroom.id}})
    fireEvent.click(screen.getByRole('button',{name:'Próximo'}))
    fireEvent.click(screen.getByRole('button',{name:'Deixar para depois'}))
    fireEvent.click(screen.getByRole('button',{name:'Cadastrar aluno'}))
    await waitFor(()=>expect(createEnrollment).toHaveBeenCalledWith({studentId:student.id,classId:classroom.id,startDate:expect.any(String)},expect.any(AbortSignal)))
    expect(createStudent).toHaveBeenCalledWith(expect.objectContaining({fullName:'Maria Silva'}),expect.any(AbortSignal))
  })
  it('UNIT_ADMIN cria aluno com matrícula atômica na unidade ativa',async()=>{
    const createUnitStudent=vi.fn().mockResolvedValue({student,enrollment}),createStudent=vi.fn(),createEnrollment=vi.fn()
    renderPage({...apiMocks(true),createUnitStudent,createStudent,createEnrollment},true)
    fireEvent.click(await screen.findByRole('button',{name:'Novo aluno'}))
    fireEvent.change(screen.getByLabelText('Nome completo'),{target:{value:'Maria Silva'}})
    fireEvent.click(screen.getByRole('button',{name:'Próximo'}))
    fireEvent.change(screen.getByLabelText('Série e turma'),{target:{value:classroom.id}})
    fireEvent.click(screen.getByRole('button',{name:'Próximo'}))
    fireEvent.click(screen.getByRole('button',{name:'Deixar para depois'}))
    fireEvent.click(screen.getByRole('button',{name:'Cadastrar aluno'}))
    await waitFor(()=>expect(createUnitStudent).toHaveBeenCalledWith(unit.id,{student:expect.objectContaining({fullName:'Maria Silva'}),enrollment:{classId:classroom.id,startDate:expect.any(String)}},expect.any(AbortSignal)))
    expect(createStudent).not.toHaveBeenCalled();expect(createEnrollment).not.toHaveBeenCalled()
  })
  it('permite vincular responsável existente após o cadastro',async()=>{
    const guardian={id:'99999999-9999-4999-8999-999999999999',fullName:'Ana Silva',preferredName:null,documentNumber:null,email:null,phone:null,status:'ACTIVE',createdAt:classroom.createdAt,updatedAt:classroom.updatedAt}
    const createStudentGuardian=vi.fn().mockResolvedValue({studentGuardian:{}})
    renderPage({...apiMocks(),students:vi.fn().mockResolvedValue({students:[student]}),enrollments:vi.fn().mockResolvedValue({enrollments:[enrollment]}),guardians:vi.fn().mockResolvedValue({guardians:[guardian]}),createStudentGuardian},false,`/admin/students/${student.id}`)
    fireEvent.click(await screen.findByRole('button',{name:'Adicionar responsável'}))
    fireEvent.change(screen.getByLabelText('Responsável'),{target:{value:guardian.id}})
    fireEvent.change(screen.getByLabelText('Parentesco / relação'),{target:{value:'MOTHER'}})
    fireEvent.click(screen.getByRole('button',{name:'Salvar responsável'}))
    await waitFor(()=>expect(createStudentGuardian).toHaveBeenCalledWith(expect.objectContaining({studentId:student.id,guardianId:guardian.id,relationship:'MOTHER'}),expect.any(AbortSignal)))
  })
  it('UNIT_ADMIN cadastra responsável novo e vínculo de modo atômico na unidade',async()=>{
    const createUnitGuardian=vi.fn().mockResolvedValue({guardian:{},studentGuardian:{}}),createGuardian=vi.fn(),createStudentGuardian=vi.fn()
    renderPage({...apiMocks(true),unitStudents:vi.fn().mockResolvedValue({students:[student]}),unitEnrollments:vi.fn().mockResolvedValue({enrollments:[enrollment]}),createUnitGuardian,createGuardian,createStudentGuardian},true,`/admin/students/${student.id}`)
    fireEvent.click(await screen.findByRole('button',{name:'Adicionar responsável'}))
    fireEvent.change(screen.getByLabelText('Cadastro'),{target:{value:'new'}})
    fireEvent.change(screen.getByLabelText('Nome completo'),{target:{value:'Ana Silva'}})
    fireEvent.change(screen.getByLabelText('Parentesco / relação'),{target:{value:'MOTHER'}})
    fireEvent.click(screen.getByRole('button',{name:'Salvar responsável'}))
    await waitFor(()=>expect(createUnitGuardian).toHaveBeenCalledWith(unit.id,{guardian:expect.objectContaining({fullName:'Ana Silva'}),link:expect.objectContaining({studentId:student.id,relationship:'MOTHER'})},expect.any(AbortSignal)))
    expect(createGuardian).not.toHaveBeenCalled();expect(createStudentGuardian).not.toHaveBeenCalled()
  })
  it('SCHOOL_ADMIN edita os dados do aluno pelo perfil',async()=>{
    const updated={...student,fullName:'Maria Oliveira',preferredName:'Mari',status:'INACTIVE'}
    const updateStudent=vi.fn().mockResolvedValue({student:updated})
    renderPage({...apiMocks(),students:vi.fn().mockResolvedValueOnce({students:[student]}).mockResolvedValue({students:[updated]}),updateStudent},false,`/admin/students/${student.id}`)
    fireEvent.click(await screen.findByRole('button',{name:'Editar aluno'}))
    fireEvent.change(screen.getByLabelText('Nome completo'),{target:{value:' Maria Oliveira '}})
    fireEvent.change(screen.getByLabelText('Nome social (opcional)'),{target:{value:'Mari'}})
    fireEvent.change(screen.getByLabelText('Situação'),{target:{value:'INACTIVE'}})
    fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}))
    await waitFor(()=>expect(updateStudent).toHaveBeenCalledWith(student.id,{fullName:'Maria Oliveira',preferredName:'Mari',birthDate:null,documentNumber:null,status:'INACTIVE'},expect.any(AbortSignal)))
    expect(await screen.findByRole('heading',{name:'Maria Oliveira'})).toBeInTheDocument()
  })
  it('UNIT_ADMIN edita o aluno pela rota da unidade selecionada',async()=>{
    const updateUnitStudent=vi.fn().mockResolvedValue({student}),updateStudent=vi.fn()
    renderPage({...apiMocks(true),unitStudents:vi.fn().mockResolvedValue({students:[student]}),updateUnitStudent,updateStudent},true,`/admin/students/${student.id}`)
    fireEvent.click(await screen.findByRole('button',{name:'Editar aluno'}))
    fireEvent.change(screen.getByLabelText('Documento (opcional)'),{target:{value:'12345678900'}})
    fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}))
    await waitFor(()=>expect(updateUnitStudent).toHaveBeenCalledWith(unit.id,student.id,expect.objectContaining({documentNumber:'12345678900'}),expect.any(AbortSignal)))
    expect(updateStudent).not.toHaveBeenCalled()
  })
  it('filtra alunos por unidade e por série e turma da matrícula vigente',async()=>{
    const otherUnit={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',name:'Norte'}
    const otherClass={...classroom,id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',name:'Turma B'}
    const northClass={...classroom,id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',schoolUnitId:otherUnit.id,name:'Turma Norte'}
    const second={...student,id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',fullName:'Bruno Silva'}
    const third={...student,id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',fullName:'Carlos Silva'}
    const active={...enrollment,startDate:'2026-01-01'}
    renderPage({...apiMocks(),students:vi.fn().mockResolvedValue({students:[student,second,third]}),enrollments:vi.fn().mockResolvedValue({enrollments:[active,{...active,id:'ffffffff-ffff-4fff-8fff-ffffffffffff',studentId:second.id,classId:otherClass.id},{...active,id:'99999999-9999-4999-8999-999999999999',studentId:third.id,classId:northClass.id}]}),classrooms:vi.fn().mockResolvedValue({classes:[classroom,otherClass,northClass]}),units:vi.fn().mockResolvedValue({units:[unit,otherUnit]})})
    const table=await screen.findByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(4)
    fireEvent.change(screen.getByLabelText('Unidade'),{target:{value:unit.id}})
    expect(within(table).queryByText('Carlos Silva')).not.toBeInTheDocument()
    expect(screen.queryByRole('option',{name:/Turma Norte/})).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Série e turma'),{target:{value:classroom.id}})
    expect(within(table).getByText('Maria Silva')).toBeInTheDocument()
    expect(within(table).queryByText('Bruno Silva')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Unidade'),{target:{value:otherUnit.id}})
    expect(screen.getByLabelText('Série e turma')).toHaveValue('')
    expect(within(table).getByText('Carlos Silva')).toBeInTheDocument()
  })
  it('UNIT_ADMIN filtra turmas somente da unidade selecionada',async()=>{
    renderPage({...apiMocks(true),unitStudents:vi.fn().mockResolvedValue({students:[student]}),unitEnrollments:vi.fn().mockResolvedValue({enrollments:[{...enrollment,startDate:'2026-01-01'}]})},true)
    await screen.findByRole('table')
    expect(screen.queryByLabelText('Unidade')).not.toBeInTheDocument()
    expect(screen.getByRole('option',{name:/Turma A/})).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Série e turma'),{target:{value:classroom.id}})
    expect(screen.getByText('Maria Silva')).toBeInTheDocument()
  })
})
