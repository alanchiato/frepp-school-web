import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Forbidden } from '../../app/SystemStates'
import { useSession } from '../../session/context'
import type { AcademicYear, Classroom, Enrollment, GradeLevel, Guardian, Student, StudentGuardian, StudentInput, UnitOption } from '../../shared/api/contracts'
import { ApiError, errorMessage } from '../../shared/api/errors'
import { Button, Card, ErrorState } from '../../shared/components/ui'
import { PersonIdentity } from '../../shared/components/PersonAvatar'
import { WizardStepper } from '../../shared/components/WizardStepper'
import { GuardianLinkActions } from './GuardianLinkActions'
import { useUnitScope } from '../unitadmins/UnitScopeContext'
import styles from '../teachers/teachers.module.css'
import own from './students.module.css'

type Catalog={students:Student[];enrollments:Enrollment[];guardians:Guardian[];links:StudentGuardian[];classes:Classroom[];grades:GradeLevel[];years:AcademicYear[];units:UnitOption[]}
type GuardianChoice={kind:'existing'|'new';guardianId:string;fullName:string;preferredName:string;documentNumber:string;email:string;phone:string;relationship:string;isLegalGuardian:boolean;isPrimaryContact:boolean;isFinancialResponsible:boolean}
const newChoice=():GuardianChoice=>({kind:'existing',guardianId:'',fullName:'',preferredName:'',documentNumber:'',email:'',phone:'',relationship:'',isLegalGuardian:false,isPrimaryContact:false,isFinancialResponsible:false})
const steps=[{label:'Dados do aluno',compact:'Dados'},{label:'Informações acadêmicas',compact:'Matrícula'},{label:'Responsáveis',compact:'Responsáveis'},{label:'Revisão',compact:'Revisão'}] as const
const guardianSteps=[{label:'Responsável',compact:'Responsável'},{label:'Contatos',compact:'Contatos'},{label:'Vínculo com o aluno',compact:'Vínculo'},{label:'Revisão',compact:'Revisão'}] as const
const today=()=>new Date().toISOString().slice(0,10)
const statusLabel:Record<Student['status'],string>={ACTIVE:'Ativo',INACTIVE:'Inativo'}
const enrollmentLabel:Record<Enrollment['status'],string>={ACTIVE:'Ativa',TRANSFERRED:'Transferida',COMPLETED:'Concluída',CANCELLED:'Cancelada'}
function classText(item:Classroom,data:Catalog){const grade=data.grades.find(row=>row.id===item.gradeLevelId)?.name??'Série não definida';const year=data.years.find(row=>row.id===item.academicYearId)?.year??'Ano não definido';const unit=data.units.find(row=>row.id===item.schoolUnitId)?.name??'Unidade indisponível';return `${grade} · ${item.name} · ${unit} · ${year}`}
function currentEnrollment(studentId:string,data:Catalog,date:string){return data.enrollments.filter(item=>item.studentId===studentId&&item.status==='ACTIVE'&&item.startDate<=date&&(!item.endDate||item.endDate>date)).sort((a,b)=>b.startDate.localeCompare(a.startDate))[0]}
function dateText(value:string|null|undefined){if(!value)return 'Não informado';const [year,month,day]=value.split('-');return `${day}/${month}/${year}`}
function studentDraft(student:Student):StudentInput{return {fullName:student.fullName,preferredName:student.preferredName,birthDate:student.birthDate,documentNumber:student.documentNumber,status:student.status}}

export function StudentsPage(){
  const {state,api,invalidate}=useSession(),scope=useUnitScope(),unitId=scope?.selectedUnit?.id,{studentId}=useParams(),navigate=useNavigate()
  const [data,setData]=useState<Catalog|null>(null),[error,setError]=useState(''),[forbidden,setForbidden]=useState(false),[reload,setReload]=useState(0),[wizard,setWizard]=useState(false),[search,setSearch]=useState(''),[filter,setFilter]=useState<'ALL'|'ACTIVE'|'INACTIVE'>('ALL'),[unitFilter,setUnitFilter]=useState(''),[classFilter,setClassFilter]=useState(''),[notice,setNotice]=useState('')
  useEffect(()=>setNotice(''),[studentId])
  const permissions=state.status==='authenticated'||state.status==='logging_out'?state.session.permissions:[]
  const canCreate=!!scope||permissions.includes('students.create')
  useEffect(()=>{
    const controller=new AbortController(),signal=controller.signal;setData(null);setError('');setForbidden(false)
    if(scope&&!unitId)return()=>controller.abort()
    const requests=unitId?[api.unitStudents(unitId,signal),api.unitEnrollments(unitId,signal),api.unitGuardians(unitId,signal),api.unitStudentGuardians(unitId,signal),api.unitClassrooms(unitId,signal),api.unitGradeLevels(unitId,signal),api.unitAcademicYears(unitId,signal),Promise.resolve({units:scope?.units??[]})]
      :[api.students(signal),api.enrollments(signal),api.guardians(signal),api.studentGuardians(signal),api.classrooms(signal),api.gradeLevels(signal),api.academicYears(signal),api.units(signal)]
    void Promise.all(requests).then(([s,e,g,l,c,gr,y,u])=>{if(!signal.aborted)setData({students:(s as {students:Student[]}).students,enrollments:(e as {enrollments:Enrollment[]}).enrollments,guardians:(g as {guardians:Guardian[]}).guardians,links:(l as {studentGuardians:StudentGuardian[]}).studentGuardians,classes:(c as {classes:Classroom[]}).classes,grades:(gr as {gradeLevels:GradeLevel[]}).gradeLevels,years:(y as {academicYears:AcademicYear[]}).academicYears,units:(u as {units:UnitOption[]}).units})}).catch((reason:unknown)=>{if(signal.aborted)return;if(reason instanceof ApiError&&reason.status===401)invalidate();else if(reason instanceof ApiError&&reason.status===403)setForbidden(true);else setError(errorMessage(reason))})
    return()=>controller.abort()
  },[api,invalidate,reload,unitId,!!scope,scope?.units])
  if(forbidden)return <Forbidden onRetry={()=>setReload(value=>value+1)}/>
  const selected=data?.students.find(item=>item.id===studentId)
  const selectedUnitForClasses=unitId??unitFilter
  const classesForFilter=data?data.classes.filter(item=>!selectedUnitForClasses||item.schoolUnitId===selectedUnitForClasses).sort((a,b)=>classText(a,data).localeCompare(classText(b,data),'pt-BR')):[]
  const date=today()
  const filtered=(data?.students??[]).filter(item=>{
    if(filter!=='ALL'&&item.status!==filter||!`${item.fullName} ${item.preferredName??''} ${item.documentNumber??''}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))return false
    if(!unitFilter&&!classFilter)return true
    const current=data&&currentEnrollment(item.id,data,date)
    const classroom=data?.classes.find(row=>row.id===current?.classId)
    return (!unitFilter||classroom?.schoolUnitId===unitFilter)&&(!classFilter||classroom?.id===classFilter)
  }).sort((a,b)=>a.fullName.localeCompare(b.fullName,'pt-BR'))
  return <div className={`${styles.page} ${wizard?styles.wizardPage:''}`}>
    <header className={styles.pageHeading}><p className="eyebrow">PESSOAS</p><h1>{studentId?'Perfil do aluno':wizard?'Cadastrar aluno':'Alunos'}</h1><p>{studentId?'Consulte os dados, as matrículas e os responsáveis do aluno.':wizard?'Cadastre o aluno, escolha sua turma e vincule responsáveis.':'Consulte os alunos da escola e suas matrículas.'}</p></header>
    {notice&&<p role="status" className={styles.notice}>{notice}</p>}
    {scope&&!unitId?<Card><p>Selecione uma unidade para consultar alunos.</p></Card>:error?<ErrorState title="Não foi possível carregar alunos" message={error} onRetry={()=>setReload(value=>value+1)}/>:!data?<p role="status">Carregando alunos...</p>:studentId?selected?<StudentDetail student={selected} data={data} unitId={unitId} onRefresh={()=>setReload(value=>value+1)} onNotice={setNotice}/>:<Card><h2>Aluno não encontrado</h2><Link to="/admin/students">Voltar aos alunos</Link></Card>:wizard?<StudentWizard data={data} unitId={unitId} onCancel={()=>setWizard(false)} onComplete={id=>{setWizard(false);navigate(`/admin/students/${id}`);setReload(value=>value+1)}}/>:<>
      <div className={styles.sectionHeading}><div><h2>Alunos {scope?'da unidade':'da escola'}</h2><p>O histórico de matrículas conserva a turma e a unidade de cada período.</p></div>{canCreate&&<Button onClick={()=>setWizard(true)}>Novo aluno</Button>}</div>
      <div className={styles.filters}><label className={`${styles.search} ${own.filterSearch}`}>Buscar aluno<input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Nome ou documento"/></label><label className={own.filterStatus}>Situação<select value={filter} onChange={event=>setFilter(event.target.value as typeof filter)}><option value="ALL">Todos</option><option value="ACTIVE">Ativos</option><option value="INACTIVE">Inativos</option></select></label>{!scope&&<label className={own.filterChoice}>Unidade<select value={unitFilter} onChange={event=>{setUnitFilter(event.target.value);setClassFilter('')}}><option value="">Todas as unidades</option>{data.units.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}<label className={own.filterChoice}>Série e turma<select value={classFilter} onChange={event=>setClassFilter(event.target.value)}><option value="">Todas as séries e turmas</option>{classesForFilter.map(item=><option key={item.id} value={item.id}>{classText(item,data)}</option>)}</select></label></div>
      {filtered.length===0?<Card className={styles.empty}><h3>{search||filter!=='ALL'||unitFilter||classFilter?'Nenhum aluno encontrado':'Nenhum aluno cadastrado'}</h3><p>{scope?'Cadastre o aluno com a primeira matrícula nesta unidade.':'Cadastre um aluno e sua matrícula para começar.'}</p>{canCreate&&!search&&filter==='ALL'&&!unitFilter&&!classFilter&&<Button onClick={()=>setWizard(true)}>Cadastrar primeiro aluno</Button>}</Card>:<Card className={styles.tableCard}><table><thead><tr><th>Aluno</th><th>Documento</th><th>Unidade</th><th>Série e turma</th><th>Situação</th></tr></thead><tbody>{filtered.map(student=>{
        const current=currentEnrollment(student.id,data,date)
        const classroom=data.classes.find(item=>item.id===current?.classId),unit=data.units.find(item=>item.id===classroom?.schoolUnitId),grade=data.grades.find(item=>item.id===classroom?.gradeLevelId)
        return <tr key={student.id}><td data-label="Aluno"><PersonIdentity name={student.fullName}><Link className={styles.rowLink} to={`/admin/students/${student.id}`}>{student.fullName}<span className={styles.freppMark} aria-hidden="true"><i/><i/><i/></span></Link></PersonIdentity></td><td data-label="Documento">{student.documentNumber??'Não informado'}</td><td data-label="Unidade">{unit?.name??'Sem matrícula vigente'}</td><td data-label="Série e turma">{classroom?`${grade?.name??'Série não definida'} · ${classroom.name}`:'—'}</td><td data-label="Situação"><span className={own.status} data-status={student.status}>{statusLabel[student.status]}</span></td></tr>
      })}</tbody></table></Card>}</>}
    {!studentId&&<Link to="/" className={styles.back}>Voltar à Visão geral<span className={styles.freppMark} aria-hidden="true"><i/><i/><i/></span></Link>}
  </div>
}

function StudentWizard({data,unitId,onCancel,onComplete}:{data:Catalog;unitId:string|undefined;onCancel:()=>void;onComplete:(id:string)=>void}){
  const {api,invalidate}=useSession()
  const [step,setStep]=useState(0),[student,setStudent]=useState<StudentInput>({fullName:'',preferredName:null,birthDate:null,documentNumber:null}),[classId,setClassId]=useState(''),[startDate,setStartDate]=useState(today()),[unitChoice,setUnitChoice]=useState(unitId??''),[yearChoice,setYearChoice]=useState(''),[choices,setChoices]=useState<GuardianChoice[]>([]),[saved,setSaved]=useState<Student|null>(null),[enrolled,setEnrolled]=useState(false),[linked,setLinked]=useState(0),[createdGuardians,setCreatedGuardians]=useState<Record<number,string>>({}),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false),[error,setError]=useState('')
  const operation=useRef<AbortController|null>(null),heading=useRef<HTMLHeadingElement>(null)
  useEffect(()=>()=>operation.current?.abort(),[])
  useEffect(()=>{heading.current?.focus({preventScroll:true})},[step])
  const available=data.classes.filter(item=>(!unitChoice||item.schoolUnitId===unitChoice)&&(!yearChoice||item.academicYearId===yearChoice))
  const chosen=data.classes.find(item=>item.id===classId)
  function next(){setError('');if(step===0&&!student.fullName?.trim()){setError('Informe o nome completo do aluno.');return}if(step===1&&!chosen){setError('Selecione uma turma para a matrícula.');return}if(step===2&&choices.some(item=>!item.relationship.trim()||item.kind==='existing'&&!item.guardianId||item.kind==='new'&&!item.fullName.trim())){setError('Complete os dados dos responsáveis adicionados.');return}setStep(value=>value+1)}
  function updateChoice(index:number,patch:Partial<GuardianChoice>){setChoices(current=>current.map((item,i)=>i===index?{...item,...patch}:item))}
  async function finish(){
    if(!chosen||busy||uncertain)return
    const controller=new AbortController();operation.current=controller;setBusy(true);setError('')
    let profile=saved,hasEnrollment=enrolled,done=linked
    try{
      if(!profile){
        if(unitId){const result=await api.createUnitStudent(unitId,{student,enrollment:{classId:chosen.id,startDate}},controller.signal);profile=result.student;hasEnrollment=true;setEnrolled(true)}
        else{const result=await api.createStudent(student,controller.signal);profile=result.student}
        setSaved(profile)
      }
      if(!hasEnrollment){await api.createEnrollment({studentId:profile.id,classId:chosen.id,startDate},controller.signal);hasEnrollment=true;setEnrolled(true)}
      for(let i=done;i<choices.length;i++){
        const choice=choices[i],link={studentId:profile.id,relationship:choice.relationship.trim(),isLegalGuardian:choice.isLegalGuardian,isPrimaryContact:choice.isPrimaryContact,isFinancialResponsible:choice.isFinancialResponsible}
        if(choice.kind==='existing'){
          if(unitId)await api.createUnitStudentGuardian(unitId,{...link,guardianId:choice.guardianId},controller.signal)
          else await api.createStudentGuardian({...link,guardianId:choice.guardianId},controller.signal)
        }else if(unitId){await api.createUnitGuardian(unitId,{guardian:{fullName:choice.fullName.trim(),preferredName:choice.preferredName.trim()||null,documentNumber:choice.documentNumber.trim()||null,email:choice.email.trim()||null,phone:choice.phone.trim()||null},link},controller.signal)}
        else{let guardianId=createdGuardians[i];if(!guardianId){const result=await api.createGuardian({fullName:choice.fullName.trim(),preferredName:choice.preferredName.trim()||null,documentNumber:choice.documentNumber.trim()||null,email:choice.email.trim()||null,phone:choice.phone.trim()||null},controller.signal);guardianId=result.guardian.id;setCreatedGuardians(current=>({...current,[i]:guardianId}))}await api.createStudentGuardian({...link,guardianId},controller.signal)}
        done=i+1;setLinked(done)
      }
      if(!controller.signal.aborted)onComplete(profile.id)
    }catch(reason){if(controller.signal.aborted)return;if(reason instanceof ApiError&&reason.status===401)invalidate();else if(reason instanceof ApiError&&[400,403,404,409].includes(reason.status))setError(profile?'Aluno salvo, mas uma etapa complementar falhou. Confira os dados e tente novamente.':'Confira os dados e tente novamente.');else{setUncertain(true);setError(profile?'Aluno salvo. Não foi possível confirmar a última etapa; consulte o perfil antes de tentar novamente.':'Não foi possível confirmar o cadastro. Consulte a lista antes de tentar novamente.')}}finally{if(operation.current===controller)operation.current=null;setBusy(false)}
  }
  return <div className={styles.wizard}><WizardStepper steps={steps} currentStep={step} label="Etapas do cadastro do aluno"/><Card key={step} className={styles.wizardCard}><div className={styles.wizardHeading}><h2 ref={heading} tabIndex={-1}>{steps[step].label}</h2><p>{step===0?'Informe os dados que identificam o aluno.':step===1?'Escolha a turma da primeira matrícula.':step===2?'Vincule responsáveis existentes ou cadastre novos. Você pode fazer isso depois.':'Confira o cadastro antes de salvar.'}</p></div>
    {step===0&&<div className={`${styles.formGrid} ${own.controlsGrid}`}><label>Nome completo<input required maxLength={150} value={student.fullName} onChange={event=>setStudent(current=>({...current,fullName:event.target.value}))}/></label><label>Nome social (opcional)<input maxLength={100} value={student.preferredName??''} onChange={event=>setStudent(current=>({...current,preferredName:event.target.value||null}))}/></label><label>Data de nascimento (opcional)<span className={own.dateField}><input type="date" value={student.birthDate??''} onChange={event=>setStudent(current=>({...current,birthDate:event.target.value||null}))}/></span></label><label>Documento (opcional)<input maxLength={30} value={student.documentNumber??''} onChange={event=>setStudent(current=>({...current,documentNumber:event.target.value||null}))}/></label></div>}
    {step===1&&<div className={`${styles.formGrid} ${own.controlsGrid}`}><label>Unidade<select value={unitChoice} onChange={event=>{setUnitChoice(event.target.value);setClassId('')}} disabled={!!unitId}><option value="">Selecione a unidade</option>{data.units.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Ano letivo<select value={yearChoice} onChange={event=>{setYearChoice(event.target.value);setClassId('')}}><option value="">Selecione o ano letivo</option>{data.years.map(item=><option key={item.id} value={item.id}>{item.year}</option>)}</select></label><label>Série e turma<select required value={classId} onChange={event=>setClassId(event.target.value)}><option value="">Selecione a turma</option>{available.map(item=><option key={item.id} value={item.id}>{classText(item,data)}</option>)}</select></label><label>Início da matrícula<input required type="date" value={startDate} onChange={event=>setStartDate(event.target.value)}/></label></div>}
    {step===2&&<div className={own.guardians}><p>O responsável pode ser vinculado agora ou depois no perfil do aluno.</p>{choices.map((choice,index)=><div className={styles.linkDraft} key={index}><div className={styles.linkHeading}><h3>Responsável {index+1}</h3><Button variant="secondary" onClick={()=>setChoices(current=>current.filter((_,i)=>i!==index))}>Remover</Button></div><div className={`${styles.formGrid} ${own.controlsGrid}`}><label>Cadastro<select value={choice.kind} onChange={event=>updateChoice(index,{kind:event.target.value as GuardianChoice['kind'],guardianId:'',fullName:'',preferredName:''})}><option value="existing">Selecionar existente</option><option value="new">Cadastrar novo</option></select></label>{choice.kind==='existing'?<label>Responsável<select value={choice.guardianId} onChange={event=>updateChoice(index,{guardianId:event.target.value})}><option value="">Selecione</option>{data.guardians.filter(item=>item.status==='ACTIVE').map(item=><option key={item.id} value={item.id}>{item.fullName}</option>)}</select></label>:<><label>Nome completo<input maxLength={150} value={choice.fullName} onChange={event=>updateChoice(index,{fullName:event.target.value})}/></label><label>Nome social (opcional)<input maxLength={100} value={choice.preferredName} onChange={event=>updateChoice(index,{preferredName:event.target.value})}/></label><label>Documento (opcional)<input maxLength={30} value={choice.documentNumber} onChange={event=>updateChoice(index,{documentNumber:event.target.value})}/></label><label>Email (opcional)<input type="email" maxLength={150} value={choice.email} onChange={event=>updateChoice(index,{email:event.target.value})}/></label><label>Telefone (opcional)<input maxLength={30} value={choice.phone} onChange={event=>updateChoice(index,{phone:event.target.value})}/></label></>}<label>Parentesco / relação<input maxLength={30} value={choice.relationship} onChange={event=>updateChoice(index,{relationship:event.target.value})} placeholder="Ex.: Mãe, pai ou tutor"/></label></div><div className={own.flags}><label><input type="checkbox" checked={choice.isLegalGuardian} onChange={event=>updateChoice(index,{isLegalGuardian:event.target.checked})}/> Responsável legal</label><label><input type="checkbox" checked={choice.isPrimaryContact} onChange={event=>updateChoice(index,{isPrimaryContact:event.target.checked})}/> Contato principal</label><label><input type="checkbox" checked={choice.isFinancialResponsible} onChange={event=>updateChoice(index,{isFinancialResponsible:event.target.checked})}/> Responsável financeiro</label></div></div>)}<Button variant="secondary" onClick={()=>setChoices(current=>[...current,newChoice()])}>Adicionar responsável</Button></div>}
    {step===3&&<div className={styles.review}><div><h3>Aluno</h3><p><strong>{student.fullName.trim()}</strong><br/>{student.preferredName||'Sem nome social'}<br/>Nascimento: {dateText(student.birthDate)}<br/>Documento: {student.documentNumber||'Não informado'}</p></div><div><h3>Matrícula</h3><p>{chosen?classText(chosen,data):'Turma não definida'}<br/>Início: {dateText(startDate)}</p></div><div><h3>Responsáveis</h3><p>{choices.length?choices.map(item=>item.kind==='existing'?data.guardians.find(row=>row.id===item.guardianId)?.fullName:item.fullName).join(', '):'Vincular depois'}</p></div></div>}
    {saved&&<p className={styles.notice}>Aluno cadastrado. Matrícula {enrolled?'concluída':'pendente'}; {linked} de {choices.length} responsáveis vinculados.</p>}{error&&<p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.formActions}>{step===0?<Button variant="secondary" onClick={onCancel} disabled={busy}>Cancelar</Button>:<Button variant="secondary" onClick={()=>setStep(value=>value-1)} disabled={busy||!!saved}>Voltar</Button>}{step===2&&<Button variant="secondary" onClick={()=>{setChoices([]);setError('');setStep(3)}} disabled={busy}>Deixar para depois</Button>}{step<3?<Button onClick={next} disabled={busy}>{step===2?'Revisar cadastro':'Próximo'}</Button>:<Button onClick={()=>void finish()} disabled={busy||uncertain}>{busy?'Salvando...':'Cadastrar aluno'}</Button>}</div>
    {uncertain&&<Button variant="secondary" onClick={onCancel}>Consultar lista de alunos</Button>}{saved&&<Button variant="secondary" onClick={()=>onComplete(saved.id)}>Ir ao perfil do aluno</Button>}
  </Card></div>
}

function StudentDetail({student,data,unitId,onRefresh,onNotice}:{student:Student;data:Catalog;unitId:string|undefined;onRefresh:()=>void;onNotice:(message:string)=>void}){
  const [origin]=useSearchParams()
  const fromGuardian=origin.get('guardian')

  const {api,invalidate}=useSession()
  const [editing,setEditing]=useState(false),[draft,setDraft]=useState<StudentInput>(()=>studentDraft(student)),[busy,setBusy]=useState(false),[editError,setEditError]=useState('')
  const operation=useRef<AbortController|null>(null)
  useEffect(()=>()=>operation.current?.abort(),[])
  function cancelEdit(){setDraft(studentDraft(student));setEditError('');setEditing(false)}
  async function saveStudent(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    if(busy)return
    const fullName=draft.fullName.trim()
    if(!fullName){setEditError('Informe o nome completo do aluno.');return}
    const input:StudentInput={fullName,preferredName:draft.preferredName?.trim()||null,birthDate:draft.birthDate||null,documentNumber:draft.documentNumber?.trim()||null,status:draft.status}
    const controller=new AbortController();operation.current=controller;setBusy(true);setEditError('')
    try{
      if(unitId)await api.updateUnitStudent(unitId,student.id,input,controller.signal)
      else await api.updateStudent(student.id,input,controller.signal)
      if(!controller.signal.aborted){setEditing(false);onRefresh()}
    }catch(reason){
      if(controller.signal.aborted)return
      if(reason instanceof ApiError&&reason.status===401)invalidate()
      else if(reason instanceof ApiError&&reason.status===403)setEditError('Você não tem permissão para editar este aluno nesta unidade.')
      else if(reason instanceof ApiError&&[400,404,409].includes(reason.status))setEditError('Não foi possível salvar. Confira os dados e se o aluno ainda pertence a esta unidade.')
      else setEditError(errorMessage(reason))
    }finally{if(operation.current===controller)operation.current=null;setBusy(false)}
  }
  const enrollments=data.enrollments.filter(item=>item.studentId===student.id).sort((a,b)=>b.startDate.localeCompare(a.startDate)),links=data.links.filter(item=>item.studentId===student.id)
  return <div className={styles.detail}><Link to={fromGuardian?`/admin/guardians/${encodeURIComponent(fromGuardian)}?student=${encodeURIComponent(student.id)}`:"/admin/students"} className={styles.back}>Voltar {fromGuardian?"ao responsável":"aos alunos"}<span className={styles.freppMark} aria-hidden="true"><i/><i/><i/></span></Link><Card><div className={`${styles.sectionHeading} ${own.summaryHeading}`}><PersonIdentity name={student.fullName} size="large"><div className={own.summaryName}><h2>{student.fullName}</h2><span className={own.status} data-status={student.status}>{statusLabel[student.status]}</span></div>{student.preferredName&&<p>{student.preferredName}</p>}</PersonIdentity>{!editing&&<Button variant="secondary" onClick={()=>{setDraft(studentDraft(student));setEditError('');setEditing(true)}}>Editar aluno</Button>}</div>
    {editing?<form className={styles.form} onSubmit={event=>void saveStudent(event)}>
      <div className={`${styles.formGrid} ${own.controlsGrid}`}>
        <label>Nome completo<input required maxLength={150} value={draft.fullName} onChange={event=>setDraft(current=>({...current,fullName:event.target.value}))}/></label>
        <label>Nome social (opcional)<input maxLength={100} value={draft.preferredName??''} onChange={event=>setDraft(current=>({...current,preferredName:event.target.value}))}/></label>
        <label>Data de nascimento (opcional)<span className={own.dateField}><input type="date" value={draft.birthDate??''} onChange={event=>setDraft(current=>({...current,birthDate:event.target.value}))}/></span></label>
        <label>Documento (opcional)<input maxLength={30} value={draft.documentNumber??''} onChange={event=>setDraft(current=>({...current,documentNumber:event.target.value}))}/></label>
        <label>Situação<select value={draft.status} onChange={event=>setDraft(current=>({...current,status:event.target.value as Student['status']}))}><option value="ACTIVE">Ativo</option><option value="INACTIVE">Inativo</option></select></label>
      </div>
      {editError&&<p role="alert" className={styles.error}>{editError}</p>}
      <div className={styles.formActions}><Button type="button" variant="secondary" onClick={cancelEdit} disabled={busy}>Cancelar</Button><Button type="submit" disabled={busy}>{busy?'Salvando...':'Salvar alterações'}</Button></div>
    </form>:<div className={own.details}><div><strong>Data de nascimento</strong><span>{dateText(student.birthDate)}</span></div><div><strong>Documento</strong><span>{student.documentNumber??'Não informado'}</span></div></div>}</Card><Card><h2>Matrículas</h2>{enrollments.length?<div className={`${styles.tableCard} ${own.innerTable}`}><table aria-label="Matrículas do aluno"><thead><tr><th>Ano e série</th><th>Turma</th><th>Unidade</th><th>Início</th><th>Fim</th><th>Situação</th></tr></thead><tbody>{enrollments.map(item=>{const classroom=data.classes.find(row=>row.id===item.classId),year=data.years.find(row=>row.id===classroom?.academicYearId),grade=data.grades.find(row=>row.id===classroom?.gradeLevelId),unit=data.units.find(row=>row.id===classroom?.schoolUnitId);return <tr key={item.id}><td data-label="Ano e série">{year?.year??'—'} · {grade?.name??'Série indisponível'}</td><td data-label="Turma">{classroom?.name??'Turma indisponível'}</td><td data-label="Unidade">{unit?.name??'Unidade indisponível'}</td><td data-label="Início">{dateText(item.startDate)}</td><td data-label="Fim">{item.endDate?dateText(item.endDate):'Em aberto'}</td><td data-label="Situação"><span className={own.status} data-status={item.status}>{enrollmentLabel[item.status]}</span></td></tr>})}</tbody></table></div>:<p>Nenhuma matrícula cadastrada.</p>}</Card><Card><h2>Responsáveis</h2>{links.length?<div className={`${styles.tableCard} ${own.innerTable}`}><table aria-label="Responsáveis do aluno"><thead><tr><th>Nome</th><th>Relação</th><th>Responsabilidades</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{links.map(item=>{const guardian=data.guardians.find(row=>row.id===item.guardianId);return <tr key={item.id}><td data-label="Nome">{guardian?<PersonIdentity name={guardian.fullName}><Link className={styles.rowLink} to={`/admin/guardians/${guardian.id}?student=${student.id}`}>{guardian.fullName}<span className={styles.freppMark} aria-hidden="true"><i/><i/><i/></span></Link></PersonIdentity>:'Responsável indisponível'}</td><td data-label="Relação">{item.relationship}</td><td data-label="Responsabilidades">{[item.isLegalGuardian&&'Legal',item.isPrimaryContact&&'Contato principal',item.isFinancialResponsible&&'Financeiro'].filter(Boolean).join(' · ')||'Não informadas'}</td><td data-label="Situação"><span className={own.status} data-status={item.status}>{item.status==='ACTIVE'?'Ativo':'Inativo'}</span></td><td data-label="Ações"><GuardianLinkActions link={item} unitId={unitId} onRefresh={onRefresh} onNotice={onNotice}/></td></tr>})}</tbody></table></div>:<p>Nenhum responsável vinculado.</p>}</Card><StudentGuardianEditor student={student} data={data} unitId={unitId} onRefresh={onRefresh} onNotice={onNotice}/></div>
}

function StudentGuardianEditor({student,data,unitId,onRefresh,onNotice}:{student:Student;data:Catalog;unitId:string|undefined;onRefresh:()=>void;onNotice:(message:string)=>void}){
  const {api,invalidate,state}=useSession()
  const canInvite=!!unitId||(state.status==='authenticated'||state.status==='logging_out')&&state.session.permissions.includes('guardian_onboarding.create')
  const availableGuardians=data.guardians.filter(item=>item.status==='ACTIVE')
  const [open,setOpen]=useState(false),[step,setStep]=useState(0),[choice,setChoice]=useState<GuardianChoice>(newChoice()),[busy,setBusy]=useState(false),[error,setError]=useState(''),[uncertain,setUncertain]=useState(false),[createdGuardianId,setCreatedGuardianId]=useState<string|null>(null),[linkedGuardianId,setLinkedGuardianId]=useState<string|null>(null),[invite,setInvite]=useState(false),[inviteEmail,setInviteEmail]=useState('')
  const heading=useRef<HTMLHeadingElement>(null),emailInput=useRef<HTMLInputElement>(null),inviteEmailInput=useRef<HTMLInputElement>(null)
  useEffect(()=>{if(open)heading.current?.focus({preventScroll:true})},[open,step])
  function start(){setChoice({...newChoice(),kind:availableGuardians.length?'existing':'new'});setStep(0);setError('');setUncertain(false);setCreatedGuardianId(null);setLinkedGuardianId(null);setInvite(false);setInviteEmail('');onNotice('');setOpen(true)}
  function close(){setOpen(false);setError('');setUncertain(false);setCreatedGuardianId(null);setLinkedGuardianId(null);setInvite(false);setInviteEmail('')}
  function cancel(){if(linkedGuardianId){onNotice('Responsável vinculado ao aluno. O convite de acesso não foi confirmado.');onRefresh()}close()}
  function next(){
    setError('')
    if(step===0){
      if(choice.kind==='existing'&&!choice.guardianId){setError('Selecione o responsável.');return}
      if(choice.kind==='new'&&!choice.fullName.trim()){setError('Informe o nome completo do responsável.');return}
    }
    if(step===1&&choice.kind==='new'&&!linkedGuardianId&&!emailInput.current?.checkValidity()){setError('Informe um email válido ou deixe o campo em branco.');return}
    if(step===2&&!choice.relationship.trim()){setError('Informe a relação do responsável com o aluno.');return}
    setStep(current=>current+1)
  }
  async function save(){
    if(!choice.relationship.trim()||choice.kind==='existing'&&!choice.guardianId||choice.kind==='new'&&!choice.fullName.trim()){setError('Complete o responsável e a relação com o aluno.');return}
    if(invite&&canInvite&&(!inviteEmail.trim()||!inviteEmailInput.current?.checkValidity())){setError('Informe um email válido para o convite.');return}
    const controller=new AbortController();setBusy(true);setError('')
    let linkedThisAttempt=false
    try{
      const link={studentId:student.id,relationship:choice.relationship.trim(),isLegalGuardian:choice.isLegalGuardian,isPrimaryContact:choice.isPrimaryContact,isFinancialResponsible:choice.isFinancialResponsible}
      let guardianId=linkedGuardianId
      if(!guardianId){
        if(choice.kind==='existing'){
          if(unitId)await api.createUnitStudentGuardian(unitId,{...link,guardianId:choice.guardianId},controller.signal)
          else await api.createStudentGuardian({...link,guardianId:choice.guardianId},controller.signal)
          guardianId=choice.guardianId
        }else if(unitId){const result=await api.createUnitGuardian(unitId,{guardian:{fullName:choice.fullName.trim(),preferredName:choice.preferredName.trim()||null,documentNumber:choice.documentNumber.trim()||null,email:choice.email.trim()||null,phone:choice.phone.trim()||null},link},controller.signal);guardianId=result.guardian.id}
        else{guardianId=createdGuardianId;if(!guardianId){const result=await api.createGuardian({fullName:choice.fullName.trim(),preferredName:choice.preferredName.trim()||null,documentNumber:choice.documentNumber.trim()||null,email:choice.email.trim()||null,phone:choice.phone.trim()||null},controller.signal);guardianId=result.guardian.id;setCreatedGuardianId(guardianId)}await api.createStudentGuardian({...link,guardianId},controller.signal)}
        setLinkedGuardianId(guardianId)
        linkedThisAttempt=true
      }
      let message='Responsável vinculado ao aluno.'
      if(invite&&canInvite){
        const result=unitId?await api.onboardUnitGuardian(unitId,{guardianId,email:inviteEmail.trim()},controller.signal):await api.onboardGuardian({guardianId,email:inviteEmail.trim()},controller.signal)
        message=result.onboarding.activation==='invitation_sent'?`Convite enviado para ${result.onboarding.email}.`:result.onboarding.activation==='invitation_pending'?`O convite para ${result.onboarding.email} já está pendente.`:'O responsável já tem acesso ao Frepp.'
      }
      close();onNotice(message);onRefresh()
    }catch(reason){const linked=!!linkedGuardianId||linkedThisAttempt;if(reason instanceof ApiError&&reason.status===401)invalidate();else if(reason instanceof ApiError&&[400,403,404,409].includes(reason.status))setError(linked?'Responsável vinculado, mas não foi possível enviar o convite. Confira o email de acesso e tente novamente.':'Não foi possível vincular o responsável. Confira os dados e tente novamente.');else{setUncertain(true);setError(linked?'Responsável vinculado. Não foi possível confirmar o convite; consulte o perfil antes de tentar novamente.':'Não foi possível confirmar o vínculo. Consulte o perfil antes de tentar novamente.')}}finally{setBusy(false)}
  }
  const existingGuardian=availableGuardians.find(item=>item.id===choice.guardianId)
  const guardianName=choice.kind==='existing'?existingGuardian?.fullName:choice.fullName.trim()
  const guardianPreferredName=choice.kind==='existing'?existingGuardian?.preferredName:choice.preferredName.trim()
  const guardianDocument=choice.kind==='existing'?existingGuardian?.documentNumber:choice.documentNumber.trim()
  const guardianEmail=choice.kind==='existing'?existingGuardian?.email:choice.email.trim()
  const guardianPhone=choice.kind==='existing'?existingGuardian?.phone:choice.phone.trim()
  const responsibilities=[choice.isLegalGuardian&&'Responsável legal',choice.isPrimaryContact&&'Contato principal',choice.isFinancialResponsible&&'Responsável financeiro'].filter(Boolean).join(' · ')||'Nenhuma responsabilidade marcada'
  return <Card><div className={styles.sectionHeading}><div><h2>Gerenciar responsáveis</h2><p>Associe um cadastro existente ou crie um responsável para este aluno.</p></div>{!open&&<Button onClick={start}>Adicionar responsável</Button>}</div>{open&&<div className={`${styles.wizard} ${own.guardianWizard}`}><WizardStepper steps={guardianSteps} currentStep={step} label="Etapas do vínculo do responsável"/><div key={step} className={styles.wizardCard}><div className={styles.wizardHeading}><h3 ref={heading} tabIndex={-1}>{guardianSteps[step].label}</h3><p>{step===0?'Selecione um responsável cadastrado ou informe nome e documento.':step===1?'Confira ou informe os contatos do responsável.':step===2?'Defina a relação e as responsabilidades deste vínculo.':'Confira os dados antes de salvar o vínculo.'}</p></div>
    {step===0&&<div className={own.guardianIdentityStep}><div className={`${styles.formGrid} ${own.controlsGrid}`}><label>Cadastro<select value={choice.kind} onChange={event=>{setChoice({...newChoice(),kind:event.target.value as GuardianChoice['kind']});setCreatedGuardianId(null)}}><option value="existing" disabled={!availableGuardians.length}>Selecionar existente</option><option value="new">Cadastrar novo</option></select></label>{choice.kind==='existing'?<label>Responsável<select value={choice.guardianId} onChange={event=>setChoice(current=>({...current,guardianId:event.target.value}))}><option value="">Selecione</option>{availableGuardians.map(item=><option value={item.id} key={item.id}>{item.fullName}</option>)}</select></label>:null}</div>{choice.kind==='new'?<div className={`${styles.formGrid} ${own.controlsGrid}`}><label>Nome completo<input maxLength={150} value={choice.fullName} onChange={event=>setChoice(current=>({...current,fullName:event.target.value}))}/></label><label>Nome social (opcional)<input maxLength={100} value={choice.preferredName} onChange={event=>setChoice(current=>({...current,preferredName:event.target.value}))}/></label><label>Documento (opcional)<input maxLength={30} value={choice.documentNumber} onChange={event=>setChoice(current=>({...current,documentNumber:event.target.value}))}/></label></div>:existingGuardian&&<div className={own.guardianReadOnly}><div><strong>Nome completo</strong><span>{existingGuardian.fullName}</span></div><div><strong>Nome social</strong><span>{existingGuardian.preferredName||'Não informado'}</span></div><div><strong>Documento</strong><span>{existingGuardian.documentNumber||'Não informado'}</span></div></div>}</div>}
    {step===1&&(choice.kind==='new'?<div className={`${styles.formGrid} ${own.controlsGrid}`}><label>Email (opcional)<input ref={emailInput} type="email" maxLength={150} value={choice.email} onChange={event=>setChoice(current=>({...current,email:event.target.value}))} disabled={!!linkedGuardianId}/></label><label>Telefone (opcional)<input maxLength={30} value={choice.phone} onChange={event=>setChoice(current=>({...current,phone:event.target.value}))} disabled={!!linkedGuardianId}/></label></div>:<div className={own.guardianReadOnly}><div><strong>Email</strong><span>{guardianEmail||'Não informado'}</span></div><div><strong>Telefone</strong><span>{guardianPhone||'Não informado'}</span></div></div>)}
    {step===2&&<div className={own.guardianLinkStep}><div className={`${styles.formGrid} ${own.controlsGrid}`}><label>Parentesco / relação<input maxLength={30} value={choice.relationship} onChange={event=>setChoice(current=>({...current,relationship:event.target.value}))} placeholder="Ex.: Mãe, pai ou tutor"/></label></div><div><h4>Responsabilidades</h4><div className={own.flags}><label><input type="checkbox" checked={choice.isLegalGuardian} onChange={event=>setChoice(current=>({...current,isLegalGuardian:event.target.checked}))}/> Responsável legal</label><label><input type="checkbox" checked={choice.isPrimaryContact} onChange={event=>setChoice(current=>({...current,isPrimaryContact:event.target.checked}))}/> Contato principal</label><label><input type="checkbox" checked={choice.isFinancialResponsible} onChange={event=>setChoice(current=>({...current,isFinancialResponsible:event.target.checked}))}/> Responsável financeiro</label></div></div></div>}
    {step===3&&<><div className={`${styles.review} ${own.guardianReview}`}><div><h4>Responsável</h4><p><strong>{guardianName}</strong><br/>Nome social: {guardianPreferredName||'Não informado'}<br/>Documento: {guardianDocument||'Não informado'}</p></div><div><h4>Contatos</h4><p>Email: {guardianEmail||'Não informado'}<br/>Telefone: {guardianPhone||'Não informado'}</p></div><div><h4>Vínculo com {student.fullName}</h4><p>Relação: {choice.relationship.trim()}<br/>{responsibilities}</p></div></div>{canInvite&&<div className={own.guardianInvite}><label className={own.inviteChoice}><input type="checkbox" checked={invite} onChange={event=>setInvite(event.target.checked)}/> Enviar convite de acesso ao Frepp</label>{invite&&<label>Email para o convite<input ref={inviteEmailInput} type="email" maxLength={150} value={inviteEmail} onChange={event=>setInviteEmail(event.target.value)} placeholder="email.de.acesso@exemplo.com"/></label>}<p>O email de acesso é confirmado aqui e pode ser diferente do contato cadastrado.</p></div>}</>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.formActions}>{step===0?<Button variant="secondary" onClick={cancel} disabled={busy}>Cancelar</Button>:<Button variant="secondary" onClick={()=>{setError('');setStep(current=>current-1)}} disabled={busy||!!linkedGuardianId}>Voltar</Button>}{step===3&&linkedGuardianId&&<Button variant="secondary" onClick={()=>{close();onNotice('Responsável vinculado ao aluno. Convite não enviado.');onRefresh()}} disabled={busy}>Concluir sem convite</Button>}{step<3?<Button onClick={next} disabled={busy}>Próximo</Button>:<Button onClick={()=>void save()} disabled={busy||uncertain}>{busy?'Salvando...':'Salvar responsável'}</Button>}</div>
  </div></div>}</Card>
}
