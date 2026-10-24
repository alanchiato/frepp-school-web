import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { UnitsPage } from '../src/admin/units/UnitsPage'
import { UnitUnitsPage } from '../src/admin/unitadmins/UnitAdminHome'
import { UnitScopeProvider } from '../src/admin/unitadmins/UnitScopeContext'
import { SessionContext, type SessionContextValue } from '../src/session/context'
import type { BffClient } from '../src/shared/api/client'

const unit = { id: '11111111-1111-1111-1111-111111111111', name: 'Unidade Centro' }
function renderPage(api: Partial<BffClient>) {
  const context = { api, invalidate: vi.fn() } as unknown as SessionContextValue
  return render(<MemoryRouter><SessionContext.Provider value={context}><UnitsPage /></SessionContext.Provider></MemoryRouter>)
}
function fillWizard(state='SP') {
  fireEvent.change(screen.getByLabelText('Nome da unidade'), { target: { value: unit.name } })
  fireEvent.change(screen.getByLabelText('Código interno (opcional)'), { target: { value: 'UC' } })
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
  fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: 'São Paulo' } })
  fireEvent.change(screen.getByLabelText('Estado (UF)'), { target: { value: state } })
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
  fireEvent.click(screen.getByRole('button', { name: 'Salvar unidade' }))
}

describe('fluxo de unidades', () => {
  it('mostra o progresso evolutivo e atualiza etapas concluídas ao avançar e voltar', async () => {
    renderPage({units:vi.fn().mockResolvedValue({units:[]})})
    await screen.findByText('Nenhuma unidade cadastrada')
    fireEvent.click(screen.getByRole('button',{name:'Cadastrar primeira unidade'}))
    const progress=screen.getByRole('list',{name:'Etapas do cadastro da unidade'})
    const items=within(progress).getAllByRole('listitem')
    const fill=progress.parentElement?.querySelector<HTMLElement>('[class*="fill"]')
    expect(items.map(item=>item.getAttribute('data-state'))).toEqual(['current','future','future'])
    expect(fill?.style.width).toBe('0%')
    fireEvent.change(screen.getByLabelText('Nome da unidade'),{target:{value:unit.name}})
    fireEvent.click(screen.getByRole('button',{name:'Próximo'}))
    expect(items.map(item=>item.getAttribute('data-state'))).toEqual(['completed','current','future'])
    expect(fill?.style.width).toBe('50%')
    expect(items[0]).toHaveTextContent('concluída')
    await waitFor(()=>expect(screen.getByRole('heading',{name:'Endereço da unidade'})).toHaveFocus())
    fireEvent.change(screen.getByLabelText('Cidade'),{target:{value:'São Paulo'}})
    fireEvent.change(screen.getByLabelText('Estado (UF)'),{target:{value:'SP'}})
    fireEvent.click(screen.getByRole('button',{name:'Próximo'}))
    expect(items.map(item=>item.getAttribute('data-state'))).toEqual(['completed','completed','current'])
    expect(fill?.style.width).toBe('100%')
    fireEvent.click(screen.getByRole('button',{name:'Voltar'}))
    expect(items.map(item=>item.getAttribute('data-state'))).toEqual(['completed','current','future'])
    expect(fill?.style.width).toBe('50%')
  })

  it('cadastra a primeira unidade sem exigir convite', async () => {
    const createUnit = vi.fn().mockResolvedValue({ unit })
    const inviteUnitAdmin = vi.fn()
    renderPage({ units: vi.fn().mockResolvedValue({ units: [] }), createUnit, inviteUnitAdmin })
    await screen.findByText('Nenhuma unidade cadastrada')
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar primeira unidade' }))
    fillWizard('sp')
    await waitFor(() => expect(createUnit).toHaveBeenCalledWith(expect.objectContaining({ name: unit.name, code:'UC', city: 'São Paulo', state: 'SP', countryCode: 'BR' }), expect.any(AbortSignal)))
    expect(await screen.findByRole('heading', { name: 'Unidade cadastrada' })).toBeInTheDocument()
    expect(inviteUnitAdmin).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Concluir sem administrador' }))
    expect(await screen.findByText(unit.name)).toBeInTheDocument()
  })

  it('convida após salvar, usando a unidade criada e sem repetir o cadastro', async () => {
    const createUnit = vi.fn().mockResolvedValue({ unit })
    const inviteUnitAdmin = vi.fn().mockResolvedValue({ invitation: { status: 'sent' } })
    renderPage({ units: vi.fn().mockResolvedValue({ units: [] }), createUnit, inviteUnitAdmin })
    await screen.findByText('Nenhuma unidade cadastrada')
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar primeira unidade' }))
    fillWizard()
    await screen.findByRole('heading', { name: 'Unidade cadastrada' })
    fireEvent.click(screen.getByRole('button', { name: 'Convidar novo' }))
    expect(screen.getByLabelText(unit.name)).toBeChecked()
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Ana Costa' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@escola.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar convite' }))
    await waitFor(() => expect(inviteUnitAdmin).toHaveBeenCalledWith({ fullName: 'Ana Costa', email: 'ana@escola.test', unitIds: [unit.id] }, expect.any(AbortSignal)))
    expect(await screen.findByRole('heading', { name: 'Convite enviado' })).toBeInTheDocument()
    expect(createUnit).toHaveBeenCalledTimes(1)
  })

  it('permite convidar depois para mais de uma unidade e distingue entrega pendente', async () => {
    const second = { id: '22222222-2222-2222-2222-222222222222', name: 'Unidade Sul' }
    const inviteUnitAdmin = vi.fn().mockResolvedValue({ invitation: { status: 'pending' } })
    renderPage({ units: vi.fn().mockResolvedValue({ units: [unit, second] }), inviteUnitAdmin })
    const buttons = await screen.findAllByRole('button', { name: 'Convidar novo' })
    fireEvent.click(buttons[0])
    expect(screen.getByLabelText(unit.name)).toBeChecked()
    expect(screen.getByLabelText(second.name)).not.toBeChecked()
    fireEvent.click(screen.getByLabelText(second.name))
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Ana Costa' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@escola.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar convite' }))
    await waitFor(() => expect(inviteUnitAdmin).toHaveBeenCalledWith({ fullName: 'Ana Costa', email: 'ana@escola.test', unitIds: [unit.id, second.id] }, expect.any(AbortSignal)))
    expect(await screen.findByRole('heading', { name: 'Convite pendente de envio' })).toBeInTheDocument()
  })

  it('não repete um convite com resultado incerto', async () => {
    const inviteUnitAdmin = vi.fn().mockRejectedValue(new Error('connection lost'))
    renderPage({ units: vi.fn().mockResolvedValue({ units: [unit] }), inviteUnitAdmin })
    fireEvent.click((await screen.findAllByRole('button', { name: 'Convidar novo' }))[0])
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Ana Costa' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@escola.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar convite' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('não foi possível confirmar o convite')
    expect(screen.getByRole('button', { name: 'Enviar convite' })).toBeDisabled()
    expect(inviteUnitAdmin).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Convidar depois' }))
    expect(await screen.findByText(unit.name)).toBeInTheDocument()
  })

  it('associa um administrador existente sem enviar convite', async () => {
    const admin={userId:'33333333-3333-3333-3333-333333333333',fullName:'Ana Costa',email:'ana@escola.test',status:'ACTIVE' as const}
    const availableUnitAdmins=vi.fn().mockResolvedValue({admins:[admin]})
    const assignUnitAdmin=vi.fn().mockResolvedValue({userId:admin.userId,unitId:unit.id})
    const inviteUnitAdmin=vi.fn()
    renderPage({units:vi.fn().mockResolvedValue({units:[unit]}),availableUnitAdmins,assignUnitAdmin,inviteUnitAdmin})
    fireEvent.click((await screen.findAllByRole('button',{name:'Associar existente'}))[0])
    expect(await screen.findByText(/Ana Costa/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio',{name:/Ana Costa/}))
    fireEvent.click(screen.getByRole('button',{name:'Associar administrador'}))
    await waitFor(()=>expect(assignUnitAdmin).toHaveBeenCalledWith(unit.id,admin.userId,expect.any(AbortSignal)))
    expect(await screen.findByRole('heading',{name:'Administrador associado'})).toBeInTheDocument()
    expect(inviteUnitAdmin).not.toHaveBeenCalled()
  })

  it('oferece associação logo após concluir o wizard', async () => {
    const userId='33333333-3333-3333-3333-333333333333'
    const createUnit=vi.fn().mockResolvedValue({unit})
    const availableUnitAdmins=vi.fn().mockResolvedValue({admins:[{userId,fullName:'Ana Costa',email:'ana@escola.test',status:'INVITED'}]})
    renderPage({units:vi.fn().mockResolvedValue({units:[]}),createUnit,availableUnitAdmins,assignUnitAdmin:vi.fn().mockResolvedValue({userId,unitId:unit.id})})
    await screen.findByText('Nenhuma unidade cadastrada')
    fireEvent.click(screen.getByRole('button',{name:'Cadastrar primeira unidade'}))
    fillWizard()
    await screen.findByRole('heading',{name:'Unidade cadastrada'})
    fireEvent.click(screen.getByRole('button',{name:'Associar existente'}))
    expect(await screen.findByText(/Ana Costa/)).toBeInTheDocument()
    expect(availableUnitAdmins).toHaveBeenCalledWith(unit.id,expect.any(AbortSignal))
    expect(createUnit).toHaveBeenCalledTimes(1)
  })

  it('verifica a lista antes de permitir repetir um cadastro com resultado incerto', async () => {
    const units = vi.fn().mockResolvedValueOnce({ units: [] }).mockResolvedValueOnce({ units: [unit] })
    const createUnit = vi.fn().mockRejectedValue(new Error('connection lost'))
    renderPage({ units, createUnit })
    await screen.findByText('Nenhuma unidade cadastrada')
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar primeira unidade' }))
    fillWizard()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível confirmar o cadastro')
    expect(screen.getByRole('button', { name: 'Salvar unidade' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar às unidades' }))
    expect(await screen.findByText(unit.name)).toBeInTheDocument()
    expect(createUnit).toHaveBeenCalledTimes(1)
  })
})

it('mantém a página do UNIT_ADMIN limitada às unidades atribuídas', async () => {
  const assignedUnits = vi.fn().mockResolvedValue({ units: [unit] })
  const context = { api: { assignedUnits }, invalidate: vi.fn(), state: { status: 'authenticated', session: { school: { id: '22222222-2222-4222-8222-222222222222' }, user: { id: '33333333-3333-4333-8333-333333333333' } } } } as unknown as SessionContextValue
  render(<MemoryRouter><SessionContext.Provider value={context}><UnitScopeProvider enabled><UnitUnitsPage /></UnitScopeProvider></SessionContext.Provider></MemoryRouter>)
  expect(await screen.findByText(unit.name)).toBeInTheDocument()
  expect(assignedUnits).toHaveBeenCalledWith(expect.any(AbortSignal))
  expect(screen.queryByRole('button', { name: 'Cadastrar unidade' })).not.toBeInTheDocument()
})
