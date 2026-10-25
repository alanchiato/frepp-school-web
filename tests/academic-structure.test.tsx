import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AcademicStructurePage } from '../src/admin/academicstructure/AcademicStructurePage'
import { UnitScopeProvider } from '../src/admin/unitadmins/UnitScopeContext'
import { SessionContext, type SessionContextValue } from '../src/session/context'
import type { BffClient } from '../src/shared/api/client'

const unit = {id:'11111111-1111-4111-8111-111111111111',name:'Barueri'}
const year = {id:'22222222-2222-4222-8222-222222222222',year:2027,startDate:'2027-01-01',endDate:'2027-12-31',createdAt:'2026-10-24T12:00:00Z',updatedAt:'2026-10-24T12:00:00Z'}
const grade = {id:'33333333-3333-4333-8333-333333333333',code:'1ANO',name:'1º Ano',displayOrder:1,createdAt:'2026-10-24T12:00:00Z',updatedAt:'2026-10-24T12:00:00Z'}
const classroom = {id:'44444444-4444-4444-8444-444444444444',schoolUnitId:unit.id,academicYearId:year.id,gradeLevelId:grade.id,name:'Turma A',createdAt:'2026-10-24T12:00:00Z',updatedAt:'2026-10-24T12:00:00Z'}

function renderPage(api: Partial<BffClient>, unitAdmin=false) {
  const state = {status:'authenticated',session:{user:{id:'55555555-5555-4555-8555-555555555555',email:'admin@escola.test'},school:{id:'66666666-6666-4666-8666-666666666666',name:'Escola',timezone:'America/Sao_Paulo'},permissions:unitAdmin?[]:['grade_levels.read','grade_levels.create','grade_levels.update','classes.read','classes.create','classes.update']}}
  const context = {api,invalidate:vi.fn(),state} as unknown as SessionContextValue
  return render(<MemoryRouter><SessionContext.Provider value={context}><UnitScopeProvider enabled={unitAdmin}><AcademicStructurePage /></UnitScopeProvider></SessionContext.Provider></MemoryRouter>)
}

describe('Séries e turmas', () => {
  it('filtra turmas por série após ano letivo e antes de unidade', async () => {
    const secondGrade = {...grade,id:'77777777-7777-4777-8777-777777777777',code:'2ANO',name:'2º Ano',displayOrder:2}
    const secondClass = {...classroom,id:'88888888-8888-4888-8888-888888888888',gradeLevelId:secondGrade.id,name:'Turma B'}
    renderPage({gradeLevels:vi.fn().mockResolvedValue({gradeLevels:[grade,secondGrade]}),classrooms:vi.fn().mockResolvedValue({classes:[classroom,secondClass]}),academicYears:vi.fn().mockResolvedValue({academicYears:[year]}),units:vi.fn().mockResolvedValue({units:[unit]})})
    fireEvent.click(screen.getByRole('tab',{name:'Turmas'}))
    expect(await screen.findByRole('link',{name:'Turma A'})).toBeInTheDocument()
    expect(screen.getByRole('link',{name:'Turma B'})).toBeInTheDocument()
    expect(within(screen.getByRole('tabpanel')).getAllByRole('combobox').map(input=>input.parentElement?.firstChild?.textContent)).toEqual(['Ano letivo','Série','Unidade'])
    fireEvent.change(screen.getByLabelText('Série'),{target:{value:secondGrade.id}})
    expect(screen.queryByRole('link',{name:'Turma A'})).not.toBeInTheDocument()
    expect(screen.getByRole('link',{name:'Turma B'})).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Série'),{target:{value:''}})
    expect(screen.getByRole('link',{name:'Turma A'})).toBeInTheDocument()
  })

  it('cadastra uma série antes da turma com unidade e ano letivo explícitos', async () => {
    const gradeLevels=vi.fn().mockResolvedValueOnce({gradeLevels:[]}).mockResolvedValue({gradeLevels:[grade]})
    const classrooms=vi.fn().mockResolvedValueOnce({classes:[]}).mockResolvedValue({classes:[classroom]})
    const createGradeLevel=vi.fn().mockResolvedValue({gradeLevel:grade})
    const createClassroom=vi.fn().mockResolvedValue({class:classroom})
    renderPage({gradeLevels,classrooms,academicYears:vi.fn().mockResolvedValue({academicYears:[year]}),units:vi.fn().mockResolvedValue({units:[unit]}),createGradeLevel,createClassroom})
    fireEvent.click(screen.getByRole('tab',{name:'Turmas'}))
    expect(await screen.findByText('Cadastre uma série primeiro')).toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'Nova turma'})).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab',{name:'Séries'}))
    fireEvent.click(await screen.findByRole('button',{name:'Cadastrar primeira série'}))
    fireEvent.change(screen.getByLabelText('Nome da série'),{target:{value:'1º Ano'}})
    fireEvent.change(screen.getByLabelText('Código'),{target:{value:'1ANO'}})
    fireEvent.change(screen.getByLabelText('Ordem de exibição'),{target:{value:'1'}})
    fireEvent.click(screen.getByRole('button',{name:'Salvar série'}))
    await waitFor(()=>expect(createGradeLevel).toHaveBeenCalledWith({code:'1ANO',name:'1º Ano',displayOrder:1},expect.any(AbortSignal)))
    await screen.findByText('1º Ano')
    fireEvent.click(screen.getByRole('tab',{name:'Turmas'}))
    fireEvent.click(await screen.findByRole('button',{name:'Nova turma'}))
    fireEvent.change(screen.getByLabelText('Nome da turma'),{target:{value:'Turma A'}})
    fireEvent.change(screen.getByLabelText('Série'),{target:{value:grade.id}})
    fireEvent.change(screen.getByLabelText('Unidade'),{target:{value:unit.id}})
    fireEvent.change(screen.getByLabelText('Ano letivo'),{target:{value:year.id}})
    fireEvent.click(screen.getByRole('button',{name:'Salvar turma'}))
    await waitFor(()=>expect(createClassroom).toHaveBeenCalledWith({name:'Turma A',schoolUnitId:unit.id,academicYearId:year.id,gradeLevelId:grade.id},expect.any(AbortSignal)))
    expect(await screen.findByText('Turma A')).toBeInTheDocument()
  })

  it('limita o UNIT_ADMIN à unidade atribuída e permite criar turma sem cadastrar série global', async () => {
    const createUnitClassroom=vi.fn().mockResolvedValue({class:classroom})
    renderPage({assignedUnits:vi.fn().mockResolvedValue({units:[unit]}),unitGradeLevels:vi.fn().mockResolvedValue({gradeLevels:[grade]}),unitClassrooms:vi.fn().mockResolvedValue({classes:[]}),unitAcademicYears:vi.fn().mockResolvedValue({academicYears:[year]}),createUnitClassroom},true)
    expect(await screen.findByText('1º Ano')).toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'Nova série'})).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab',{name:'Turmas'}))
    fireEvent.click(await screen.findByRole('button',{name:'Nova turma'}))
    const form=screen.getByRole('tabpanel')
    fireEvent.change(within(form).getByLabelText('Nome da turma'),{target:{value:'Turma A'}})
    fireEvent.change(within(form).getByLabelText('Série'),{target:{value:grade.id}})
    expect(within(form).getByLabelText('Unidade')).toHaveValue(unit.name)
    fireEvent.click(within(form).getByRole('button',{name:'Salvar turma'}))
    await waitFor(()=>expect(createUnitClassroom).toHaveBeenCalledWith(unit.id,{name:'Turma A',schoolUnitId:unit.id,academicYearId:year.id,gradeLevelId:grade.id},expect.any(AbortSignal)))
  })
})
