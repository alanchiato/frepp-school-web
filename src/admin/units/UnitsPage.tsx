import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSession } from '../../session/context'
import type { UnitOption, UnitDetails, AvailableUnitAdmin, AssignedUnitAdmin } from '../../shared/api/contracts'
import { ApiError, errorMessage } from '../../shared/api/errors'
import { Button, Card, ErrorState } from '../../shared/components/ui'
import { Icon } from '../../shared/components/Icon'
import { UnitStepper } from './UnitStepper'
import styles from './units.module.css'

type Screen = 'list' | 'details' | 'create' | 'created' | 'invite' | 'invited' | 'associate' | 'associated'
type Pending = 'create' | 'invite' | 'associate' | null
type UnitDraft = {name:string;code:string;documentNumber:string;timezone:string;street:string;addressNumber:string;complement:string;district:string;postalCode:string;city:string;state:string}
const emptyDraft:UnitDraft = {name:'',code:'',documentNumber:'',timezone:'',street:'',addressNumber:'',complement:'',district:'',postalCode:'',city:'',state:''}

export function UnitsPage() {
  const { unitId: detailId } = useParams<{unitId:string}>()
  const { api, invalidate } = useSession()
  const pageRef = useRef<HTMLDivElement>(null)
  const stepHeadingRef = useRef<HTMLHeadingElement>(null)
  const [units, setUnits] = useState<UnitOption[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [screen, setScreen] = useState<Screen>(detailId?'details':'list')
  const [detail, setDetail] = useState<UnitDetails|null>(null)
  const [assignedAdmins, setAssignedAdmins] = useState<AssignedUnitAdmin[]|null>(null)
  const [detailError, setDetailError] = useState('')
  const [detailReload, setDetailReload] = useState(0)
  const [pending, setPending] = useState<Pending>(null)
  const operation = useRef<AbortController | null>(null)
  const [createdUnit, setCreatedUnit] = useState<UnitOption | null>(null)
  const [draft, setDraft] = useState<UnitDraft>(emptyDraft)
  const [step, setStep] = useState(0)
  const [createError, setCreateError] = useState('')
  const [createUncertain, setCreateUncertain] = useState(false)
  const [adminName, setAdminName] = useState('')
  const [email, setEmail] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [inviteError, setInviteError] = useState('')
  const [inviteUncertain, setInviteUncertain] = useState(false)
  const [invitationStatus, setInvitationStatus] = useState<'sent' | 'pending'>('sent')
  const [targetUnit, setTargetUnit] = useState<UnitOption | null>(null)
  const [available, setAvailable] = useState<AvailableUnitAdmin[] | null>(null)
  const [availableError, setAvailableError] = useState('')
  const [selectedAdmin, setSelectedAdmin] = useState('')
  const [associateError, setAssociateError] = useState('')
  const [associateUncertain, setAssociateUncertain] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    api.units(controller.signal).then((result) => {
      if (!controller.signal.aborted) { setUnits(result.units); setLoadError('') }
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      if (error instanceof ApiError && error.status === 401) invalidate()
      else setLoadError(errorMessage(error))
    })
    return () => controller.abort()
  }, [api, invalidate, reload])

  useEffect(() => { setScreen(detailId?'details':'list') }, [detailId])
  useEffect(() => {
    if (!detailId) return
    const controller = new AbortController()
    Promise.all([api.unitDetails(detailId,controller.signal),api.assignedUnitAdmins(detailId,controller.signal)]).then(([unit,admins])=>{
      if(!controller.signal.aborted){setDetail(unit.unit);setAssignedAdmins(admins.admins);setDetailError('')}
    }).catch((error:unknown)=>{
      if(controller.signal.aborted)return
      if(error instanceof ApiError&&error.status===401)invalidate()
      else setDetailError(errorMessage(error))
    })
    return ()=>controller.abort()
  },[api,invalidate,detailId,detailReload])

  useEffect(() => () => operation.current?.abort(), [])
  useEffect(() => {
    const heading = pageRef.current?.querySelector('h1')
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }) }
  }, [screen])
  useEffect(() => { if (screen === 'create') stepHeadingRef.current?.focus({ preventScroll: true }) }, [screen, step])

  function showList() {
    setScreen('list')
    if (createUncertain || loadError) {
      setUnits(null)
      setLoadError('')
      setReload((value) => value + 1)
    }
  }
  function returnToContext() {
    if(detailId){setDetail(null);setAssignedAdmins(null);setDetailError('');setDetailReload(value=>value+1);setScreen('details')}
    else showList()
  }

  function showInvite(unit: UnitOption) {
    setAdminName('')
    setEmail('')
    setSelected([unit.id])
    setInviteError('')
    setInviteUncertain(false)
    setScreen('invite')
  }

  function showAssociate(unit: UnitOption) {
    setTargetUnit(unit);setAvailable(null);setAvailableError('');setSelectedAdmin('');setAssociateError('');setAssociateUncertain(false);setScreen('associate')
  }

  useEffect(() => {
    if (screen !== 'associate' || !targetUnit) return
    const controller = new AbortController()
    api.availableUnitAdmins(targetUnit.id,controller.signal).then(result=>{if(!controller.signal.aborted)setAvailable(result.admins)})
      .catch((error:unknown)=>{if(controller.signal.aborted)return;if(error instanceof ApiError&&error.status===401)invalidate();else setAvailableError(errorMessage(error))})
    return () => controller.abort()
  },[api,invalidate,screen,targetUnit])

  async function associate(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!targetUnit || !selectedAdmin || pending || associateUncertain) return
    const controller=new AbortController();operation.current=controller;setPending('associate');setAssociateError('')
    try {
      await api.assignUnitAdmin(targetUnit.id,selectedAdmin,controller.signal)
      if(!controller.signal.aborted)setScreen('associated')
    } catch(error) {
      if(controller.signal.aborted)return
      if(error instanceof ApiError&&error.status===401)invalidate()
      else if(error instanceof ApiError&&(error.status===404||error.status===409))setAssociateError('O administrador ou a unidade não está mais disponível. Volte à lista e confira os vínculos.')
      else if(error instanceof ApiError&&error.status===403)setAssociateError(errorMessage(error))
      else {setAssociateUncertain(true);setAssociateError('Não foi possível confirmar o vínculo. Ele pode ter sido criado; não repita a associação agora. Você pode voltar às unidades.')}
    } finally {if(operation.current===controller)operation.current=null;setPending(null)}
  }

  async function createUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step===0 && !draft.name.trim()) { setCreateError('Informe o nome da unidade.'); return }
    if (step===1 && (!draft.city.trim() || !/^[A-Za-z]{2}$/.test(draft.state.trim()))) { setCreateError('Informe a cidade e uma UF com duas letras.'); return }
    if (step < 2) { setCreateError('');setStep((current)=>current+1); return }
    if (pending || createUncertain) return
    const controller = new AbortController()
    operation.current = controller
    setPending('create')
    setCreateError('')
    try {
      const result = await api.createUnit({
        name:draft.name.trim(),city:draft.city.trim(),state:draft.state.trim().toUpperCase(),countryCode:'BR',
        code:draft.code.trim()||null,documentNumber:draft.documentNumber.trim()||null,timezone:draft.timezone.trim()||null,
        street:draft.street.trim()||null,addressNumber:draft.addressNumber.trim()||null,complement:draft.complement.trim()||null,
        district:draft.district.trim()||null,postalCode:draft.postalCode.trim()||null,
      }, controller.signal)
      if (controller.signal.aborted) return
      setUnits((current) => [...(current ?? []), result.unit])
      setCreatedUnit(result.unit)
      setDraft(emptyDraft);setStep(0)
      setScreen('created')
    } catch (error) {
      if (controller.signal.aborted) return
      if (error instanceof ApiError && error.status === 401) invalidate()
      else if (error instanceof ApiError && error.status === 400) setCreateError('Revise os dados da unidade e tente novamente.')
      else if (error instanceof ApiError && error.status === 403) setCreateError(errorMessage(error))
      else {
        setCreateUncertain(true)
        setCreateError('Não foi possível confirmar o cadastro. Volte à lista e verifique se a unidade foi criada antes de tentar novamente.')
      }
    } finally {
      if (operation.current === controller) operation.current = null
      setPending(null)
    }
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || inviteUncertain || selected.length === 0) return
    const controller = new AbortController()
    operation.current = controller
    setPending('invite')
    setInviteError('')
    try {
      const result = await api.inviteUnitAdmin({ fullName: adminName.trim(), email: email.trim(), unitIds: selected }, controller.signal)
      if (controller.signal.aborted) return
      setInvitationStatus(result.invitation.status)
      setScreen('invited')
    } catch (error) {
      if (controller.signal.aborted) return
      if (error instanceof ApiError && error.status === 401) invalidate()
      else if (error instanceof ApiError && error.status === 400) setInviteError('Revise os dados do administrador e selecione uma unidade ativa.')
      else if (error instanceof ApiError && error.status === 409) setInviteError('Este email já está cadastrado. Este fluxo convida somente um novo administrador.')
      else if (error instanceof ApiError && error.status === 403) setInviteError(errorMessage(error))
      else {
        setInviteUncertain(true)
        setInviteError('A unidade continua cadastrada, mas não foi possível confirmar o convite. Não envie novamente agora: ele pode ter sido criado. Você pode voltar à lista.')
      }
    } finally {
      if (operation.current === controller) operation.current = null
      setPending(null)
    }
  }

  const busy = pending !== null
  const updateDraft = (key:keyof UnitDraft,value:string) => setDraft(current=>({...current,[key]:value}))
  const startCreate = () => {setCreateUncertain(false);setCreateError('');setDraft(emptyDraft);setStep(0);setScreen('create')}
  const inviteUnits = detail && !units?.some(unit=>unit.id===detail.id) ? [detail,...(units??[])] : (units??[])
  return <div ref={pageRef} className={`${styles.page} ${detailId?styles.detailPage:''}`}>
    {screen === 'list' && <>
      <header className={styles.heading}><div><p className="eyebrow">GESTÃO DA ESCOLA</p><h1>Unidades</h1><p>Cadastre os locais onde sua escola funciona.</p></div><Button onClick={startCreate} disabled={units === null || !!loadError}>Cadastrar unidade</Button></header>
      {loadError ? <ErrorState title="Não foi possível carregar as unidades" message={loadError} onRetry={() => { setUnits(null); setLoadError(''); setReload((value) => value + 1) }} />
        : units === null ? <p role="status">Carregando unidades...</p>
          : units.length === 0 ? <Card className={styles.empty}><span className={styles.emptyIcon}><Icon name="school" /></span><h2>Nenhuma unidade cadastrada</h2><p>A escola pode começar sem unidade. Cadastre a primeira quando estiver pronta.</p><Button onClick={startCreate}>Cadastrar primeira unidade</Button></Card>
            : <ul className={styles.list}>{units.map((unit) => <li key={unit.id}><Card className={styles.unit}><div><span className={styles.unitIcon}><Icon name="school" /></span><span><strong><Link className={styles.unitLink} to={`/admin/units/${unit.id}`}>{unit.name}<span className={styles.freppMark} aria-hidden="true"><i/><i/><i/></span></Link></strong>{unit.city&&unit.state&&<small className={styles.unitLocation}>{unit.city} · {unit.state}</small>}</span></div><div className={styles.unitActions}><Button variant="secondary" onClick={() => showInvite(unit)}>Convidar novo</Button><Button variant="secondary" onClick={() => showAssociate(unit)}>Associar existente</Button></div></Card></li>)}</ul>}
    </>}

    {screen === 'details' && <>
      <header><p className="eyebrow">UNIDADES / DETALHES</p><h1>{detail?.name??'Detalhes da unidade'}</h1><p>Informações e administração da unidade.</p></header>
      {detailError ? <ErrorState title="Não foi possível carregar a unidade" message={detailError} onRetry={()=>{setDetail(null);setAssignedAdmins(null);setDetailError('');setDetailReload(value=>value+1)}} />
        : !detail || !assignedAdmins ? <p role="status">Carregando informações da unidade...</p>
        : <>
          <Card className={styles.detailCard}><h2>Dados da unidade</h2><dl className={styles.review}>{([
            ['Nome',detail.name],['Código interno',detail.code],['Documento',detail.documentNumber],['Fuso horário',detail.timezone],
            ['Rua',detail.street],['Número',detail.addressNumber],['Complemento',detail.complement],['Bairro',detail.district],
            ['Cidade',detail.city],['Estado (UF)',detail.state],['CEP',detail.postalCode],['País',detail.countryCode==='BR'?'Brasil':detail.countryCode],
          ] as const).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'Não informado'}</dd></div>)}</dl></Card>
          <Card className={styles.detailCard}><div className={styles.detailHeading}><div><h2>Administradores da unidade</h2><p>Administradores com vínculo ativo a esta unidade.</p></div><div className={styles.unitActions}><Button onClick={()=>showInvite(detail)}>Convidar novo</Button><Button variant="secondary" onClick={()=>showAssociate(detail)}>Associar existente</Button></div></div>
            {assignedAdmins.length===0?<p className={styles.hint}>Nenhum UNIT_ADMIN associado a esta unidade.</p>:<ul className={styles.adminList}>{assignedAdmins.map(admin=><li key={admin.userId}><div><strong>{admin.fullName}</strong><span>{admin.email}</span></div><span className={styles.adminStatus}>{admin.status==='ACTIVE'?'Ativo':admin.status==='INVITED'?'Convite pendente':'Inativo'}</span></li>)}</ul>}
          </Card>
        </>}
    </>}

    {screen === 'create' && <>
      <header><p className="eyebrow">UNIDADES / NOVO CADASTRO</p><h1>Cadastrar unidade</h1><p>O administrador da unidade pode ser convidado depois.</p></header>
      <UnitStepper currentStep={step} />
      <Card className={styles.wizardCard}><form key={step} onSubmit={(event) => void createUnit(event)} className={`${styles.form} ${styles.wizardForm}`}>
        {step===0 && <><h2 ref={stepHeadingRef} tabIndex={-1}>Identificação da unidade</h2><p>O nome é obrigatório. Os demais dados podem ser preenchidos agora ou posteriormente.</p>
          <label>Nome da unidade<input required maxLength={150} value={draft.name} onChange={event=>updateDraft('name',event.target.value)} autoComplete="organization" disabled={busy} /></label>
          <div className={styles.fields}><label>Código interno (opcional)<input maxLength={50} value={draft.code} onChange={event=>updateDraft('code',event.target.value)} disabled={busy} /></label><label>Documento da unidade (opcional)<input maxLength={20} value={draft.documentNumber} onChange={event=>updateDraft('documentNumber',event.target.value)} disabled={busy} /></label></div>
          <label>Fuso horário (opcional)<input maxLength={50} placeholder="America/Sao_Paulo" value={draft.timezone} onChange={event=>updateDraft('timezone',event.target.value)} disabled={busy} /></label>
        </>}
        {step===1 && <><h2 ref={stepHeadingRef} tabIndex={-1}>Endereço da unidade</h2><div className={styles.fields}><label>CEP (opcional)<input value={draft.postalCode} onChange={event=>updateDraft('postalCode',event.target.value)} autoComplete="postal-code" disabled={busy} /></label><label>Rua (opcional)<input value={draft.street} onChange={event=>updateDraft('street',event.target.value)} autoComplete="address-line1" disabled={busy} /></label></div>
          <div className={styles.fields}><label>Número (opcional)<input value={draft.addressNumber} onChange={event=>updateDraft('addressNumber',event.target.value)} disabled={busy} /></label><label>Complemento (opcional)<input value={draft.complement} onChange={event=>updateDraft('complement',event.target.value)} autoComplete="address-line2" disabled={busy} /></label></div>
          <label>Bairro (opcional)<input value={draft.district} onChange={event=>updateDraft('district',event.target.value)} disabled={busy} /></label>
          <div className={styles.fields}><label>Cidade<input required value={draft.city} onChange={event=>updateDraft('city',event.target.value)} autoComplete="address-level2" disabled={busy} /></label><label>Estado (UF)<input required minLength={2} maxLength={2} value={draft.state} onChange={event=>updateDraft('state',event.target.value)} autoComplete="address-level1" disabled={busy} /></label></div>
          <p className={styles.hint}>País: Brasil.</p>
        </>}
        {step===2 && <><h2 ref={stepHeadingRef} tabIndex={-1}>Revisão</h2><p>Confira os dados antes de criar a unidade. O administrador poderá ser escolhido depois.</p><dl className={styles.review}>{([['Nome',draft.name],['Código interno',draft.code],['Documento',draft.documentNumber],['Fuso horário',draft.timezone],['Rua',draft.street],['Número',draft.addressNumber],['Complemento',draft.complement],['Bairro',draft.district],['Cidade',draft.city],['UF',draft.state.toUpperCase()],['CEP',draft.postalCode],['País','Brasil']] as const).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value.trim()||'Não informado'}</dd></div>)}</dl></>}
        {createError && <p role="alert" className={styles.error}>{createError}</p>}
        <div className={`${styles.actions} ${styles.wizardActions}`}><Button variant="secondary" onClick={step===0||createUncertain?showList:()=>{setCreateError('');setStep(current=>current-1)}} disabled={busy}>{step===0||createUncertain?'Voltar às unidades':'Voltar'}</Button><Button type="submit" disabled={busy || createUncertain}>{pending === 'create' ? 'Salvando...' : step===2?'Salvar unidade':'Próximo'}</Button></div>
      </form></Card>
    </>}

    {screen === 'created' && createdUnit && <>
      <header><p className="eyebrow">UNIDADES / CADASTRO CONCLUÍDO</p><h1>Unidade cadastrada</h1></header>
      <Card className={styles.confirmation}><span className={styles.successIcon}><Icon name="check" /></span><h2>{createdUnit.name}</h2><p>Agora você pode convidar um novo administrador, associar um já cadastrado ou concluir sem administrador.</p><div className={styles.actions}><Button onClick={() => showInvite(createdUnit)}>Convidar novo</Button><Button variant="secondary" onClick={() => showAssociate(createdUnit)}>Associar existente</Button><Button variant="secondary" onClick={showList}>Concluir sem administrador</Button></div></Card>
    </>}

    {screen === 'invite' && <>
      <header><p className="eyebrow">UNIDADES / CONVITE OPCIONAL</p><h1>Convidar administrador</h1><p>O novo administrador pode ser atribuído a mais de uma unidade ativa.</p></header>
      <Card><form onSubmit={(event) => void invite(event)} className={styles.form}>
        <h2>Dados do administrador</h2>
        <label>Nome completo<input required maxLength={150} value={adminName} onChange={(event) => setAdminName(event.target.value)} autoComplete="name" disabled={busy} /></label>
        <label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" disabled={busy} /></label>
        <fieldset className={styles.choices}><legend>Unidades atribuídas</legend>{inviteUnits.map((unit) => <label key={unit.id} className={styles.checkbox}><input type="checkbox" checked={selected.includes(unit.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, unit.id] : current.filter((id) => id !== unit.id))} disabled={busy} />{unit.name}</label>)}</fieldset>
        {selected.length === 0 && <p className={styles.hint}>Selecione pelo menos uma unidade para enviar o convite.</p>}
        {inviteError && <p role="alert" className={styles.error}>{inviteError}</p>}
        <div className={styles.actions}><Button variant="secondary" onClick={returnToContext} disabled={busy}>{detailId?'Voltar à unidade':'Convidar depois'}</Button><Button type="submit" disabled={busy || inviteUncertain || selected.length === 0}>{pending === 'invite' ? 'Enviando...' : 'Enviar convite'}</Button></div>
      </form></Card>
    </>}

    {screen === 'invited' && <>
      <header><p className="eyebrow">UNIDADES / CONVITE</p><h1>{invitationStatus === 'sent' ? 'Convite enviado' : 'Convite pendente de envio'}</h1></header>
      <Card className={styles.confirmation}><span className={styles.successIcon}><Icon name={invitationStatus === 'sent' ? 'check' : 'mail'} /></span><p>{invitationStatus === 'sent' ? 'O administrador foi cadastrado e o convite foi enviado.' : 'O administrador foi cadastrado, mas a entrega do convite está pendente. Não envie outro convite para o mesmo email.'}</p><Button onClick={returnToContext}>{detailId?'Voltar à unidade':'Voltar às unidades'}</Button></Card>
    </>}
    {screen === 'associate' && targetUnit && <>
      <header><p className="eyebrow">UNIDADES / ADMINISTRADOR EXISTENTE</p><h1>Associar administrador</h1><p>Escolha um UNIT_ADMIN da escola para {targetUnit.name}. Nenhum novo convite será enviado.</p></header>
      <Card><form onSubmit={(event)=>void associate(event)} className={styles.form}>
        <h2>Administradores disponíveis</h2>
        {availableError && <p role="alert" className={styles.error}>{availableError}</p>}
        {!available && !availableError && <p role="status">Carregando administradores...</p>}
        {available?.length===0 && <p>Nenhum administrador disponível para esta unidade. Você pode convidar um novo.</p>}
        {available && available.length>0 && <fieldset className={styles.choices}><legend>Selecione um administrador</legend>{available.map(admin=><label key={admin.userId} className={styles.checkbox}><input type="radio" name="admin" value={admin.userId} checked={selectedAdmin===admin.userId} onChange={()=>setSelectedAdmin(admin.userId)} disabled={busy} /><span>{admin.fullName} · {admin.email} ({admin.status==='INVITED'?'convite pendente':'ativo'})</span></label>)}</fieldset>}
        {associateError && <p role="alert" className={styles.error}>{associateError}</p>}
        <div className={styles.actions}><Button variant="secondary" onClick={returnToContext} disabled={busy}>{detailId?'Voltar à unidade':'Voltar às unidades'}</Button><Button variant="secondary" onClick={()=>showInvite(targetUnit)} disabled={busy}>Convidar novo</Button><Button type="submit" disabled={busy||associateUncertain||!selectedAdmin}>{pending==='associate'?'Associando...':'Associar administrador'}</Button></div>
      </form></Card>
    </>}
    {screen === 'associated' && targetUnit && <>
      <header><p className="eyebrow">UNIDADES / ADMINISTRADOR ASSOCIADO</p><h1>Administrador associado</h1></header>
      <Card className={styles.confirmation}><span className={styles.successIcon}><Icon name="check" /></span><p>O administrador foi associado à unidade {targetUnit.name}.</p><Button onClick={returnToContext}>{detailId?'Voltar à unidade':'Voltar às unidades'}</Button></Card>
    </>}
    {screen !== 'list' && <nav aria-label="Navegação de retorno" className={`${styles.returnLinks} ${screen === 'details' ? styles.returnLinksPair : ''}`}>
      {screen === 'details' && <Link to="/admin/units" className={styles.returnLink}><span>Voltar às unidades</span><span className={styles.freppMark} aria-hidden="true"><i/><i/><i/></span></Link>}
      <Link to="/" className={styles.returnLink}><span>Voltar à Visão geral</span><span className={styles.freppMark} aria-hidden="true"><i/><i/><i/></span></Link>
    </nav>}
  </div>
}
