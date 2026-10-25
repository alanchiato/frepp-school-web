import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Forbidden } from '../../app/SystemStates'
import { useSession } from '../../session/context'
import type { AcademicYear, Classroom, GradeLevel, Subject, Teacher, TeacherAssignment, TeacherAssignmentDatesPatch, TeacherAssignmentInput, TeacherInput, TeacherRole, TeacherUser, UnitOption } from '../../shared/api/contracts'
import { ApiError, errorMessage } from '../../shared/api/errors'
import { Button, Card, ErrorState } from '../../shared/components/ui'
import { WizardStepper } from '../../shared/components/WizardStepper'
import { useUnitScope } from '../unitadmins/UnitScopeContext'
import styles from './teachers.module.css'

type Catalog = { teachers: Teacher[]; assignments: TeacherAssignment[]; classes: Classroom[]; subjects: Subject[]; units: UnitOption[]; grades: GradeLevel[]; years: AcademicYear[]; teacherUsers: TeacherUser[] }
type LinkDraft = { classId: string; role: TeacherRole; subjectId: string; startDate: string }
const today = () => new Date().toISOString().slice(0, 10)
const emptyLink = (): LinkDraft => ({ classId: '', role: 'SUBJECT_TEACHER', subjectId: '', startDate: today() })
const roleLabel: Record<TeacherRole,string> = { REGENT_TEACHER:'Regente', SUBJECT_TEACHER:'Professor de disciplina', SUBSTITUTE_TEACHER:'Substituto' }
const assignmentStatusLabel: Record<TeacherAssignment['status'],string> = { ACTIVE:'Ativo', SCHEDULED:'Agendado', ENDED:'Encerrado', CANCELLED:'Cancelado' }
const teacherSteps = [
  { label:'Dados do professor', compact:'Dados' },
  { label:'Vínculos acadêmicos', compact:'Vínculos' },
  { label:'Acesso ao Frepp', compact:'Acesso' },
  { label:'Revisão', compact:'Revisão' },
] as const

function displayDate(value: string) {
  const [year,month,day]=value.split('-')
  return year&&month&&day?`${day}/${month}/${year}`:value
}
function classLabel(item: Classroom, data: Catalog) {
  const grade = data.grades.find(row => row.id === item.gradeLevelId)?.name ?? 'Série não definida'
  const unit = data.units.find(row => row.id === item.schoolUnitId)?.name ?? 'Unidade indisponível'
  const year = data.years.find(row => row.id === item.academicYearId)?.year ?? 'Ano indisponível'
  return `${grade} · ${item.name} · ${unit} · ${year}`
}
function validLink(draft: LinkDraft, data: Catalog) {
  return data.classes.some(row => row.id === draft.classId) && !!draft.startDate && (draft.role !== 'SUBJECT_TEACHER' || data.subjects.some(row => row.id === draft.subjectId))
}
function AssignmentFields({ value, onChange, data, disabled }: { value: LinkDraft; onChange: (next: LinkDraft) => void; data: Catalog; disabled: boolean }) {
  return <div className={styles.formGrid}>
    <label>Turma<select required value={value.classId} onChange={event => onChange({...value,classId:event.target.value})} disabled={disabled}><option value="">Selecione a turma</option>{data.classes.map(item => <option key={item.id} value={item.id}>{classLabel(item,data)}</option>)}</select></label>
    <label>Tipo de vínculo<select value={value.role} onChange={event => onChange({...value,role:event.target.value as TeacherRole,subjectId:event.target.value==='SUBJECT_TEACHER'?value.subjectId:''})} disabled={disabled}>{Object.entries(roleLabel).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    {value.role==='SUBJECT_TEACHER' && <label>Disciplina<select required value={value.subjectId} onChange={event => onChange({...value,subjectId:event.target.value})} disabled={disabled}><option value="">Selecione a disciplina</option>{data.subjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
    <label>Início do vínculo<input required type="date" value={value.startDate} onChange={event => onChange({...value,startDate:event.target.value})} disabled={disabled} /></label>
  </div>
}

export function TeachersPage() {
  const { state, api, invalidate } = useSession()
  const scope = useUnitScope()
  const unitId = scope?.selectedUnit?.id
  const { teacherId } = useParams()
  const navigate = useNavigate()
  const permissions = state.status === 'authenticated' || state.status === 'logging_out' ? state.session.permissions : []
  const canCreate = !scope && permissions.includes('teachers.create')
  const [data, setData] = useState<Catalog | null>(null)
  const [error, setError] = useState('')
  const [forbidden, setForbidden] = useState(false)
  const [reload, setReload] = useState(0)
  const [wizard, setWizard] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setData(null); setError(''); setForbidden(false)
    if (scope && !unitId) return () => controller.abort()
    const signal = controller.signal
    const requests = unitId ? [api.unitTeachers(unitId,signal),api.unitTeacherAssignments(unitId,signal),api.unitClassrooms(unitId,signal),api.unitSubjects(unitId,signal),Promise.resolve({units:scope?.units??[]}),api.unitGradeLevels(unitId,signal),api.unitAcademicYears(unitId,signal),Promise.resolve({teacherUsers:[]})]
      : [api.teachers(signal),api.teacherAssignments(signal),api.classrooms(signal),api.subjects(signal),api.units(signal),api.gradeLevels(signal),api.academicYears(signal),api.teacherUsers(signal)]
    void Promise.all(requests).then(([t,a,c,s,u,g,y,tu]) => {
      if (signal.aborted) return
      setData({teachers:(t as {teachers:Teacher[]}).teachers,assignments:(a as {teacherAssignments:TeacherAssignment[]}).teacherAssignments,classes:(c as {classes:Classroom[]}).classes,subjects:(s as {subjects:Subject[]}).subjects,units:(u as {units:UnitOption[]}).units,grades:(g as {gradeLevels:GradeLevel[]}).gradeLevels,years:(y as {academicYears:AcademicYear[]}).academicYears,teacherUsers:(tu as {teacherUsers:TeacherUser[]}).teacherUsers})
    }).catch((reason: unknown) => {
      if (signal.aborted) return
      if (reason instanceof ApiError && reason.status === 401) invalidate()
      else if (reason instanceof ApiError && reason.status === 403) setForbidden(true)
      else setError(errorMessage(reason))
    })
    return () => controller.abort()
  }, [api, invalidate, reload, unitId, !!scope, scope?.units])

  if (forbidden) return <Forbidden onRetry={() => setReload(value => value+1)} />
  const selected = data?.teachers.find(item => item.id === teacherId)
  const filtered = [...(data?.teachers??[])].filter(item => `${item.name} ${item.email??''}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))
  return <div className={`${styles.page} ${wizard ? styles.wizardPage : ''}`}>
    <header className={styles.pageHeading}><p className="eyebrow">PESSOAS</p><h1>{teacherId ? 'Perfil do professor' : wizard ? 'Cadastrar professor' : 'Professores'}</h1><p>{teacherId ? 'Consulte os dados, os vínculos acadêmicos e o acesso do professor.' : wizard ? 'Cadastre o professor e escolha quando criar os vínculos e o acesso.' : 'Gerencie os professores da escola e seus vínculos com turmas.'}</p></header>
    {scope && !unitId ? <Card><p>{scope.units===null?'Carregando unidades...':'Você não tem unidade ativa para consultar professores.'}</p></Card>
    : error ? <ErrorState title="Não foi possível carregar professores" message={error} onRetry={() => setReload(value=>value+1)} />
    : !data ? <p role="status">Carregando professores...</p>
    : teacherId ? selected ? <TeacherDetail teacher={selected} data={data} unitId={unitId} readOnly={!!scope} onRefresh={()=>setReload(value=>value+1)} /> : <Card><h2>Professor não encontrado</h2><Link to="/admin/teachers">Voltar aos professores</Link></Card>
    : wizard ? <TeacherWizard data={data} onCancel={()=>setWizard(false)} onComplete={id=>{setWizard(false);navigate(`/admin/teachers/${id}`);setReload(value=>value+1)}} />
    : <><div className={styles.sectionHeading}><div><h2>Professores da escola</h2><p>{scope ? `Catálogo da escola; os vínculos e totais de turmas se referem à unidade ${scope.selectedUnit?.name}.` : 'O cadastro pertence à escola; os vínculos indicam as turmas em que cada professor atua.'}</p></div>{canCreate&&<Button onClick={()=>setWizard(true)}>Novo professor</Button>}</div>
      <label className={styles.search}>Buscar por nome ou email<input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar professor" /></label>
      {filtered.length===0 ? <Card className={styles.empty}><h3>{search?'Nenhum professor encontrado':'Nenhum professor cadastrado'}</h3><p>{scope?'Peça ao administrador da escola para cadastrar o primeiro professor.':'Cadastre um professor para começar. O vínculo com turma pode ser feito depois.'}</p>{canCreate&&!search&&<Button onClick={()=>setWizard(true)}>Cadastrar primeiro professor</Button>}</Card>
      : <Card className={styles.tableCard}><table><thead><tr><th>Professor</th><th>Email de contato</th><th>Turmas</th>{!scope&&<th>Acesso</th>}</tr></thead><tbody>{filtered.map(item=><tr key={item.id}><td data-label="Professor"><Link className={styles.rowLink} to={`/admin/teachers/${item.id}`}>{item.name}<span className={styles.freppMark} aria-hidden="true"><i/><i/><i/></span></Link></td><td data-label="Email">{item.email??'Não informado'}</td><td data-label="Turmas">{new Set(data.assignments.filter(link=>link.teacherId===item.id).map(link=>link.classId)).size}</td>{!scope&&<td data-label="Acesso">{data.teacherUsers.some(link=>link.teacherId===item.id)?'Vinculado':'Não vinculado'}</td>}</tr>)}</tbody></table></Card>}</>}
    {!teacherId&&<Link to="/" className={styles.back}>Voltar à Visão geral<span className={styles.freppMark} aria-hidden="true"><i/><i/><i/></span></Link>}
  </div>
}

function TeacherWizard({ data, onCancel, onComplete }: { data: Catalog; onCancel:()=>void; onComplete:(id:string)=>void }) {
  const { api, invalidate } = useSession()
  const [step,setStep]=useState(0)
  const [teacher,setTeacher]=useState<TeacherInput>({name:'',email:null})
  const [links,setLinks]=useState<LinkDraft[]>([])
  const [invite,setInvite]=useState(false)
  const [inviteEmail,setInviteEmail]=useState('')
  const [saved,setSaved]=useState<Teacher|null>(null)
  const [completed,setCompleted]=useState(0)
  const [invited,setInvited]=useState(false)
  const [busy,setBusy]=useState(false)
  const [uncertain,setUncertain]=useState(false)
  const [error,setError]=useState('')
  const operation=useRef<AbortController|null>(null)
  const stepHeading=useRef<HTMLHeadingElement>(null)
  useEffect(()=>()=>operation.current?.abort(),[])
  useEffect(()=>{stepHeading.current?.focus({preventScroll:true})},[step])
  const names=teacherSteps.map(item=>item.label)
  function next() {
    setError('')
    if(step===0 && (!teacher.name.trim() || [...teacher.name.trim()].length>150 || (teacher.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teacher.email)))) {setError('Informe um nome válido e confira o email de contato.');return}
    if(step===1 && links.some(link=>!validLink(link,data))) {setError('Complete turma, tipo, disciplina e data dos vínculos adicionados.');return}
    if(step===2 && invite && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {setError('Informe um email válido para o convite.');return}
    setStep(value=>Math.min(value+1,3))
  }
  async function finish() {
    if(busy||uncertain)return
    const controller=new AbortController();operation.current=controller;setBusy(true);setError('')
    let profile=saved,done=completed
    try {
      if(!profile){const result=await api.createTeacher({name:teacher.name.trim(),email:teacher.email?.trim()||null},controller.signal);profile=result.teacher;setSaved(profile)}
      for(let index=done;index<links.length;index++){
        const link=links[index]
        const input:TeacherAssignmentInput={teacherId:profile.id,classId:link.classId,role:link.role,subjectId:link.subjectId||null,startDate:link.startDate}
        await api.createTeacherAssignment(input,controller.signal)
        done=index+1;setCompleted(done)
      }
      if(invite&&!invited){await api.onboardTeacher({teacherId:profile.id,email:inviteEmail.trim()},controller.signal);setInvited(true)}
      if(!controller.signal.aborted)onComplete(profile.id)
    }catch(reason){
      if(controller.signal.aborted)return
      if(reason instanceof ApiError&&reason.status===401)invalidate()
      else if(reason instanceof ApiError&&[400,403,404,409].includes(reason.status))setError(profile ? 'O professor foi cadastrado, mas uma etapa complementar não foi concluída. Revise os vínculos ou o convite e tente novamente.' : reason.status===409?'Já existe um professor com este email de contato.':'Confira os dados do professor e tente novamente.')
      else {setUncertain(true);setError(profile?'O professor foi cadastrado. Não foi possível confirmar a última etapa; confira o perfil antes de tentar novamente.':'Não foi possível confirmar o cadastro. Consulte a lista antes de tentar novamente.')}
    }finally{if(operation.current===controller)operation.current=null;setBusy(false)}
  }
  return <div className={styles.wizard}>
    <WizardStepper steps={teacherSteps} currentStep={step} label="Etapas do cadastro do professor" />
    <Card key={step} className={styles.wizardCard}><div className={styles.wizardHeading}><h2 ref={stepHeading} tabIndex={-1}>{names[step]}</h2><p>{step===1?'Selecione uma ou mais turmas, ou deixe esta etapa para depois.':step===2?'O convite pode ser enviado agora ou mais tarde no perfil do professor.':step===3?'Confira as escolhas antes de cadastrar o professor.':'Informe os dados de contato que o sistema armazena hoje.'}</p></div>
      {step===0&&<div className={styles.formGrid}><label>Nome completo<input required maxLength={150} value={teacher.name} onChange={event=>setTeacher(current=>({...current,name:event.target.value}))} placeholder="Ex.: Mariana Costa Souza" /></label><label>Email de contato (opcional)<input type="email" maxLength={254} value={teacher.email??''} onChange={event=>{const email=event.target.value;setTeacher(current=>({...current,email:email||null}));if(!inviteEmail)setInviteEmail(email)}} placeholder="professor@escola.com" /></label></div>}
      {step===1&&<div className={styles.linkStep}>{data.classes.length===0?<p>Não há turmas cadastradas. Você pode continuar e criar o vínculo depois.</p>:<>
        {links.map((link,index)=><div className={styles.linkDraft} key={index}><div className={styles.linkHeading}><h3>Vínculo {index+1}</h3><Button variant="secondary" onClick={()=>setLinks(current=>current.filter((_,i)=>i!==index))}>Remover</Button></div><AssignmentFields value={link} onChange={next=>setLinks(current=>current.map((item,i)=>i===index?next:item))} data={data} disabled={busy} /></div>)}
        <Button variant="secondary" onClick={()=>setLinks(current=>[...current,emptyLink()])}>Adicionar vínculo</Button>{data.subjects.length===0&&<p>Para vínculo como professor de disciplina, <Link to="/admin/subjects">cadastre a disciplina</Link> primeiro. Regência e substituição continuam disponíveis.</p>}</>}
      </div>}
      {step===2&&<div className={styles.access}><label className={styles.check}><input type="checkbox" checked={invite} onChange={event=>{setInvite(event.target.checked);if(event.target.checked&&!inviteEmail)setInviteEmail(teacher.email??'')}} /> Enviar convite de acesso ao Frepp</label>{invite&&<label>Email de acesso<input type="email" required maxLength={150} value={inviteEmail} onChange={event=>setInviteEmail(event.target.value)} placeholder="professor@escola.com" /></label>}<p>O convite cria o perfil de acesso de professor. O email de acesso pode ser diferente do contato informado no cadastro.</p></div>}
      {step===3&&<div className={styles.review}><div><h3>Professor</h3><p><strong>{teacher.name.trim()}</strong><br/>{teacher.email||'Sem email de contato'}</p></div><div><h3>Vínculos acadêmicos</h3>{links.length?links.map((link,index)=><p key={index}>{classLabel(data.classes.find(item=>item.id===link.classId)!,data)} · {roleLabel[link.role]}{link.subjectId?` · ${data.subjects.find(item=>item.id===link.subjectId)?.name}`:''} · {link.startDate}</p>):<p>Deixar para depois</p>}</div><div><h3>Acesso ao Frepp</h3><p>{invite?`Enviar convite para ${inviteEmail}`:'Deixar para depois'}</p></div></div>}
      {saved&&<p className={styles.notice}>Professor cadastrado. {completed} de {links.length} vínculo(s) concluído(s). {invited?'Convite processado.':''}</p>}
      {error&&<p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.formActions}>{step===0?<Button variant="secondary" onClick={onCancel} disabled={busy}>Cancelar</Button>:<Button variant="secondary" onClick={()=>setStep(value=>value-1)} disabled={busy||!!saved}>Voltar</Button>}
        {step===1&&<Button variant="secondary" onClick={()=>{setLinks([]);setError('');setStep(2)}}>Deixar para depois</Button>}
        {step<3?(step!==1||links.length>0)&&<Button onClick={next} disabled={busy}>{step===2?'Revisar cadastro':'Próximo'}</Button>:<Button onClick={()=>void finish()} disabled={busy||uncertain}>{busy?'Cadastrando...':saved?'Concluir etapas pendentes':'Cadastrar professor'}</Button>}
      </div>
      {uncertain&&<Button variant="secondary" onClick={onCancel}>Consultar lista de professores</Button>}
      {saved&&<Button variant="secondary" onClick={()=>onComplete(saved.id)}>Ir ao perfil do professor</Button>}
    </Card>
  </div>
}

function TeacherDetail({teacher,data,unitId,readOnly,onRefresh}:{teacher:Teacher;data:Catalog;unitId:string|undefined;readOnly:boolean;onRefresh:()=>void}) {
  const {api,invalidate}=useSession()
  const [edit,setEdit]=useState(false)
  const [draft,setDraft]=useState<TeacherInput>({name:teacher.name,email:teacher.email})
  const [linkOpen,setLinkOpen]=useState(false)
  const [link,setLink]=useState<LinkDraft>(emptyLink())
  const [editingAssignmentId,setEditingAssignmentId]=useState<string|null>(null)
  const [dates,setDates]=useState<TeacherAssignmentDatesPatch>({startDate:'',endDate:null})
  const [inviteOpen,setInviteOpen]=useState(false)
  const [inviteEmail,setInviteEmail]=useState(teacher.email??'')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const assignmentRows=data.assignments.filter(item=>item.teacherId===teacher.id)
  const linked=data.teacherUsers.some(item=>item.teacherId===teacher.id)
  async function run(action:(signal:AbortSignal)=>Promise<unknown>,success:string){
    const controller=new AbortController();setBusy(true);setError('');setMessage('')
    try{await action(controller.signal);setMessage(success);setEdit(false);setLinkOpen(false);setEditingAssignmentId(null);setInviteOpen(false);onRefresh()}
    catch(reason){if(reason instanceof ApiError&&reason.status===401)invalidate();else setError(reason instanceof ApiError&&reason.status===409?'Já existe um registro com esses dados.':reason instanceof ApiError&&reason.status===400?'Confira os dados informados.':errorMessage(reason))}
    finally{setBusy(false)}
  }
  function saveTeacher(event:FormEvent){event.preventDefault();void run(signal=>api.updateTeacher(teacher.id,{name:draft.name.trim(),email:draft.email?.trim()||null},signal),'Dados atualizados.')}
  function saveLink(event:FormEvent){event.preventDefault();if(!validLink(link,data)){setError('Complete os dados do vínculo.');return}const input:TeacherAssignmentInput={teacherId:teacher.id,classId:link.classId,role:link.role,subjectId:link.subjectId||null,startDate:link.startDate};void run(signal=>unitId?api.createUnitTeacherAssignment(unitId,input,signal):api.createTeacherAssignment(input,signal),'Vínculo criado.')}
  function saveAssignmentDates(event:FormEvent){
    event.preventDefault()
    if(!editingAssignmentId||!dates.startDate||dates.endDate!==null&&dates.endDate<=dates.startDate){setError('A data final deve ser posterior à data de início.');return}
    void run(signal=>unitId?api.updateUnitTeacherAssignmentDates(unitId,editingAssignmentId,dates,signal):api.updateTeacherAssignmentDates(editingAssignmentId,dates,signal),'Vigência do vínculo atualizada.')
  }
  function saveInvite(event:FormEvent){event.preventDefault();void run(signal=>api.onboardTeacher({teacherId:teacher.id,email:inviteEmail.trim()},signal),'Acesso processado. Confira o email de convite.')}
  return <div className={styles.detail}>
    <Link to="/admin/teachers" className={styles.back}>Voltar aos professores<span className={styles.freppMark} aria-hidden="true"><i/><i/><i/></span></Link>
    {message&&<p role="status" className={styles.notice}>{message}</p>}{error&&<p role="alert" className={styles.error}>{error}</p>}
    <Card><div className={styles.sectionHeading}><div><h2>{teacher.name}</h2><p>{teacher.email??'Sem email de contato'}</p></div>{!readOnly&&!edit&&<Button variant="secondary" onClick={()=>{setDraft({name:teacher.name,email:teacher.email});setEdit(true)}}>Editar dados</Button>}</div>
      {edit&&<form className={styles.form} onSubmit={saveTeacher}><div className={styles.formGrid}><label>Nome<input required maxLength={150} value={draft.name} onChange={event=>setDraft(current=>({...current,name:event.target.value}))} /></label><label>Email de contato<input type="email" maxLength={254} value={draft.email??''} onChange={event=>setDraft(current=>({...current,email:event.target.value||null}))} /></label></div><div className={styles.formActions}><Button variant="secondary" onClick={()=>setEdit(false)}>Cancelar</Button><Button type="submit" disabled={busy}>Salvar dados</Button></div></form>}
    </Card>
    <Card><div className={styles.sectionHeading}><div><h2>Vínculos acadêmicos</h2><p>{unitId?'Turmas e disciplinas da unidade selecionada.':'Turmas e disciplinas vinculadas a este professor.'}</p></div>{!linkOpen&&data.classes.length>0&&<Button onClick={()=>setLinkOpen(true)}>Adicionar vínculo</Button>}</div>
      {assignmentRows.length===0?<p>Nenhum vínculo cadastrado. É possível criá-lo depois do cadastro.</p>:<div className={`${styles.tableCard} ${styles.assignmentTable}`}><table aria-label="Vínculos acadêmicos do professor"><thead><tr><th>Série</th><th>Turma</th><th>Disciplina / função</th><th>Unidade</th><th>Vigência</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{assignmentRows.map(item=>{
        const classroom=data.classes.find(row=>row.id===item.classId)
        const grade=data.grades.find(row=>row.id===classroom?.gradeLevelId)
        const unit=data.units.find(row=>row.id===classroom?.schoolUnitId)
        const year=data.years.find(row=>row.id===classroom?.academicYearId)
        const subject=data.subjects.find(row=>row.id===item.subjectId)
        return <tr key={item.id}><td data-label="Série">{grade?.name??'Série indisponível'}</td><td data-label="Turma"><strong>{classroom?.name??'Turma indisponível'}</strong>{year&&<small>Ano letivo {year.year}</small>}</td><td data-label="Disciplina / função">{subject?.name??roleLabel[item.role]}{subject&&<small>{roleLabel[item.role]}</small>}</td><td data-label="Unidade">{unit?.name??'Unidade indisponível'}</td><td data-label="Vigência">{displayDate(item.startDate)}{item.endDate&&<> até {displayDate(item.endDate)}</>}</td><td data-label="Situação"><span className={styles.assignmentStatus} data-status={item.status}>{assignmentStatusLabel[item.status]}</span></td><td data-label="Ações">{(!readOnly||unitId)&&<Button variant="secondary" onClick={()=>{setError('');setEditingAssignmentId(item.id);setDates({startDate:item.startDate,endDate:item.endDate});setLinkOpen(false)}} disabled={busy}>Editar vigência</Button>}</td></tr>
      })}</tbody></table></div>}
      {editingAssignmentId&&<form className={`${styles.form} ${styles.editAssignmentForm}`} onSubmit={saveAssignmentDates}><div><h3>Editar vigência</h3><p>Altere as datas do vínculo. A situação {assignmentStatusLabel[assignmentRows.find(item=>item.id===editingAssignmentId)?.status??'ACTIVE'].toLowerCase()} será mantida.</p></div><div className={styles.formGrid}><label>Data de início<input type="date" required value={dates.startDate} onChange={event=>setDates(current=>({...current,startDate:event.target.value}))} disabled={busy}/></label><label>Data final (opcional)<input type="date" value={dates.endDate??''} onChange={event=>setDates(current=>({...current,endDate:event.target.value||null}))} disabled={busy}/></label></div><p className={styles.hint}>A data final, quando informada, é o primeiro dia sem vínculo ativo.</p><div className={styles.formActions}><Button variant="secondary" onClick={()=>setEditingAssignmentId(null)} disabled={busy}>Cancelar</Button><Button type="submit" disabled={busy}>{busy?'Salvando...':'Salvar vigência'}</Button></div></form>}
      {linkOpen&&<form className={styles.form} onSubmit={saveLink}><AssignmentFields value={link} onChange={setLink} data={data} disabled={busy}/><div className={styles.formActions}><Button variant="secondary" onClick={()=>setLinkOpen(false)}>Cancelar</Button><Button type="submit" disabled={busy}>Salvar vínculo</Button></div></form>}
    </Card>
    {!readOnly&&<Card><div className={styles.sectionHeading}><div><h2>Acesso ao Frepp</h2><p>{linked?'Este professor tem uma conta vinculada.':'Este professor ainda não tem uma conta vinculada.'}</p></div>{!inviteOpen&&<Button variant="secondary" onClick={()=>setInviteOpen(true)}>{linked?'Reenviar convite ou confirmar acesso':'Convidar professor'}</Button>}</div>
      {inviteOpen&&<form className={styles.form} onSubmit={saveInvite}><label>Email de acesso<input type="email" required maxLength={150} value={inviteEmail} onChange={event=>setInviteEmail(event.target.value)} /></label><p>Se a conta já estiver ativa, o Core mantém o acesso existente e não envia outro convite.</p><div className={styles.formActions}><Button variant="secondary" onClick={()=>setInviteOpen(false)}>Cancelar</Button><Button type="submit" disabled={busy}>Confirmar acesso</Button></div></form>}
    </Card>}
  </div>
}
