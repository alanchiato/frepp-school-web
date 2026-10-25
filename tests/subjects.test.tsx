import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { SubjectsPage } from '../src/admin/subjects/SubjectsPage'
import { UnitScopeProvider } from '../src/admin/unitadmins/UnitScopeContext'
import { SessionContext, type SessionContextValue } from '../src/session/context'
import type { BffClient } from '../src/shared/api/client'

const unit = { id:'11111111-1111-4111-8111-111111111111', name:'Barueri' }
const subject = { id:'22222222-2222-4222-8222-222222222222', code:'MAT', name:'Matemática', createdAt:'2026-10-24T12:00:00Z', updatedAt:'2026-10-24T12:00:00Z' }

function renderPage(api: Partial<BffClient>, unitAdmin = false) {
  const state = { status:'authenticated', session:{ user:{id:'33333333-3333-4333-8333-333333333333',email:'admin@escola.test'}, school:{id:'44444444-4444-4444-8444-444444444444',name:'Escola',timezone:'America/Sao_Paulo'}, permissions:unitAdmin?['subjects.read']:['subjects.read','subjects.create','subjects.update'] } }
  const context = { api, invalidate:vi.fn(), state } as unknown as SessionContextValue
  return render(<MemoryRouter><SessionContext.Provider value={context}><UnitScopeProvider enabled={unitAdmin}><SubjectsPage /></UnitScopeProvider></SessionContext.Provider></MemoryRouter>)
}

describe('Disciplinas', () => {
  it('permite ao SCHOOL_ADMIN cadastrar e editar nome e código', async () => {
    const subjects = vi.fn().mockResolvedValueOnce({subjects:[]}).mockResolvedValue({subjects:[subject]})
    const createSubject = vi.fn().mockResolvedValue({subject})
    const updateSubject = vi.fn().mockResolvedValue({subject})
    renderPage({subjects,createSubject,updateSubject})
    fireEvent.click(await screen.findByRole('button',{name:'Cadastrar primeira disciplina'}))
    fireEvent.change(screen.getByLabelText('Nome da disciplina'),{target:{value:'Matemática'}})
    fireEvent.change(screen.getByLabelText('Código'),{target:{value:'MAT'}})
    fireEvent.click(screen.getByRole('button',{name:'Salvar disciplina'}))
    await waitFor(() => expect(createSubject).toHaveBeenCalledWith({code:'MAT',name:'Matemática'},expect.any(AbortSignal)))
    fireEvent.click(await screen.findByRole('button',{name:'Editar'}))
    fireEvent.click(screen.getByRole('button',{name:'Salvar disciplina'}))
    await waitFor(() => expect(updateSubject).toHaveBeenCalledWith(subject.id,{code:'MAT',name:'Matemática'},expect.any(AbortSignal)))
  })

  it('mostra o catálogo ao UNIT_ADMIN sem ações de escrita', async () => {
    const unitSubjects = vi.fn().mockResolvedValue({subjects:[subject]})
    renderPage({assignedUnits:vi.fn().mockResolvedValue({units:[unit]}),unitSubjects},true)
    expect(await screen.findByText('Matemática')).toBeInTheDocument()
    expect(unitSubjects).toHaveBeenCalledWith(unit.id,expect.any(AbortSignal))
    expect(screen.queryByRole('button',{name:'Nova disciplina'})).not.toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'Editar'})).not.toBeInTheDocument()
  })
})
