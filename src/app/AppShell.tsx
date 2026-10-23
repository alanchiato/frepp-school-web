import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useSession } from '../session/context'
import { errorMessage } from '../shared/api/errors'
import { Button, Logo } from '../shared/components/ui'
import { Icon } from '../shared/components/Icon'
import styles from './app.module.css'

function Navigation() { return <nav aria-label="Navegação principal"><NavLink to="/" end className={styles.navLink}><Icon name="home" />Visão geral</NavLink></nav> }
export function AppShell({ children }: { children: ReactNode }) {
  const { state, logout } = useSession()
  const [message, setMessage] = useState('')
  if (state.status !== 'authenticated' && state.status !== 'logging_out') return null
  const { session } = state
  async function exit() { setMessage(''); try { await logout() } catch (error) { setMessage(`Não foi possível sair. ${errorMessage(error)}`) } }
  return <div className={styles.shell}><a className="skip-link" href="#main">Ir para o conteúdo</a>
    <aside className={styles.sidebar}><Logo /><div className={styles.school}><p className="eyebrow">ESCOLA ATUAL</p><div><Icon name="school" /><strong>{session.school.name}</strong></div></div><Navigation /><p className={styles.sidebarFooter}>Educação organizada<br />para um futuro melhor.</p></aside>
    <div className={styles.workspace}><header className={styles.topbar}><span className={styles.schoolName}>{session.school.name}</span><div className={styles.user}><Icon name="teacher" /><span>{session.user.email}</span></div><Button variant="secondary" onClick={() => void exit()} disabled={state.status === 'logging_out'}><Icon name="logout" />{state.status === 'logging_out' ? 'Saindo…' : 'Sair'}</Button></header>
      {message && <p className={styles.logoutError} role="alert">{message}</p>}<main id="main" tabIndex={-1} className={styles.content}>{children}</main>
    </div>
  </div>
}
