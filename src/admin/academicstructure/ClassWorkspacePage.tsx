import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useSession } from '../../session/context'
import type { ClassWorkspace } from '../../shared/api/contracts'
import { ApiError, errorMessage } from '../../shared/api/errors'
import { Card, ErrorState } from '../../shared/components/ui'
import { PersonAvatar, PersonIdentity } from '../../shared/components/PersonAvatar'
import { Icon, type IconName } from '../../shared/components/Icon'
import { useUnitScope } from '../unitadmins/UnitScopeContext'
import styles from './class-workspace.module.css'

type Tab = 'students' | 'teachers' | 'subjects' | 'information'
const tabs: { id: Tab; label: string }[] = [
  {id:'students',label:'Alunos'}, {id:'teachers',label:'Professores'},
  {id:'subjects',label:'Disciplinas'}, {id:'information',label:'Informações'},
]
const roles: Record<ClassWorkspace['teachers'][number]['role'],string> = {
  REGENT_TEACHER:'Regente', SUBJECT_TEACHER:'Professor da disciplina', SUBSTITUTE_TEACHER:'Substituto',
}
const listPath='/admin/academic-structure?tab=turmas'

export function ClassWorkspacePage() {
  const { classId = '' }=useParams()
  const [searchParams,setSearchParams]=useSearchParams()
  const tab=tabs.find(item=>item.id===searchParams.get('section'))?.id ?? 'students'
  const {api,invalidate}=useSession()
  const scope=useUnitScope()
  const [workspace,setWorkspace]=useState<ClassWorkspace|null>(null)
  const [error,setError]=useState('')
  const [missing,setMissing]=useState(false)
  const [forbidden,setForbidden]=useState(false)
  const [reload,setReload]=useState(0)
  const unitHint=searchParams.get('unit')

  useEffect(()=>{
    const controller=new AbortController()
    queueMicrotask(()=>{if(!controller.signal.aborted){setWorkspace(null);setError('');setMissing(false);setForbidden(false)}})
    if(scope && scope.units===null) return ()=>controller.abort()
    async function load(){
      if(!scope) return (await api.classWorkspace(classId,controller.signal)).workspace
      const available=scope.units ?? []
      const candidates=unitHint && available.some(unit=>unit.id===unitHint)
        ? [unitHint] : [scope.selectedUnit?.id,...available.map(unit=>unit.id)].filter((value,index,all):value is string=>!!value&&all.indexOf(value)===index)
      for(const unitId of candidates){
        try {return (await api.unitClassWorkspace(unitId,classId,controller.signal)).workspace}
        catch(reason){if(reason instanceof ApiError&&reason.status===404)continue;throw reason}
      }
      throw new ApiError(404,'not_found')
    }
    queueMicrotask(()=>{if(controller.signal.aborted)return;void load().then(result=>{if(!controller.signal.aborted){setWorkspace(result);if(scope && result && scope.selectedUnit?.id!==result.class.schoolUnitId)scope.selectUnit(result.class.schoolUnitId)}})
      .catch((reason:unknown)=>{if(controller.signal.aborted)return
        if(reason instanceof ApiError&&reason.status===401)invalidate()
        else if(reason instanceof ApiError&&reason.status===403)setForbidden(true)
        else if(reason instanceof ApiError&&reason.status===404)setMissing(true)
        else setError(errorMessage(reason))})})
    return ()=>controller.abort()
  },[api,invalidate,classId,scope,unitHint,reload])

  function selectTab(next:Tab){setSearchParams(previous=>{const params=new URLSearchParams(previous);if(next==='students')params.delete('section');else params.set('section',next);return params})}
  if(forbidden)return <Card><h1>Acesso não autorizado</h1><p>Você não tem acesso a esta turma.</p><Link to={listPath}>Voltar às turmas</Link></Card>
  if(missing)return <Card><h1>Turma não encontrada</h1><p>Ela pode ter sido removida ou estar fora das suas unidades autorizadas.</p><Link to={listPath}>Voltar às turmas</Link></Card>
  if(error)return <ErrorState title="Não foi possível carregar a turma" message={error} onRetry={()=>setReload(value=>value+1)} />
  if(!workspace)return <p role="status">Carregando espaço da turma...</p>
  const data=workspace
  const teacherGroups=groupTeachers(data.teachers)
  return <div className={styles.page}>
    <header className={styles.heading}><p className="eyebrow">ESPAÇO DA TURMA</p><h1>{data.class.name}</h1><p>{data.gradeLevelName ? `${data.gradeLevelName} · ` : ''}{data.unitName} · Ano letivo {data.academicYear}</p></header>
    <section className={styles.metrics} aria-label="Resumo da turma">
      <MetricCard theme="students" icon="student" label="Alunos matriculados" value={data.counts.students} />
      <MetricCard theme="teachers" icon="teacher" label="Professores vigentes" value={data.counts.teachers} />
      <MetricCard theme="subjects" icon="book" label="Disciplinas com docente" value={data.counts.subjects} />
    </section>
    <div role="tablist" aria-label="Seções da turma" className={styles.tabs}>{tabs.map(item=><button key={item.id} role="tab" type="button" aria-selected={tab===item.id} aria-controls="workspace-panel" onClick={()=>selectTab(item.id)}>{item.label}</button>)}</div>
    <div id="workspace-panel" role="tabpanel" className={styles.panel}>
      {tab==='students' && <Card className={styles.sectionCard}>
        <SectionHeading theme="students" icon="student" title="Alunos da turma" detail="Matrículas vigentes nesta turma" />
        {data.students.length===0?<p className={styles.empty}>Nenhum aluno com matrícula vigente nesta turma.</p>:
          <div className={styles.tableWrap}><table aria-label="Alunos matriculados na turma"><thead><tr><th>Aluno</th><th>Início da matrícula</th></tr></thead><tbody>{data.students.map(student=><tr key={student.enrollmentId}><td data-label="Aluno"><PersonIdentity name={student.fullName}><Link className={styles.rowLink} to={`/admin/students/${student.id}`}>{student.fullName}<span className={styles.freppMark} aria-hidden="true"><i/><i/><i/></span></Link>{student.preferredName&&<small>Nome social: {student.preferredName}</small>}</PersonIdentity></td><td data-label="Início da matrícula">{formatDate(student.startDate)}</td></tr>)}</tbody></table></div>}
      </Card>}
      {tab==='teachers' && <Card className={styles.sectionCard}>
        <SectionHeading theme="teachers" icon="teacher" title="Professores da turma" detail="Docentes e suas atribuições vigentes nesta turma" />
        {teacherGroups.length===0?<p className={styles.empty}>Nenhum professor com atribuição vigente nesta turma.</p>:
          <div className={styles.tableWrap}><table className={styles.teacherTable} aria-label="Professores atribuídos à turma"><colgroup><col className={styles.teacherColumn}/><col className={styles.subjectColumn}/><col className={styles.roleColumn}/><col className={styles.periodColumn}/></colgroup><thead><tr><th>Professor</th><th>Disciplina</th><th>Tipo de vínculo</th><th>Vigência</th></tr></thead><tbody>{teacherGroups.flatMap(teacher=>teacher.assignments.map((assignment,index)=><tr key={assignment.assignmentId} data-group-start={index===0} data-group-end={index===teacher.assignments.length-1}>{index===0&&<td rowSpan={teacher.assignments.length} data-label="Professor" className={styles.teacherCell}><div className={styles.teacherIdentity}><PersonAvatar name={teacher.name}/><div><Link className={styles.rowLink} to={`/admin/teachers/${teacher.id}`}>{teacher.name}<span className={styles.freppMark} aria-hidden="true"><i/><i/><i/></span></Link><small>{teacher.assignments.length} {teacher.assignments.length===1?'atuação':'atuações'} nesta turma</small></div></div></td>}<td data-label="Disciplina"><strong>{assignment.subjectName??(assignment.role==='REGENT_TEACHER'?'Regência da turma':'Sem disciplina específica')}</strong></td><td data-label="Tipo de vínculo"><span className={styles.roleBadge} data-role={assignment.role}>{roles[assignment.role]}</span></td><td data-label="Vigência"><span className={styles.teachingPeriod}>{assignment.endDate?`${formatDate(assignment.startDate)} até ${formatDate(assignment.endDate)}`:`Desde ${formatDate(assignment.startDate)}`}</span></td></tr>))}</tbody></table></div>}
      </Card>}
      {tab==='subjects' && <Card className={styles.sectionCard}>
        <SectionHeading theme="subjects" icon="book" title="Disciplinas com docente" detail="Disciplinas com atribuição docente vigente" />
        {data.subjects.length===0?<p className={styles.empty}>Nenhuma disciplina possui professor vigente nesta turma.</p>:
          <div className={styles.tableWrap}><table aria-label="Disciplinas com professores vigentes"><thead><tr><th>Disciplina</th><th>Docentes</th></tr></thead><tbody>{data.subjects.map(subject=><tr key={subject.id}><td data-label="Disciplina"><strong>{subject.name}</strong></td><td data-label="Docentes"><span className={styles.facultyList}>{subject.teacherIds.map(id=>data.teachers.find(item=>item.id===id)).filter((item):item is ClassWorkspace['teachers'][number]=>!!item).map(item=><PersonIdentity key={item.id} name={item.name}><span>{item.name}</span></PersonIdentity>)}</span></td></tr>)}</tbody></table></div>}
        <p className={styles.note}>A escola ainda não vincula um catálogo curricular completo diretamente à turma.</p>
      </Card>}
      {tab==='information' && <Card className={styles.sectionCard}>
        <SectionHeading theme="information" icon="school" title="Informações da turma" detail="Dados administrativos do cadastro" />
        <dl className={styles.info}><div><dt>Turma</dt><dd>{data.class.name}</dd></div><div><dt>Série</dt><dd>{data.gradeLevelName??'Não informada'}</dd></div><div><dt>Unidade</dt><dd>{data.unitName}</dd></div><div><dt>Ano letivo</dt><dd>{data.academicYear}</dd></div></dl>
      </Card>}
    </div>
    <Link className={styles.back} to={listPath}>Voltar às turmas<span className={styles.freppMark} aria-hidden="true"><i/><i/><i/></span></Link>
  </div>
}
function formatDate(value:string){const [y,m,d]=value.split('-');return `${d}/${m}/${y}`}

function groupTeachers(teachers:ClassWorkspace['teachers']) {
  const groups=new Map<string,{id:string;name:string;assignments:ClassWorkspace['teachers']}>()
  for(const teacher of teachers){
    const group=groups.get(teacher.id)
    if(group)group.assignments.push(teacher)
    else groups.set(teacher.id,{id:teacher.id,name:teacher.name,assignments:[teacher]})
  }
  return [...groups.values()]
}

function MetricCard({theme,icon,label,value}:{theme:Tab;icon:IconName;label:string;value:number}) {
  return <Card className={`${styles.metricCard} ${styles[theme]}`}><span className={styles.metricIcon} data-theme={theme}><Icon name={icon}/></span><div><span>{label}</span><strong>{value.toLocaleString('pt-BR')}</strong></div></Card>
}
function SectionHeading({theme,icon,title,detail}:{theme:Tab;icon:IconName;title:string;detail:string}) {
  return <div className={styles.sectionHeading} data-theme={theme}><span className={styles.sectionIcon}><Icon name={icon}/></span><div><h2>{title}</h2><p>{detail}</p></div></div>
}
