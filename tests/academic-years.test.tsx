import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AcademicYearsPage } from '../src/admin/academicyears/AcademicYearsPage'
import { SessionContext, type SessionContextValue } from '../src/session/context'
import { ApiError } from '../src/shared/api/errors'
import type { BffClient } from '../src/shared/api/client'

const item = {id:'11111111-1111-4111-8111-111111111111',year:2027,startDate:'2027-02-01',endDate:'2027-12-15',createdAt:'2026-10-24T12:00:00Z',updatedAt:'2026-10-24T12:00:00Z'}
function renderPage(api: Partial<BffClient>, permissions=['academic_years.read','academic_years.create','academic_years.update']) {
  const context = {api, invalidate:vi.fn(),state:{status:'authenticated',session:{permissions}}} as unknown as SessionContextValue
  return render(<MemoryRouter><SessionContext.Provider value={context}><AcademicYearsPage /></SessionContext.Provider></MemoryRouter>)
}

describe('anos letivos', () => {
  it('mostra o estado vazio e cadastra um período', async () => {
    const academicYears=vi.fn().mockResolvedValueOnce({academicYears:[]}).mockResolvedValueOnce({academicYears:[item]})
    const createAcademicYear=vi.fn().mockResolvedValue({academicYear:item})
    renderPage({academicYears,createAcademicYear})
    fireEvent.click(await screen.findByRole('button',{name:'Cadastrar primeiro ano letivo'}))
    fireEvent.change(screen.getByLabelText('Ano letivo'),{target:{value:'2027'}})
    fireEvent.change(screen.getByLabelText('Data de início'),{target:{value:'2027-02-01'}})
    fireEvent.change(screen.getByLabelText('Data de fim'),{target:{value:'2027-12-15'}})
    fireEvent.click(screen.getByRole('button',{name:'Salvar ano letivo'}))
    await waitFor(()=>expect(createAcademicYear).toHaveBeenCalledWith({year:2027,startDate:'2027-02-01',endDate:'2027-12-15'},expect.any(AbortSignal)))
    expect(await screen.findByText('01/02/2027 a 15/12/2027')).toBeInTheDocument()
  })

  it('carrega o detalhe antes de editar e reflete a lista após salvar', async () => {
    const changed={...item,endDate:'2027-12-20'}
    const academicYears=vi.fn().mockResolvedValueOnce({academicYears:[item]}).mockResolvedValueOnce({academicYears:[changed]})
    const academicYear=vi.fn().mockResolvedValue({academicYear:item})
    const updateAcademicYear=vi.fn().mockResolvedValue({academicYear:changed})
    renderPage({academicYears,academicYear,updateAcademicYear})
    fireEvent.click(await screen.findByRole('button',{name:'Editar'}))
    expect(academicYear).toHaveBeenCalledWith(item.id,expect.any(AbortSignal))
    fireEvent.change(await screen.findByLabelText('Data de fim'),{target:{value:'2027-12-20'}})
    fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}))
    await waitFor(()=>expect(updateAcademicYear).toHaveBeenCalledWith(item.id,{year:2027,startDate:'2027-02-01',endDate:'2027-12-20'},expect.any(AbortSignal)))
    expect(await screen.findByText('01/02/2027 a 20/12/2027')).toBeInTheDocument()
  })

  it('não oferece ações sem os grants e trata conflito de ano', async () => {
    const view=renderPage({academicYears:vi.fn().mockResolvedValue({academicYears:[item]})},['academic_years.read'])
    await screen.findByText('01/02/2027 a 15/12/2027')
    expect(screen.queryByRole('button',{name:'Editar'})).not.toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'Cadastrar ano letivo'})).not.toBeInTheDocument()
    view.unmount()
    const createAcademicYear=vi.fn().mockRejectedValue(new ApiError(409,'academic_year_conflict'))
    renderPage({academicYears:vi.fn().mockResolvedValue({academicYears:[]}),createAcademicYear})
    fireEvent.click(await screen.findByRole('button',{name:'Cadastrar primeiro ano letivo'}))
    fireEvent.change(screen.getByLabelText('Ano letivo'),{target:{value:'2027'}})
    fireEvent.change(screen.getByLabelText('Data de início'),{target:{value:'2027-02-01'}})
    fireEvent.change(screen.getByLabelText('Data de fim'),{target:{value:'2027-12-15'}})
    fireEvent.click(screen.getByRole('button',{name:'Salvar ano letivo'}))
    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe um ano letivo')
    expect(screen.getByRole('button',{name:'Salvar ano letivo'})).toBeEnabled()
  })

  it('impede repetição quando a gravação tem resultado incerto', async () => {
    const createAcademicYear=vi.fn().mockRejectedValue(new Error('connection lost'))
    renderPage({academicYears:vi.fn().mockResolvedValue({academicYears:[]}),createAcademicYear})
    fireEvent.click(await screen.findByRole('button',{name:'Cadastrar primeiro ano letivo'}))
    fireEvent.change(screen.getByLabelText('Ano letivo'),{target:{value:'2027'}})
    fireEvent.change(screen.getByLabelText('Data de início'),{target:{value:'2027-02-01'}})
    fireEvent.change(screen.getByLabelText('Data de fim'),{target:{value:'2027-12-15'}})
    fireEvent.click(screen.getByRole('button',{name:'Salvar ano letivo'}))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível confirmar')
    expect(screen.getByRole('button',{name:'Salvar ano letivo'})).toBeDisabled()
    expect(createAcademicYear).toHaveBeenCalledTimes(1)
  })
})
