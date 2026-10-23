import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSession } from '../session/context'
import { Button } from '../shared/components/ui'
import { Icon } from '../shared/components/Icon'
import { AuthLayout } from './AuthLayout'
import styles from './auth.module.css'

export function SchoolSelection() {
  const { state, selectSchool, discardSelection } = useSession()
  const [schoolId, setSchoolId] = useState('')
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  if (state.status !== 'selecting_school' && state.status !== 'selecting') return null
  const busy = state.status === 'selecting'
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!schoolId || controller.current) return
    const request = new AbortController(); controller.current = request
    await selectSchool(schoolId, request.signal)
    controller.current = null
  }
  return <AuthLayout selection><p className="eyebrow">BEM-VINDO(A) AO FREPP SCHOOL</p><h1>Escolha sua escola</h1><p>Você tem acesso a mais de uma escola. Selecione onde deseja continuar.</p>
    <form className={styles.fields} onSubmit={submit} aria-busy={busy}>
      <fieldset className={styles.schools} disabled={busy}><legend className="sr-only">Escolas disponíveis</legend>
        {state.selection.schools.map((school) => <label key={school.id} className={styles.school}>
          <span className={styles.schoolIcon}><Icon name="school" /></span><span>{school.name}</span>
          <input type="radio" name="school" value={school.id} checked={schoolId === school.id} onChange={() => setSchoolId(school.id)} required />
        </label>)}
      </fieldset>
      <Button type="submit" disabled={!schoolId || busy}>{busy ? 'Continuando…' : 'Continuar'}<Icon name="arrow" /></Button>
      <Button variant="secondary" onClick={discardSelection} disabled={busy}>Voltar ao login</Button>
      <p className={styles.security}><Icon name="lock" />Seu acesso é restrito às escolas e aos perfis permitidos.</p>
      <span role="status" className="sr-only">{busy ? 'Confirmando sua escolha.' : ''}</span>
    </form></AuthLayout>
}
