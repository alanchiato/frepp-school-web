import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../../session/context'
import type { UnitOverview } from '../../shared/api/contracts'
import { ApiError, errorMessage } from '../../shared/api/errors'
import { Button, Card, ErrorState } from '../../shared/components/ui'
import { Icon, type IconName } from '../../shared/components/Icon'
import adminHomeWelcome from '../../assets/illustrations/admin-home-welcome.png'
import { useUnitScope } from './UnitScopeContext'
import styles from './unit-admins.module.css'

const cards: {key:keyof UnitOverview['counts'];label:string;icon:IconName}[] = [
  {key:'classes',label:'Turmas',icon:'people'}, {key:'teachers',label:'Professores',icon:'teacher'},
  {key:'students',label:'Alunos',icon:'student'}, {key:'guardians',label:'Responsáveis',icon:'guardians'},
]

export function UnitAdminHome() {
  const scope=useUnitScope()
  const {api,invalidate}=useSession()
  const [data,setData]=useState<UnitOverview|null>(null)
  const [error,setError]=useState('')
  const [attempt,setAttempt]=useState(0)
  const unitId=scope?.selectedUnit?.id
  useEffect(()=>{
    if (!unitId) return
    const controller=new AbortController()
    queueMicrotask(()=>{if(!controller.signal.aborted){setData(null);setError('')}})
    queueMicrotask(()=>{if(controller.signal.aborted)return;void api.unitOverview(unitId,controller.signal).then(result=>{
      if(!controller.signal.aborted)setData(result)
    }).catch((reason:unknown)=>{
      if(controller.signal.aborted)return
      if(reason instanceof ApiError&&reason.status===401)invalidate()
      else if(reason instanceof ApiError&&(reason.status===403||reason.status===404)) {setError('Seu acesso a esta unidade mudou. Atualize as unidades disponíveis.');scope?.refresh()}
      else setError(errorMessage(reason))
    })})
    return ()=>controller.abort()
  },[api,invalidate,unitId,attempt])
  if (!scope || scope.units===null) return <div role="status"><h1>Carregando visão geral</h1><p>Buscando suas unidades.</p></div>
  if (scope.error) return <ErrorState title="Não foi possível carregar suas unidades" message={scope.error} onRetry={scope.refresh} />
  if (!scope.selectedUnit) return <Card className={styles.empty}><Icon name="school" /><h1>Nenhuma unidade disponível</h1><p>Você não tem uma unidade ativa atribuída. Procure o administrador da escola.</p></Card>
  const current=data?.unit.id===scope.selectedUnit.id?data:null
  return <div className={styles.home}>
    <header className={styles.heading}><div><p className="eyebrow">SUA UNIDADE EM UM SÓ LUGAR</p><h1>Visão geral da unidade</h1><p>Acompanhe as informações da unidade em que você está trabalhando.</p></div>
      <div className={styles.academicYear}><Icon name="calendar" /><div><span>Ano letivo vigente</span><strong>{current?.academicYear.current?.year??'Não definido'}</strong></div></div>
    </header>
    <section className={styles.banner}><div><p className="eyebrow">BEM-VINDO(A) AO FREPP SCHOOL</p><h2>{scope.selectedUnit.name}</h2><p>Seu espaço para acompanhar turmas, professores, alunos e responsáveis desta unidade.</p></div><img src={adminHomeWelcome} width="1774" height="887" alt="" aria-hidden="true" /></section>
    <section aria-label="Principais números da unidade" className={styles.counts}>
      <Card className={`${styles.count} ${scope.units.length>1?styles.unitPicker:''}`}>
        <span className={styles.icon}><Icon name="school" /></span>
        <div className={styles.unitSelector}><span>Unidade</span><strong>{scope.selectedUnit.name}</strong></div>
        {scope.units.length>1&&<>
          <span className={styles.pickerChevron}><Icon name="chevronDown" /></span>
          <select aria-label="Unidade de trabalho" title="Trocar unidade" value={scope.selectedUnit.id} onChange={event=>scope.selectUnit(event.target.value)}>{scope.units.map(unit=><option key={unit.id} value={unit.id}>{unit.name}</option>)}</select>
        </>}
      </Card>
      {cards.map(card=><Card key={card.key} className={styles.count}><span className={styles.icon}><Icon name={card.icon} /></span><div><span>{card.label}</span><strong>{current?current.counts[card.key].toLocaleString('pt-BR'):'—'}</strong></div></Card>)}
    </section>
    {error&&<p role="alert" className={styles.error}>{error}<Button variant="secondary" onClick={()=>setAttempt(value=>value+1)}>Tentar novamente</Button></p>}
    {!current&&!error&&<p role="status">Carregando dados da unidade...</p>}
    {current&&<Card className={styles.details}><h2>Área de trabalho</h2><p>Os totais consideram o ano letivo vigente e os vínculos ativos desta unidade. O histórico acadêmico permanece registrado na unidade de origem.</p><div><Link to="/admin/units">Ver minhas unidades</Link><Link to="/admin/academic-years">Consultar anos letivos</Link></div></Card>}
  </div>
}

export function UnitUnitsPage() {
  const scope=useUnitScope()
  const navigate=useNavigate()
  if (!scope || scope.units===null) return <div role="status"><h1>Carregando unidades</h1></div>
  return <div className={styles.page}><header><p className="eyebrow">SUA ESCOLA</p><h1>Minhas unidades</h1><p>Escolha a unidade em que deseja trabalhar.</p></header>
    {scope.error&&<ErrorState title="Não foi possível carregar suas unidades" message={scope.error} onRetry={scope.refresh} />}
    {!scope.error&&scope.units.length===0&&<Card><p>Nenhuma unidade ativa vinculada ao seu acesso.</p></Card>}
    {!scope.error&&scope.units.length>0&&<ul className={styles.unitList}>{scope.units.map(unit=><li key={unit.id}><Card className={styles.unitItem}><span className={styles.icon}><Icon name="school" /></span><div><h2>{unit.name}</h2>{unit.id===scope.selectedUnit?.id&&<p>Unidade em uso</p>}</div><Button variant={unit.id===scope.selectedUnit?.id?'secondary':'primary'} onClick={()=>{scope.selectUnit(unit.id);navigate('/')}}>{unit.id===scope.selectedUnit?.id?'Abrir visão geral':'Trabalhar nesta unidade'}</Button></Card></li>)}</ul>}
  </div>
}
