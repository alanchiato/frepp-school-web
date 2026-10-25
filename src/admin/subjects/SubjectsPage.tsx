import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Forbidden } from '../../app/SystemStates'
import { useSession } from '../../session/context'
import type { Subject, SubjectInput } from '../../shared/api/contracts'
import { ApiError, errorMessage } from '../../shared/api/errors'
import { Button, Card, ErrorState } from '../../shared/components/ui'
import { useUnitScope } from '../unitadmins/UnitScopeContext'
import styles from './subjects.module.css'

const empty: SubjectInput = { code: '', name: '' }

export function SubjectsPage() {
  const { state, api, invalidate } = useSession()
  const scope = useUnitScope()
  const unitId = scope?.selectedUnit?.id
  const permissions = state.status === 'authenticated' || state.status === 'logging_out' ? state.session.permissions : []
  const canCreate = !scope && permissions.includes('subjects.create')
  const canEdit = !scope && permissions.includes('subjects.update')
  const [subjects, setSubjects] = useState<Subject[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [forbidden, setForbidden] = useState(false)
  const [reload, setReload] = useState(0)
  const [editing, setEditing] = useState<Subject | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState<SubjectInput>(empty)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const operation = useRef<AbortController | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    setSubjects(null); setLoadError(''); setForbidden(false)
    if (scope && !unitId) return () => controller.abort()
    const request = unitId ? api.unitSubjects(unitId, controller.signal) : api.subjects(controller.signal)
    void request.then(result => { if (!controller.signal.aborted) setSubjects(result.subjects) }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      if (error instanceof ApiError && error.status === 401) invalidate()
      else if (error instanceof ApiError && error.status === 403) setForbidden(true)
      else setLoadError(errorMessage(error))
    })
    return () => controller.abort()
  }, [api, invalidate, reload, unitId, !!scope])
  useEffect(() => () => operation.current?.abort(), [])
  useEffect(() => { if (formOpen) heading.current?.focus({ preventScroll: true }) }, [formOpen])
  useEffect(() => { setFormOpen(false); setUncertain(false); setFormError('') }, [unitId])

  function openForm(item?: Subject) {
    setEditing(item ?? null); setDraft(item ? { code: item.code, name: item.name } : empty)
    setFormError(''); setUncertain(false); setFormOpen(true)
  }
  function closeForm() { setFormOpen(false); setFormError(''); if (uncertain) setReload(value => value + 1); setUncertain(false) }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || uncertain || (!editing && !canCreate) || (editing && !canEdit)) return
    const input = { code: draft.code.trim(), name: draft.name.trim() }
    if (!input.code || !input.name || [...input.code].length > 50 || [...input.name].length > 150) { setFormError('Informe um código e um nome válidos.'); return }
    const controller = new AbortController(); operation.current = controller; setBusy(true); setFormError('')
    try {
      if (editing) await api.updateSubject(editing.id, input, controller.signal)
      else await api.createSubject(input, controller.signal)
      if (!controller.signal.aborted) { setFormOpen(false); setReload(value => value + 1) }
    } catch (error) {
      if (!controller.signal.aborted) {
        if (error instanceof ApiError && error.status === 401) invalidate()
        else if (error instanceof ApiError && error.status === 409) setFormError('Já existe uma disciplina com esse código ou nome na escola.')
        else if (error instanceof ApiError && error.status === 400) setFormError('Confira o código e o nome informados.')
        else if (error instanceof ApiError && error.status === 403) setFormError(errorMessage(error))
        else if (error instanceof ApiError && error.status === 404) setFormError('Esta disciplina não está mais disponível. Volte à lista e atualize os dados.')
        else { setUncertain(true); setFormError('Não foi possível confirmar a gravação. Volte à lista e confira os dados antes de tentar novamente.') }
      }
    } finally { if (operation.current === controller) operation.current = null; setBusy(false) }
  }

  if (forbidden) return <Forbidden onRetry={() => setReload(value => value + 1)} />
  const sorted = [...(subjects ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR') || a.code.localeCompare(b.code, 'pt-BR'))
  return <div className={styles.page}>
    <header className={styles.pageHeading}><p className="eyebrow">ORGANIZAÇÃO ACADÊMICA</p><h1>Disciplinas</h1><p>Consulte as disciplinas oferecidas pela escola e use este catálogo nas atribuições de professores.</p></header>
    {scope && !unitId ? <Card><p>{scope.units === null ? 'Carregando unidades...' : 'Você não tem unidade ativa para consultar as disciplinas.'}</p></Card>
    : loadError ? <ErrorState title="Não foi possível carregar as disciplinas" message={loadError} onRetry={() => setReload(value => value + 1)} />
    : subjects === null ? <p role="status">Carregando disciplinas...</p>
    : <>
      <div className={styles.sectionHeading}><div><h2 ref={heading} tabIndex={-1}>Disciplinas da escola</h2><p>O catálogo é compartilhado entre as unidades.</p></div>{canCreate && !formOpen && <Button onClick={() => openForm()}>Nova disciplina</Button>}</div>
      {formOpen ? <Card><form className={styles.form} onSubmit={event => void save(event)}><h3>{editing ? 'Editar disciplina' : 'Cadastrar disciplina'}</h3>
        <div className={styles.formGrid}><label>Nome da disciplina<input required maxLength={150} value={draft.name} onChange={event => setDraft(current => ({...current,name:event.target.value}))} disabled={busy} placeholder="Ex.: Matemática" /></label>
          <label>Código<input required maxLength={50} value={draft.code} onChange={event => setDraft(current => ({...current,code:event.target.value}))} disabled={busy} placeholder="Ex.: MAT" /></label></div>
        {formError && <p role="alert" className={styles.error}>{formError}</p>}
        <div className={styles.formActions}><Button variant="secondary" onClick={closeForm} disabled={busy}>Voltar às disciplinas</Button><Button type="submit" disabled={busy || uncertain}>{busy ? 'Salvando...' : 'Salvar disciplina'}</Button></div>
      </form></Card>
      : sorted.length === 0 ? <Card className={styles.empty}><h3>Nenhuma disciplina cadastrada</h3><p>{scope ? 'Peça ao administrador da escola para cadastrar as disciplinas.' : 'Cadastre a primeira disciplina para organizar as atribuições dos professores.'}</p>{canCreate && <Button onClick={() => openForm()}>Cadastrar primeira disciplina</Button>}</Card>
      : <Card className={styles.tableCard}><table><thead><tr><th>Nome</th><th>Código</th>{canEdit && <th>Ações</th>}</tr></thead><tbody>{sorted.map(item => <tr key={item.id}><td data-label="Nome"><strong>{item.name}</strong></td><td data-label="Código">{item.code}</td>{canEdit && <td data-label="Ações"><Button variant="secondary" onClick={() => openForm(item)}>Editar</Button></td>}</tr>)}</tbody></table></Card>}
    </>}
    <Link to="/" className={styles.back}>Voltar à Visão geral<span className={styles.freppMark} aria-hidden="true"><i/><i/><i/></span></Link>
  </div>
}
