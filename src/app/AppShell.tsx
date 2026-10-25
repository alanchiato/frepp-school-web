import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useSession } from '../session/context'
import { errorMessage } from '../shared/api/errors'
import { Button, Logo } from '../shared/components/ui'
import { Icon } from '../shared/components/Icon'
import styles from './app.module.css'

function Navigation({ admin, unitAdmin, onNavigate }: { admin: boolean; unitAdmin: boolean; onNavigate: () => void }) { return <nav aria-label="Navegação principal" className={styles.navigation}>
  <NavLink to="/" end className={styles.navLink} onClick={onNavigate}><Icon name="home" />Visão geral</NavLink>
  {(admin||unitAdmin) && <NavLink to="/admin/units" className={styles.navLink} onClick={onNavigate}><Icon name="school" />Unidades</NavLink>}
  {(admin||unitAdmin) && <NavLink to="/admin/academic-years" className={styles.navLink} onClick={onNavigate}><Icon name="calendar" />Anos letivos</NavLink>}
  {(admin||unitAdmin) && <NavLink to="/admin/academic-structure" className={styles.navLink} onClick={onNavigate}><Icon name="layers" />Séries e turmas</NavLink>}
  {(admin||unitAdmin) && <NavLink to="/admin/subjects" className={styles.navLink} onClick={onNavigate}><Icon name="book" />Disciplinas</NavLink>}
  {(admin||unitAdmin) && <NavLink to="/admin/teachers" className={styles.navLink} onClick={onNavigate}><Icon name="teacher" />Professores</NavLink>}
  {(admin||unitAdmin) && <NavLink to="/admin/students" className={styles.navLink} onClick={onNavigate}><Icon name="student" />Alunos</NavLink>}
</nav> }
export function AppShell({ children }: { children: ReactNode }) {
  const { state, logout } = useSession()
  const [message, setMessage] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const sidebar = useRef<HTMLElement>(null)
  const main = useRef<HTMLElement>(null)
  useEffect(() => { if (menuOpen) sidebar.current?.querySelector('a')?.focus() }, [menuOpen])
  useEffect(() => {
    if (!menuOpen) return
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); setMenuOpen(false); menuButton.current?.focus() }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [menuOpen])
  if (state.status !== 'authenticated' && state.status !== 'logging_out') return null
  const { session } = state
  function closeMenu() { setMenuOpen(false); menuButton.current?.focus() }
  function navigateFromMenu() { setMenuOpen(false); main.current?.focus() }
  async function exit() { setMessage(''); try { await logout() } catch (error) { setMessage(`Não foi possível sair. ${errorMessage(error)}`) } }
  return <div className={styles.shell}><a className="skip-link" href="#main">Ir para o conteúdo</a>
    <aside id="school-navigation" ref={sidebar} className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ''}`}><Logo /><div className={styles.school}><p className="eyebrow">ESCOLA ATUAL</p><div><Icon name="school" /><strong>{session.school.name}</strong></div></div><Navigation admin={session.experiences.admin} unitAdmin={!!session.experiences.unitAdmin} onNavigate={navigateFromMenu} /><p className={styles.sidebarFooter}>Educação organizada<br />para um futuro melhor.</p></aside>
    <button type="button" className={`${styles.mobileOverlay} ${menuOpen ? styles.mobileOverlayOpen : ''}`} aria-label="Fechar menu de navegação" tabIndex={-1} onClick={closeMenu} />
    <div className={styles.workspace}><header className={styles.topbar}>
      <button type="button" className={styles.menuToggle} ref={menuButton} aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} aria-controls="school-navigation" onClick={() => menuOpen ? closeMenu() : setMenuOpen(true)}><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><path d={menuOpen ? 'M6 6l12 12M6 18L18 6' : 'M4 6h16M4 12h16M4 18h16'} /></svg></button>
      <div className={styles.mobileBrand}><Logo /><span title={session.school.name}>{session.school.name}</span></div>
      <span className={styles.schoolName}>{session.school.name}</span><div className={styles.user}><Icon name="teacher" /><span>{session.user.email}</span></div><Button variant="secondary" className={styles.logoutButton} aria-label={state.status === 'logging_out' ? 'Saindo…' : 'Sair'} onClick={() => void exit()} disabled={state.status === 'logging_out'}><Icon name="logout" /><span className={styles.logoutText}>{state.status === 'logging_out' ? 'Saindo…' : 'Sair'}</span></Button>
    </header>
      {message && <p className={styles.logoutError} role="alert">{message}</p>}<main id="main" ref={main} tabIndex={-1} className={styles.content}>{children}</main>
    </div>
  </div>
}
