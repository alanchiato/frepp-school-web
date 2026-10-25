import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Forbidden } from '../../app/SystemStates'
import { useSession } from '../../session/context'
import type { AcademicYear, Classroom, ClassroomInput, GradeLevel, GradeLevelInput, UnitOption } from '../../shared/api/contracts'
import { ApiError, errorMessage } from '../../shared/api/errors'
import { Button, Card, ErrorState } from '../../shared/components/ui'
import { useUnitScope } from '../unitadmins/UnitScopeContext'
import styles from './academic-structure.module.css'

type Tab = 'grades' | 'classes'
type FormMode = 'create' | 'edit' | null
type GradeDraft = { code: string; name: string; displayOrder: string }
type ClassDraft = { name: string; schoolUnitId: string; academicYearId: string; gradeLevelId: string }
const emptyGrade: GradeDraft = { code: '', name: '', displayOrder: '' }
const emptyClass: ClassDraft = { name: '', schoolUnitId: '', academicYearId: '', gradeLevelId: '' }

export function AcademicStructurePage() {
  const { state, api, invalidate } = useSession()
  const scope = useUnitScope()
  const unitId = scope?.selectedUnit?.id
  const permissions = state.status === 'authenticated' || state.status === 'logging_out' ? state.session.permissions : []
  const canCreateGrade = !scope && permissions.includes('grade_levels.create')
  const canEditGrade = !scope && permissions.includes('grade_levels.update')
  const canCreateClass = !!scope || permissions.includes('classes.create')
  const canEditClass = !!scope || permissions.includes('classes.update')
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: Tab = searchParams.get('tab') === 'turmas' ? 'classes' : 'grades'
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [grades, setGrades] = useState<GradeLevel[] | null>(null)
  const [classes, setClasses] = useState<Classroom[] | null>(null)
  const [years, setYears] = useState<AcademicYear[] | null>(null)
  const [units, setUnits] = useState<UnitOption[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [forbidden, setForbidden] = useState(false)
  const [reload, setReload] = useState(0)
  const [yearFilter, setYearFilter] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [unitFilter, setUnitFilter] = useState('')
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | null>(null)
  const [selectedClass, setSelectedClass] = useState<Classroom | null>(null)
  const [gradeDraft, setGradeDraft] = useState<GradeDraft>(emptyGrade)
  const [classDraft, setClassDraft] = useState<ClassDraft>(emptyClass)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const operation = useRef<AbortController | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    setGrades(null); setClasses(null); setYears(null); setUnits(null); setLoadError(''); setForbidden(false)
    if (scope && !unitId) return () => controller.abort()
    const gradeRequest = unitId ? api.unitGradeLevels(unitId, controller.signal) : api.gradeLevels(controller.signal)
    const classRequest = unitId ? api.unitClassrooms(unitId, controller.signal) : api.classrooms(controller.signal)
    const yearRequest = unitId ? api.unitAcademicYears(unitId, controller.signal) : api.academicYears(controller.signal)
    const unitRequest = scope ? Promise.resolve({ units: scope.units ?? [] }) : api.units(controller.signal)
    void Promise.all([gradeRequest, classRequest, yearRequest, unitRequest]).then(([g, c, y, u]) => {
      if (controller.signal.aborted) return
      setGrades(g.gradeLevels); setClasses(c.classes); setYears(y.academicYears); setUnits(u.units)
      const today = new Date().toISOString().slice(0, 10)
      const current = y.academicYears.find(item => item.startDate <= today && item.endDate >= today)
      setYearFilter(previous => y.academicYears.some(item => item.id === previous) ? previous : current?.id ?? [...y.academicYears].sort((a,b) => b.year-a.year)[0]?.id ?? '')
      setGradeFilter(previous => g.gradeLevels.some(item => item.id === previous) ? previous : '')
      setUnitFilter(previous => u.units.some(item => item.id === previous) ? previous : '')
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      if (error instanceof ApiError && error.status === 401) invalidate()
      else if (error instanceof ApiError && error.status === 403) setForbidden(true)
      else setLoadError(errorMessage(error))
    })
    return () => controller.abort()
  }, [api, invalidate, reload, unitId, !!scope])
  useEffect(() => () => operation.current?.abort(), [])
  useEffect(() => { if (formMode) heading.current?.focus({ preventScroll: true }) }, [formMode, tab])
  useEffect(() => { setFormMode(null); setFormError(''); setUncertain(false) }, [unitId])

  const loaded = grades !== null && classes !== null && years !== null && units !== null
  const sortedGrades = [...(grades ?? [])].sort((a,b) => a.displayOrder-b.displayOrder || a.name.localeCompare(b.name,'pt-BR'))
  const filteredClasses = (classes ?? []).filter(item => (!yearFilter || item.academicYearId === yearFilter) && (!gradeFilter || item.gradeLevelId === gradeFilter) && (scope || !unitFilter || item.schoolUnitId === unitFilter))
    .sort((a,b) => (grades?.find(g => g.id === a.gradeLevelId)?.displayOrder ?? 999999)-(grades?.find(g => g.id === b.gradeLevelId)?.displayOrder ?? 999999) || a.name.localeCompare(b.name,'pt-BR'))
  const gradeName = (id: string | null) => grades?.find(item => item.id === id)?.name ?? 'Série não definida'
  const unitName = (id: string) => units?.find(item => item.id === id)?.name ?? 'Unidade indisponível'
  const yearName = (id: string) => years?.find(item => item.id === id)?.year ?? 'Ano indisponível'

  function selectTab(next: Tab) { setSearchParams(next === 'classes' ? {tab:'turmas'} : {}, {replace:true}) }
  function changeTab(next: Tab) { selectTab(next); setFormMode(null); setFormError(''); setUncertain(false) }
  function backToList() { setFormMode(null); setFormError(''); setUncertain(false); if (uncertain) setReload(value => value + 1) }
  function startGrade(item?: GradeLevel) {
    selectTab('grades'); setSelectedGrade(item ?? null); setGradeDraft(item ? {code:item.code,name:item.name,displayOrder:String(item.displayOrder)} : emptyGrade)
    setFormError(''); setUncertain(false); setFormMode(item ? 'edit' : 'create')
  }
  function startClass(item?: Classroom) {
    selectTab('classes'); setSelectedClass(item ?? null)
    setClassDraft(item ? {name:item.name,schoolUnitId:item.schoolUnitId,academicYearId:item.academicYearId,gradeLevelId:item.gradeLevelId ?? ''}
      : { ...emptyClass, schoolUnitId:unitId || unitFilter || (units?.length === 1 ? units[0].id : ''), academicYearId:yearFilter, gradeLevelId:gradeFilter || (grades?.length === 1 ? grades[0].id : '') })
    setFormError(''); setUncertain(false); setFormMode(item ? 'edit' : 'create')
  }
  async function saveGrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || uncertain) return
    const input: GradeLevelInput = {code:gradeDraft.code.trim(),name:gradeDraft.name.trim(),displayOrder:Number(gradeDraft.displayOrder)}
    if (!input.code || input.code.length > 50 || !input.name || input.name.length > 100 || !/^\d+$/.test(gradeDraft.displayOrder) || input.displayOrder > 2147483647) {
      setFormError('Informe nome, código e ordem válidos para a série.'); return
    }
    const controller = new AbortController(); operation.current = controller; setBusy(true); setFormError('')
    try {
      if (formMode === 'edit' && selectedGrade) await api.updateGradeLevel(selectedGrade.id,input,controller.signal)
      else await api.createGradeLevel(input,controller.signal)
      if (!controller.signal.aborted) {setFormMode(null);setReload(value => value + 1)}
    } catch (error) { if (!controller.signal.aborted) handleSaveError(error,'Já existe uma série com esse nome ou código.') }
    finally {if(operation.current===controller)operation.current=null;setBusy(false)}
  }
  async function saveClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || uncertain) return
    const input: ClassroomInput = {name:classDraft.name.trim(),schoolUnitId:unitId ?? classDraft.schoolUnitId,academicYearId:classDraft.academicYearId,gradeLevelId:classDraft.gradeLevelId}
    if (!input.name || input.name.length > 150 || !input.schoolUnitId || !input.academicYearId || !grades?.some(item => item.id === input.gradeLevelId)) {
      setFormError('Informe nome, unidade, ano letivo e série para a turma.'); return
    }
    const controller = new AbortController(); operation.current = controller; setBusy(true); setFormError('')
    try {
      if (formMode === 'edit' && selectedClass) {
        const patch = {name:input.name,gradeLevelId:input.gradeLevelId}
        if (unitId) await api.updateUnitClassroom(unitId,selectedClass.id,patch,controller.signal)
        else await api.updateClassroom(selectedClass.id,patch,controller.signal)
      } else if (unitId) await api.createUnitClassroom(unitId,input,controller.signal)
      else await api.createClassroom(input,controller.signal)
      if (!controller.signal.aborted) {setFormMode(null);setReload(value => value + 1)}
    } catch (error) { if (!controller.signal.aborted) handleSaveError(error,'Já existe uma turma com esse nome nessa unidade e ano letivo.') }
    finally {if(operation.current===controller)operation.current=null;setBusy(false)}
  }
  function handleSaveError(error: unknown, conflict: string) {
    if (error instanceof ApiError && error.status === 401) invalidate()
    else if (error instanceof ApiError && error.status === 409) setFormError(conflict)
    else if (error instanceof ApiError && error.status === 400) setFormError('Confira os dados informados e tente novamente.')
    else if (error instanceof ApiError && error.status === 403) setFormError(errorMessage(error))
    else if (error instanceof ApiError && error.status === 404) setFormError('Um dos registros não está mais disponível. Volte à lista e atualize os dados.')
    else {setUncertain(true);setFormError('Não foi possível confirmar a gravação. Volte à lista e confira os dados antes de tentar novamente.')}
  }

  if (forbidden) return <Forbidden onRetry={() => setReload(value => value + 1)} />
  return <div className={styles.page}>
    <header className={styles.pageHeading}><p className="eyebrow">ORGANIZAÇÃO ACADÊMICA</p><h1>Séries e turmas</h1><p>Cadastre as séries da escola e organize as turmas por unidade e ano letivo.</p></header>
    <div role="tablist" aria-label="Organização acadêmica" className={styles.tabs}>
      <button type="button" role="tab" aria-selected={tab==='grades'} aria-controls="structure-panel" onClick={() => changeTab('grades')}>Séries</button>
      <button type="button" role="tab" aria-selected={tab==='classes'} aria-controls="structure-panel" onClick={() => changeTab('classes')}>Turmas</button>
    </div>
    <div id="structure-panel" role="tabpanel" className={styles.panel}>
      {scope && !unitId ? <Card><p>{scope.units===null ? 'Carregando unidades...' : 'Você não tem unidade ativa para organizar turmas.'}</p></Card>
      : loadError ? <ErrorState title="Não foi possível carregar séries e turmas" message={loadError} onRetry={() => setReload(value => value + 1)} />
      : !loaded ? <p role="status">Carregando séries e turmas...</p>
      : tab === 'grades' ? <>
        <div className={styles.sectionHeading}><div><h2 ref={heading} tabIndex={-1}>Séries</h2><p>Defina as etapas oferecidas pela escola. Elas podem ser usadas em diferentes anos letivos.</p></div>{canCreateGrade && !formMode && <Button onClick={() => startGrade()}>Nova série</Button>}</div>
        {formMode ? <Card><form className={styles.form} onSubmit={event => void saveGrade(event)}><h3>{formMode==='create'?'Cadastrar série':'Editar série'}</h3>
          <div className={styles.formGrid}><label>Nome da série<input required maxLength={100} value={gradeDraft.name} onChange={event=>setGradeDraft(current=>({...current,name:event.target.value}))} disabled={busy} placeholder="Ex.: 1º Ano" /></label>
            <label>Código<input required maxLength={50} value={gradeDraft.code} onChange={event=>setGradeDraft(current=>({...current,code:event.target.value}))} disabled={busy} placeholder="Ex.: 1ANO" /></label>
            <label>Ordem de exibição<input required type="number" min="0" max="2147483647" step="1" value={gradeDraft.displayOrder} onChange={event=>setGradeDraft(current=>({...current,displayOrder:event.target.value}))} disabled={busy} /></label></div>
          {formError && <p role="alert" className={styles.error}>{formError}</p>}
          <div className={styles.formActions}><Button variant="secondary" onClick={backToList} disabled={busy}>Voltar às séries</Button><Button type="submit" disabled={busy||uncertain}>{busy?'Salvando...':'Salvar série'}</Button></div>
        </form></Card>
        : sortedGrades.length===0 ? <Card className={styles.empty}><h3>Nenhuma série cadastrada</h3><p>{scope ? 'Peça ao administrador da escola para cadastrar uma série antes de criar turmas.' : 'Cadastre a primeira série para depois criar turmas vinculadas a ela.'}</p>{canCreateGrade && <Button onClick={() => startGrade()}>Cadastrar primeira série</Button>}</Card>
        : <Card className={styles.tableCard}><table><thead><tr><th>Nome</th><th>Código</th><th>Ordem</th>{canEditGrade&&<th>Ações</th>}</tr></thead><tbody>{sortedGrades.map(item=><tr key={item.id}><td data-label="Nome"><strong>{item.name}</strong></td><td data-label="Código">{item.code}</td><td data-label="Ordem">{item.displayOrder}</td>{canEditGrade&&<td data-label="Ações"><Button variant="secondary" onClick={() => startGrade(item)}>Editar</Button></td>}</tr>)}</tbody></table></Card>}
      </> : <>
        <div className={styles.sectionHeading}><div><h2 ref={heading} tabIndex={-1}>Turmas</h2><p>Cada turma pertence a uma série, uma unidade e um ano letivo.</p></div>{canCreateClass && !formMode && grades.length>0 && years.length>0 && units.length>0 && <Button onClick={() => startClass()}>Nova turma</Button>}</div>
        {formMode ? <Card><form className={styles.form} onSubmit={event => void saveClass(event)}><h3>{formMode==='create'?'Cadastrar turma':'Editar turma'}</h3>
          <div className={styles.formGrid}><label>Nome da turma<input required maxLength={150} value={classDraft.name} onChange={event=>setClassDraft(current=>({...current,name:event.target.value}))} disabled={busy} placeholder="Ex.: Turma A" /></label>
            <label>Série<select required value={classDraft.gradeLevelId} onChange={event=>setClassDraft(current=>({...current,gradeLevelId:event.target.value}))} disabled={busy}><option value="">Selecione a série</option>{sortedGrades.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            {scope ? <label>Unidade<input value={scope.selectedUnit?.name??''} readOnly /></label> : <label>Unidade<select required value={classDraft.schoolUnitId} onChange={event=>setClassDraft(current=>({...current,schoolUnitId:event.target.value}))} disabled={busy||formMode==='edit'}><option value="">Selecione a unidade</option>{units.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
            <label>Ano letivo<select required value={classDraft.academicYearId} onChange={event=>setClassDraft(current=>({...current,academicYearId:event.target.value}))} disabled={busy||formMode==='edit'}><option value="">Selecione o ano</option>{[...years].sort((a,b)=>b.year-a.year).map(item=><option key={item.id} value={item.id}>{item.year}</option>)}</select></label></div>
          {formMode==='edit'&&<p className={styles.hint}>A unidade e o ano letivo permanecem vinculados ao histórico desta turma.</p>}
          {formError && <p role="alert" className={styles.error}>{formError}</p>}
          <div className={styles.formActions}><Button variant="secondary" onClick={backToList} disabled={busy}>Voltar às turmas</Button><Button type="submit" disabled={busy||uncertain}>{busy?'Salvando...':'Salvar turma'}</Button></div>
        </form></Card>
        : <><div className={styles.filters}><label>Ano letivo<select value={yearFilter} onChange={event=>setYearFilter(event.target.value)}><option value="">Todos os anos</option>{[...years].sort((a,b)=>b.year-a.year).map(item=><option key={item.id} value={item.id}>{item.year}</option>)}</select></label>
          <label>Série<select value={gradeFilter} onChange={event=>setGradeFilter(event.target.value)}><option value="">Todas as séries</option>{sortedGrades.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          {!scope&&<label>Unidade<select value={unitFilter} onChange={event=>setUnitFilter(event.target.value)}><option value="">Todas as unidades</option>{units.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}</div>
          {grades.length===0 ? <Card className={styles.empty}><h3>Cadastre uma série primeiro</h3><p>{scope ? 'Peça ao administrador da escola para cadastrar a série desta turma.' : 'A turma precisa estar vinculada a uma série da escola.'}</p>{canCreateGrade&&<Button onClick={() => startGrade()}>Cadastrar série</Button>}</Card>
          : years.length===0 ? <Card className={styles.empty}><h3>Cadastre um ano letivo primeiro</h3><p>A turma precisa pertencer a um ano letivo.</p><Link to="/admin/academic-years">Ir para Anos letivos</Link></Card>
          : units.length===0 ? <Card className={styles.empty}><h3>Cadastre uma unidade primeiro</h3><p>A turma precisa pertencer a uma unidade.</p><Link to="/admin/units">Ir para Unidades</Link></Card>
          : filteredClasses.length===0 ? <Card className={styles.empty}><h3>Nenhuma turma encontrada</h3><p>Não há turmas para os filtros selecionados.</p>{canCreateClass&&<Button onClick={() => startClass()}>Cadastrar turma</Button>}</Card>
          : <Card className={styles.tableCard}><table><thead><tr><th>Turma</th><th>Série</th><th>Unidade</th><th>Ano letivo</th>{canEditClass&&<th>Ações</th>}</tr></thead><tbody>{filteredClasses.map(item=><tr key={item.id}><td data-label="Turma"><Link className={styles.classLink} to={`/admin/classes/${item.id}${scope?`?unit=${encodeURIComponent(item.schoolUnitId)}`:''}`}>{item.name}<span className={styles.freppMark} aria-hidden="true"><i/><i/><i/></span></Link></td><td data-label="Série">{gradeName(item.gradeLevelId)}</td><td data-label="Unidade">{unitName(item.schoolUnitId)}</td><td data-label="Ano letivo">{yearName(item.academicYearId)}</td>{canEditClass&&<td data-label="Ações"><Button variant="secondary" onClick={() => startClass(item)}>Editar</Button></td>}</tr>)}</tbody></table></Card>}</>}
      </>}
    </div>
    <Link to="/" className={styles.back}>Voltar à Visão geral<span className={styles.freppMark} aria-hidden="true"><i/><i/><i/></span></Link>
  </div>
}
