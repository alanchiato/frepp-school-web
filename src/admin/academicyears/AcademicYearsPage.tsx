import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Forbidden } from '../../app/SystemStates'
import { useSession } from '../../session/context'
import type { AcademicYear, AcademicYearInput } from '../../shared/api/contracts'
import { ApiError, errorMessage } from '../../shared/api/errors'
import { Button, Card, ErrorState } from '../../shared/components/ui'
import { Icon } from '../../shared/components/Icon'
import styles from './academic-years.module.css'
import { useUnitScope } from '../unitadmins/UnitScopeContext'

type Screen = 'list' | 'create' | 'edit'
type Draft = { year: string; startDate: string; endDate: string }
const emptyDraft: Draft = { year: '', startDate: '', endDate: '' }
const formatDate = (value: string) => { const [year, month, day] = value.split('-'); return `${day}/${month}/${year}` }

export function AcademicYearsPage() {
  const { state, api, invalidate } = useSession()
  const scope = useUnitScope()
  const unitId = scope?.selectedUnit?.id
  const pageRef = useRef<HTMLDivElement>(null)
  const operation = useRef<AbortController | null>(null)
  const [years, setYears] = useState<AcademicYear[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [forbidden, setForbidden] = useState(false)
  const [reload, setReload] = useState(0)
  const [screen, setScreen] = useState<Screen>('list')
  const [selected, setSelected] = useState<AcademicYear | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const permissions = state.status === 'authenticated' || state.status === 'logging_out' ? state.session.permissions : []
  const canCreate = !scope && permissions.includes('academic_years.create')
  const canEdit = !scope && permissions.includes('academic_years.update')

  useEffect(() => {
    const controller = new AbortController()
    setYears(null); setLoadError(''); setForbidden(false)
    if (scope && !unitId) return () => controller.abort()
    void (unitId ? api.unitAcademicYears(unitId,controller.signal) : api.academicYears(controller.signal)).then(result => {
      if (!controller.signal.aborted) setYears(result.academicYears)
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      if (error instanceof ApiError && error.status === 401) invalidate()
      else if (error instanceof ApiError && error.status === 403) setForbidden(true)
      else setLoadError(errorMessage(error))
    })
    return () => controller.abort()
  }, [api, invalidate, reload, unitId, !!scope])
  useEffect(() => () => operation.current?.abort(), [])
  useEffect(() => { const heading = pageRef.current?.querySelector('h1'); if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }) } }, [screen])

  function backToList() {
    setScreen('list');setSelected(null);setFormError('');setUncertain(false)
    if (uncertain || loadError) setReload(value => value + 1)
  }
  function startCreate() {setDraft(emptyDraft);setSelected(null);setFormError('');setUncertain(false);setScreen('create')}
  async function startEdit(item: AcademicYear) {
    const controller = new AbortController();operation.current = controller;setBusy(true);setFormError('')
    try {
      const result = await api.academicYear(item.id,controller.signal)
      if (controller.signal.aborted) return
      setSelected(result.academicYear)
      setDraft({year:String(result.academicYear.year),startDate:result.academicYear.startDate,endDate:result.academicYear.endDate})
      setUncertain(false);setScreen('edit')
    } catch(error) {
      if (controller.signal.aborted) return
      if (error instanceof ApiError && error.status === 401) invalidate()
      else if (error instanceof ApiError && error.status === 404) {setFormError('Este ano letivo não está mais disponível. Atualize a lista.');setReload(value=>value+1)}
      else setFormError(errorMessage(error))
    } finally {if (operation.current === controller) operation.current = null;setBusy(false)}
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || uncertain) return
    const input: AcademicYearInput = {year:Number(draft.year),startDate:draft.startDate,endDate:draft.endDate}
    if (!Number.isInteger(input.year) || input.year < -2147483648 || input.year > 2147483647 || !draft.year.trim() || !input.startDate || !input.endDate || input.startDate > input.endDate) {
      setFormError('Informe o ano e um período válido, com início anterior ou igual ao fim.');return
    }
    const controller = new AbortController();operation.current = controller;setBusy(true);setFormError('')
    try {
      if (screen === 'edit' && selected) await api.updateAcademicYear(selected.id,input,controller.signal)
      else await api.createAcademicYear(input,controller.signal)
      if (controller.signal.aborted) return
      setScreen('list');setSelected(null);setDraft(emptyDraft);setReload(value=>value+1)
    } catch(error) {
      if (controller.signal.aborted) return
      if (error instanceof ApiError && error.status === 401) invalidate()
      else if (error instanceof ApiError && error.status === 409) setFormError('Já existe um ano letivo com esse número.')
      else if (error instanceof ApiError && error.status === 400) setFormError('Confira o ano e as datas informadas.')
      else if (error instanceof ApiError && error.status === 404) setFormError('Este ano letivo não está mais disponível. Volte à lista e confira os dados.')
      else if (error instanceof ApiError && error.status === 403) setFormError(errorMessage(error))
      else {setUncertain(true);setFormError('Não foi possível confirmar a gravação. Volte à lista e verifique os dados antes de tentar novamente.')}
    } finally {if (operation.current === controller) operation.current = null;setBusy(false)}
  }

  if (forbidden) return <Forbidden onRetry={() => setReload(value => value + 1)} />
  return <div className={styles.page} ref={pageRef}>
    {screen === 'list' && <>
      <header className={styles.heading}><div><p className="eyebrow">ORGANIZAÇÃO ACADÊMICA</p><h1>Anos letivos</h1><p>Organize os períodos da escola e preserve os anos anteriores para consulta.</p></div>{canCreate && <Button onClick={startCreate}>Cadastrar ano letivo</Button>}</header>
      {scope && !unitId ? <Card>{scope.units===null ? <p role="status">Carregando unidades...</p> : <p>Nenhuma unidade ativa disponível para consultar anos letivos.</p>}</Card>
        : loadError ? <ErrorState title="Não foi possível carregar os anos letivos" message={loadError} onRetry={() => setReload(value => value + 1)} />
        : years === null ? <p role="status">Carregando anos letivos...</p>
          : years.length === 0 ? <Card className={styles.empty}><span className={styles.icon}><Icon name="calendar" /></span><h2>Nenhum ano letivo cadastrado</h2><p>Defina o ano e as datas de início e fim para começar a organizar a vida acadêmica.</p>{canCreate && <Button onClick={startCreate}>Cadastrar primeiro ano letivo</Button>}</Card>
            : <ul className={styles.list}>{years.map(item => <li key={item.id}><Card className={styles.item}><span className={styles.icon}><Icon name="calendar" /></span><div className={styles.itemText}><h2>{item.year}</h2><p>{formatDate(item.startDate)} a {formatDate(item.endDate)}</p></div>{canEdit && <Button variant="secondary" onClick={() => void startEdit(item)} disabled={busy}>Editar</Button>}</Card></li>)}</ul>}
      {formError && <p role="alert" className={styles.error}>{formError}</p>}
    </>}
    {(screen === 'create' || screen === 'edit') && <>
      <header><p className="eyebrow">ANOS LETIVOS / {screen === 'create' ? 'NOVO CADASTRO' : 'EDIÇÃO'}</p><h1>{screen === 'create' ? 'Cadastrar ano letivo' : `Editar ano letivo ${selected?.year ?? ''}`}</h1><p>Informe o ano e o período completo. O histórico dos anos anteriores continuará disponível.</p></header>
      <Card><form className={styles.form} onSubmit={event => void save(event)}>
        <label>Ano letivo<input type="number" required step="1" value={draft.year} onChange={event=>setDraft(current=>({...current,year:event.target.value}))} disabled={busy} /></label>
        <div className={styles.dates}><label>Data de início<input type="date" required value={draft.startDate} onChange={event=>setDraft(current=>({...current,startDate:event.target.value}))} disabled={busy} /></label><label>Data de fim<input type="date" required value={draft.endDate} min={draft.startDate || undefined} onChange={event=>setDraft(current=>({...current,endDate:event.target.value}))} disabled={busy} /></label></div>
        <p className={styles.hint}>O ano letivo vigente é identificado pelas datas do período; não há ativação manual.</p>
        {formError && <p role="alert" className={styles.error}>{formError}</p>}
        <div className={styles.actions}><Button variant="secondary" onClick={backToList} disabled={busy}>Voltar aos anos letivos</Button><Button type="submit" disabled={busy || uncertain}>{busy ? 'Salvando...' : screen === 'create' ? 'Salvar ano letivo' : 'Salvar alterações'}</Button></div>
      </form></Card>
      <Link to="/" className={styles.back}>Voltar à Visão geral</Link>
    </>}
  </div>
}
