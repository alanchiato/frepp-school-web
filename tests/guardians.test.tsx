import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { GuardiansPage } from '../src/admin/guardians/GuardiansPage'
import { UnitScopeProvider } from '../src/admin/unitadmins/UnitScopeContext'
import { SessionContext, type SessionContextValue } from '../src/session/context'
import type { BffClient } from '../src/shared/api/client'
import { ApiError } from '../src/shared/api/errors'

const unitId='11111111-1111-4111-8111-111111111111',guardianId='22222222-2222-4222-8222-222222222222',studentId='33333333-3333-4333-8333-333333333333',linkId='44444444-4444-4444-8444-444444444444',stamp='2026-10-26T12:00:00Z'
const guardian={id:guardianId,fullName:'Ana Costa',preferredName:null,documentNumber:null,email:'ana.contato@escola.test',phone:null,status:'ACTIVE',createdAt:stamp,updatedAt:stamp}
const family={guardian,students:[{id:linkId,studentId,studentName:'Maria Costa',relationship:'MOTHER',isLegalGuardian:true,isPrimaryContact:true,isFinancialResponsible:false,status:'ACTIVE',unitId,unitName:'Centro',className:'A',updatedAt:stamp}],access:{identityStatus:'NOT_CONFIGURED',invitationStatus:'NONE',loginEmail:null}}
const list={items:[{guardian,linkedStudents:1}],page:1,pageSize:20,total:1,withLinks:1,withoutLinks:0}
function renderPage(api:Partial<BffClient>,unitAdmin=false,path='/admin/guardians'){
  const state={status:'authenticated',session:{user:{id:'55555555-5555-4555-8555-555555555555',email:'admin@escola.test'},school:{id:'66666666-6666-4666-8666-666666666666',name:'Escola',timezone:'America/Sao_Paulo'},permissions:unitAdmin?[]:['guardians.create','guardian_onboarding.create'],experiences:{admin:!unitAdmin,teacher:false,unitAdmin}}}
  const common={guardianFamilies:vi.fn().mockResolvedValue({guardianFamilies:list}),guardianFamily:vi.fn().mockResolvedValue({guardianFamily:family}),assignedUnits:vi.fn().mockResolvedValue({units:[{id:unitId,name:'Centro'}]}),students:vi.fn().mockResolvedValue({students:[]}),unitStudents:vi.fn().mockResolvedValue({students:[]})}
  return render(<MemoryRouter initialEntries={[path]}><SessionContext.Provider value={{api:{...common,...api},invalidate:vi.fn(),state} as unknown as SessionContextValue}><UnitScopeProvider enabled={unitAdmin}><Routes><Route path="/admin/guardians" element={<GuardiansPage/>}/><Route path="/admin/guardians/:guardianId" element={<GuardiansPage/>}/></Routes></UnitScopeProvider></SessionContext.Provider></MemoryRouter>)
}
describe('Responsáveis',()=>{
  it('consulta lista paginada e perfil dedicado com aluno autorizado',async()=>{
    const guardianFamilies=vi.fn().mockResolvedValue({guardianFamilies:list}),guardianFamily=vi.fn().mockResolvedValue({guardianFamily:family})
    const view=renderPage({guardianFamilies,guardianFamily})
    expect(await screen.findByRole('link',{name:/Ana Costa/})).toHaveAttribute('href',`/admin/guardians/${guardianId}`)
    expect(view.container.querySelectorAll('[data-person-avatar="small"]')).toHaveLength(1)
    expect(guardianFamilies).toHaveBeenCalledWith('',1,undefined,expect.any(AbortSignal))
    fireEvent.click(screen.getByRole('link',{name:/Ana Costa/}))
    expect(await screen.findByRole('link',{name:/Maria Costa/})).toHaveAttribute('href',`/admin/students/${studentId}?guardian=${guardianId}`)
    expect(view.container.querySelectorAll('[data-person-avatar="large"]')).toHaveLength(1)
    expect(view.container.querySelectorAll('[data-person-avatar="small"]')).toHaveLength(1)
    fireEvent.click(await screen.findByRole('tab',{name:'Acesso ao aplicativo'}))
    expect(screen.getByText('Sem acesso configurado')).toBeInTheDocument()
  })
  it('encaminha busca ao servidor e mantém cadastro sem convite',async()=>{
    const guardianFamilies=vi.fn().mockResolvedValue({guardianFamilies:list}),createGuardian=vi.fn().mockResolvedValue({guardian})
    renderPage({guardianFamilies,createGuardian})
    await screen.findByRole('link',{name:/Ana Costa/})
    fireEvent.change(screen.getByLabelText('Buscar por responsável ou aluno'),{target:{value:'Maria'}})
    fireEvent.click(screen.getByRole('button',{name:'Buscar'}))
    await waitFor(()=>expect(guardianFamilies).toHaveBeenCalledWith('Maria',1,undefined,expect.any(AbortSignal)))
    fireEvent.click(screen.getByRole('button',{name:'Novo responsável'}))
    expect(screen.getByRole('list',{name:'Etapas do cadastro do responsável'})).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Nome completo'),{target:{value:'Ana Costa'}})
    fireEvent.change(screen.getByLabelText('Nome social (opcional)'),{target:{value:'Aninha'}})
    fireEvent.click(screen.getByRole('button',{name:'Próximo'}))
    fireEvent.click(screen.getByRole('button',{name:'Próximo'}))
    fireEvent.click(screen.getByRole('button',{name:'Próximo'}))
    expect(screen.getByText('Vincular depois')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Cadastrar responsável'}))
    await waitFor(()=>expect(createGuardian).toHaveBeenCalledWith(expect.objectContaining({fullName:'Ana Costa',preferredName:'Aninha'}),expect.any(AbortSignal)))
  })
  it('UNIT_ADMIN consulta somente a unidade e cria responsável com vínculo local',async()=>{
    const guardianFamilies=vi.fn().mockResolvedValue({guardianFamilies:list}),createUnitGuardian=vi.fn().mockResolvedValue({guardian,studentGuardian:{}})
    renderPage({guardianFamilies,createUnitGuardian,unitStudents:vi.fn().mockResolvedValue({students:[{id:studentId,fullName:'Maria Costa'}]})},true)
    await waitFor(()=>expect(guardianFamilies).toHaveBeenCalledWith('',1,unitId,expect.any(AbortSignal)))
    fireEvent.click(screen.getByRole('button',{name:'Novo responsável'}))
    fireEvent.change(screen.getByLabelText('Nome completo'),{target:{value:'Ana Costa'}})
    fireEvent.click(screen.getByRole('button',{name:'Próximo'}))
    fireEvent.click(screen.getByRole('button',{name:'Próximo'}))
    fireEvent.click(screen.getByRole('button',{name:'Próximo'}))
    expect(screen.getByRole('alert')).toHaveTextContent('Selecione o aluno')
    fireEvent.change(await screen.findByLabelText('Aluno da unidade'),{target:{value:studentId}})
    fireEvent.change(screen.getByLabelText('Parentesco / relação'),{target:{value:'Mãe'}})
    fireEvent.click(screen.getByRole('button',{name:'Próximo'}))
    fireEvent.click(screen.getByRole('button',{name:'Cadastrar responsável'}))
    await waitFor(()=>expect(createUnitGuardian).toHaveBeenCalledWith(unitId,{guardian:expect.objectContaining({fullName:'Ana Costa'}),link:expect.objectContaining({studentId,relationship:'Mãe'})},expect.any(AbortSignal)))
  })
  it('SCHOOL_ADMIN pode vincular e corrigir convite sem duplicar o cadastro',async()=>{
    const createGuardian=vi.fn().mockResolvedValue({guardian}),createStudentGuardian=vi.fn().mockResolvedValue({studentGuardian:{}})
    const onboardGuardian=vi.fn().mockRejectedValueOnce(new ApiError(409,'conflict')).mockResolvedValueOnce({onboarding:{activation:'invitation_sent'}})
    renderPage({createGuardian,createStudentGuardian,onboardGuardian,students:vi.fn().mockResolvedValue({students:[{id:studentId,fullName:'Maria Costa'}]})})
    await screen.findByRole('link',{name:/Ana Costa/})
    fireEvent.click(screen.getByRole('button',{name:'Novo responsável'}))
    fireEvent.change(screen.getByLabelText('Nome completo'),{target:{value:'Ana Costa'}})
    fireEvent.click(screen.getByRole('button',{name:'Próximo'}))
    fireEvent.click(screen.getByRole('button',{name:'Próximo'}))
    fireEvent.click(screen.getByLabelText('Vincular a um aluno agora'))
    await screen.findByRole('option',{name:'Maria Costa'})
    fireEvent.change(screen.getByLabelText('Aluno'),{target:{value:studentId}})
    fireEvent.change(screen.getByLabelText('Parentesco / relação'),{target:{value:'Mãe'}})
    fireEvent.click(screen.getByRole('button',{name:'Próximo'}))
    fireEvent.click(screen.getByLabelText('Enviar convite de acesso ao Frepp'))
    fireEvent.change(screen.getByLabelText('Email para o convite'),{target:{value:'outro@escola.test'}})
    fireEvent.click(screen.getByRole('button',{name:'Cadastrar responsável'}))
    await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Cadastro salvo'))
    expect(createGuardian).toHaveBeenCalledTimes(1)
    expect(createStudentGuardian).toHaveBeenCalledWith(expect.objectContaining({guardianId,studentId,relationship:'Mãe'}),expect.any(AbortSignal))
    fireEvent.change(screen.getByLabelText('Email para o convite'),{target:{value:'ana@escola.test'}})
    fireEvent.click(screen.getByRole('button',{name:'Cadastrar responsável'}))
    await waitFor(()=>expect(onboardGuardian).toHaveBeenCalledTimes(2))
    expect(createGuardian).toHaveBeenCalledTimes(1)
    expect(createStudentGuardian).toHaveBeenCalledTimes(1)
  })
  it('altera vínculo e envia convite somente por ação explícita',async()=>{
    const updateStudentGuardian=vi.fn().mockResolvedValue({studentGuardian:{}}),onboardGuardian=vi.fn().mockResolvedValue({onboarding:{activation:'invitation_sent'}})
    renderPage({updateStudentGuardian,onboardGuardian},false,`/admin/guardians/${guardianId}`)
    fireEvent.click(await screen.findByRole('button',{name:'Encerrar'}))
    await waitFor(()=>expect(updateStudentGuardian).toHaveBeenCalledWith(linkId,{status:'INACTIVE'},undefined,expect.any(AbortSignal)))
    fireEvent.click(await screen.findByRole('tab',{name:'Acesso ao aplicativo'}))
    expect(onboardGuardian).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Email para o convite'),{target:{value:'ana.login@escola.test'}})
    fireEvent.click(screen.getByRole('button',{name:'Convidar para o Frepp'}))
    await waitFor(()=>expect(onboardGuardian).toHaveBeenCalledWith({guardianId,email:'ana.login@escola.test'},expect.any(AbortSignal)))
  })
})
