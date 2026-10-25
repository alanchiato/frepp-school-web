import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ClassWorkspacePage } from '../src/admin/academicstructure/ClassWorkspacePage'
import { SessionContext, type SessionContextValue } from '../src/session/context'
import type { BffClient } from '../src/shared/api/client'
import type { ClassWorkspace } from '../src/shared/api/contracts'
import { ApiError } from '../src/shared/api/errors'

const classId='44444444-4444-4444-8444-444444444444'
const studentId='55555555-5555-4555-8555-555555555555'
const teacherId='66666666-6666-4666-8666-666666666666'
const subjectId='77777777-7777-4777-8777-777777777777'
const workspace:ClassWorkspace={
  class:{id:classId,schoolUnitId:'11111111-1111-4111-8111-111111111111',academicYearId:'22222222-2222-4222-8222-222222222222',gradeLevelId:'33333333-3333-4333-8333-333333333333',name:'Turma A',createdAt:'2026-10-25T12:00:00Z',updatedAt:'2026-10-25T12:00:00Z'},
  unitName:'Centro',academicYear:2026,gradeLevelName:'1º Ano',
  students:[{id:studentId,fullName:'Estudante Teste',preferredName:null,enrollmentId:'88888888-8888-4888-8888-888888888888',startDate:'2026-02-01'}],
  teachers:[{id:teacherId,name:'Docente Teste',assignmentId:'99999999-9999-4999-8999-999999999999',role:'SUBJECT_TEACHER',subjectId,subjectName:'Matemática',startDate:'2026-02-01',endDate:null}],
  subjects:[{id:subjectId,name:'Matemática',teacherIds:[teacherId]}],counts:{students:1,teachers:1,subjects:1},
}
function renderPage(api:Partial<BffClient>,path=`/admin/classes/${classId}`){
 const context={api,invalidate:vi.fn(),state:{status:'authenticated',session:{user:{id:studentId,email:'admin@test.local'},school:{id:classId,name:'Escola',timezone:'America/Sao_Paulo'},permissions:['classes.read']}}} as unknown as SessionContextValue
 return render(<MemoryRouter initialEntries={[path]}><SessionContext.Provider value={context}><Routes><Route path="/admin/classes/:classId" element={<ClassWorkspacePage/>}/><Route path="/admin/academic-structure" element={<p>Lista de turmas</p>}/></Routes></SessionContext.Provider></MemoryRouter>)
}
describe('Espaço da Turma',()=>{
 it('mostra cada professor uma vez e mantém as disciplinas e vigências separadas',async()=>{
  const secondAssignment={...workspace.teachers[0],assignmentId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',subjectId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',subjectName:'Ciências',startDate:'2026-03-01'}
  renderPage({classWorkspace:vi.fn().mockResolvedValue({workspace:{...workspace,teachers:[...workspace.teachers,secondAssignment]}})})
  await screen.findByRole('heading',{name:'Turma A'})
  fireEvent.click(screen.getByRole('tab',{name:'Professores'}))
  const table=screen.getByRole('table',{name:'Professores atribuídos à turma'})
  expect(within(table).getAllByRole('row')).toHaveLength(3)
  expect(within(table).getByRole('columnheader',{name:'Tipo de vínculo'})).toBeInTheDocument()
  expect(within(table).getAllByRole('link',{name:'Docente Teste'})).toHaveLength(1)
  expect(within(table).getByText('Matemática')).toBeInTheDocument()
  expect(within(table).getByText('Ciências')).toBeInTheDocument()
  expect(within(table).getByText('Desde 01/02/2026')).toBeInTheDocument()
  expect(within(table).getByText('Desde 01/03/2026')).toBeInTheDocument()
 })

 it('abre diretamente pela URL, consulta somente o contrato composto e navega nas seções',async()=>{
  const classWorkspace=vi.fn().mockResolvedValue({workspace})
  renderPage({classWorkspace})
  expect(await screen.findByRole('heading',{name:'Turma A'})).toBeInTheDocument()
  expect(classWorkspace).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('link',{name:'Estudante Teste'})).toHaveAttribute('href',`/admin/students/${studentId}`)
  fireEvent.click(screen.getByRole('tab',{name:'Professores'}))
  expect(screen.getByRole('link',{name:'Docente Teste'})).toHaveAttribute('href',`/admin/teachers/${teacherId}`)
  fireEvent.click(screen.getByRole('tab',{name:'Disciplinas'}))
  expect(screen.getByText('Matemática')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('tab',{name:'Informações'}))
  expect(screen.getByText('Centro')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('link',{name:'Voltar às turmas'}))
  expect(screen.getByText('Lista de turmas')).toBeInTheDocument()
 })
 it('apresenta vazios, ausência e revogação sem mostrar dados de outra turma',async()=>{
  const empty={...workspace,students:[],teachers:[],subjects:[],counts:{students:0,teachers:0,subjects:0}}
  const view=renderPage({classWorkspace:vi.fn().mockResolvedValue({workspace:empty})})
  expect(await screen.findByText('Nenhum aluno com matrícula vigente nesta turma.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('tab',{name:'Professores'}))
  expect(screen.getByText('Nenhum professor com atribuição vigente nesta turma.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('tab',{name:'Disciplinas'}))
  expect(screen.getByText('Nenhuma disciplina possui professor vigente nesta turma.')).toBeInTheDocument()
  view.unmount()
  renderPage({classWorkspace:vi.fn().mockRejectedValue(new ApiError(403,'forbidden'))})
  await waitFor(()=>expect(screen.getByRole('heading',{name:'Acesso não autorizado'})).toBeInTheDocument())
 })
})
