import { useLayoutEffect } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AdminHome } from '../admin/overview/AdminHome'
import { UnitsPage } from '../admin/units/UnitsPage'
import { UnitAdminHome, UnitUnitsPage } from '../admin/unitadmins/UnitAdminHome'
import { UnitScopeProvider } from '../admin/unitadmins/UnitScopeContext'
import { AcademicYearsPage } from '../admin/academicyears/AcademicYearsPage'
import { Login } from '../auth/Login'
import { SchoolSelection } from '../auth/SchoolSelection'
import { useSession } from '../session/context'
import { ErrorState, Logo } from '../shared/components/ui'
import { AppShell } from './AppShell'
import { Forbidden, SessionRestoring } from './SystemStates'

export function App() {
  const { state, restore } = useSession()
  const location = useLocation()
  useLayoutEffect(() => {
    const titles: Record<string, string> = { '/': 'Visão geral', '/login': 'Entrar', '/select-school': 'Escolha sua escola', '/admin/units': 'Unidades', '/admin/academic-years': 'Anos letivos' }
    document.title = `${titles[location.pathname] ?? 'Página não encontrada'} · Frepp School`
    document.querySelector<HTMLElement>('h1')?.setAttribute('tabindex', '-1')
    document.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
  }, [location.pathname, state.status])
  if (state.status === 'unknown' || state.status === 'restoring') return <SessionRestoring />
  if (state.status === 'restore_error') return <main id="main"><Logo /><ErrorState title="Não foi possível restaurar a sessão" message={state.message} onRetry={restore} /></main>
  const authenticated = state.status === 'authenticated' || state.status === 'logging_out'
  const selecting = state.status === 'selecting_school' || state.status === 'selecting'
  const publicRoute = authenticated ? <Navigate to="/" replace /> : selecting ? <Navigate to="/select-school" replace /> : <Login />
  return <UnitScopeProvider key={authenticated ? `${state.session.school.id}:${state.session.user.id}` : 'public'} enabled={authenticated && !state.session.experiences.admin && !!state.session.experiences.unitAdmin}><Routes>
    <Route path="/login" element={publicRoute} />
    <Route path="/select-school" element={authenticated ? <Navigate to="/" replace /> : selecting ? <SchoolSelection /> : <Navigate to="/login" replace />} />
    <Route path="/" element={authenticated ? <AppShell>{state.session.experiences.admin ? <AdminHome /> : state.session.experiences.unitAdmin ? <UnitAdminHome /> : <Forbidden />}</AppShell> : <Navigate to={selecting ? '/select-school' : '/login'} replace />} />
    <Route path="/admin/units" element={authenticated ? <AppShell>{state.session.experiences.admin ? <UnitsPage /> : state.session.experiences.unitAdmin ? <UnitUnitsPage /> : <Forbidden />}</AppShell> : <Navigate to={selecting ? '/select-school' : '/login'} replace />} />
    <Route path="/admin/academic-years" element={authenticated ? <AppShell>{state.session.experiences.admin || state.session.experiences.unitAdmin ? <AcademicYearsPage /> : <Forbidden />}</AppShell> : <Navigate to={selecting ? '/select-school' : '/login'} replace />} />
    <Route path="/admin/unit-admins" element={<Navigate to="/admin/units" replace />} />
    <Route path="*" element={<main id="main"><Logo /><ErrorState title="Página não encontrada" message="O endereço que você acessou não está disponível."><Link to={authenticated ? '/' : selecting ? '/select-school' : '/login'}>Voltar para {authenticated ? 'a visão geral' : selecting ? 'a seleção de escola' : 'o login'}</Link></ErrorState></main>} />
  </Routes></UnitScopeProvider>
}
