import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../../session/context'
import type { AdminOverview } from '../../shared/api/contracts'
import { ApiError, errorMessage } from '../../shared/api/errors'
import { Badge, Card, ErrorState, Progress, Skeleton } from '../../shared/components/ui'
import { Icon, type IconName } from '../../shared/components/Icon'
import { Forbidden } from '../../app/SystemStates'
import adminHomeWelcome from '../../assets/illustrations/admin-home-welcome.png'
import { actionDestination, actionLabel, alertPresentation, stepPresentation } from './presentation'
import styles from './overview.module.css'

type OverviewState = { status: 'loading' } | { status: 'ready'; data: AdminOverview } | { status: 'forbidden' } | { status: 'error'; message: string }
const countCards: readonly { key: keyof AdminOverview['counts']; label: string; icon: IconName }[] = [
  { key: 'units', label: 'Unidades', icon: 'school' }, { key: 'classes', label: 'Turmas', icon: 'people' },
  { key: 'teachers', label: 'Professores', icon: 'teacher' }, { key: 'students', label: 'Alunos', icon: 'student' }, { key: 'guardians', label: 'Responsáveis', icon: 'guardians' },
]
export function OverviewLoading() { return <div role="status" aria-live="polite" aria-busy="true"><h1>Carregando visão geral</h1><p>Organizando as informações da sua escola.</p><div className={styles.loading}><Skeleton /><div className={styles.counts}>{countCards.map((c) => <Skeleton key={c.key} />)}</div><Skeleton /><Skeleton /></div></div> }
export function AdminHome() {
  const { api, invalidate } = useSession()
  const [state, setState] = useState<OverviewState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    queueMicrotask(() => {
      if (controller.signal.aborted) return
      setState({ status: 'loading' })
      void api.overview(controller.signal).then((data) => {
        if (!controller.signal.aborted) setState({ status: 'ready', data })
      }).catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof ApiError && error.status === 401) invalidate()
        else if (error instanceof ApiError && error.status === 403) setState({ status: 'forbidden' })
        else setState({ status: 'error', message: errorMessage(error) })
      })
    })
    return () => controller.abort()
  }, [api, invalidate, attempt])
  if (state.status === 'loading') return <OverviewLoading />
  if (state.status === 'forbidden') return <Forbidden onRetry={() => setAttempt((n) => n + 1)} />
  if (state.status === 'error') return <ErrorState title="Não foi possível carregar a visão geral" message={state.message} onRetry={() => setAttempt((n) => n + 1)} />
  return <OverviewContent data={state.data} />
}
export function OverviewContent({ data }: { data: AdminOverview }) {
  const configured = data.setup.progress === 100 && data.alerts.length === 0
  const empty = data.setup.progress === 0
  const actions = data.quickActions.flatMap((code) => {
    const destination = actionDestination(code)
    return destination ? [{ code, destination }] : []
  })
  return <div className={styles.home}>
    <header className={styles.heading}><div><p className="eyebrow">SUA ESCOLA EM UM SÓ LUGAR</p><h1>Visão geral da escola</h1><p>Acompanhe as principais informações e a configuração da sua escola.</p></div>
      <div className={styles.academicYear}><Icon name="calendar" /><div><span>Ano letivo vigente</span><strong>{data.academicYear.hasCurrent && data.academicYear.current ? data.academicYear.current.year : 'Não definido'}</strong></div></div>
    </header>
    <section className={`${styles.banner} ${configured ? styles.configured : ''}`}>
      <div className={styles.bannerCopy}><p className="eyebrow">{configured ? 'CONFIGURAÇÃO CONCLUÍDA' : 'BEM-VINDO(A) AO FREPP SCHOOL'}</p><h2>{data.school.name}</h2><p>{configured ? 'Tudo configurado! Todas as etapas desta visão geral foram concluídas.' : empty ? 'Vamos começar? Acompanhe os passos abaixo para configurar sua escola.' : 'Continue configurando sua escola para uma gestão mais organizada.'}</p></div>
      <img className={styles.bannerArt} src={adminHomeWelcome} width="1774" height="887" alt="" aria-hidden="true" />
    </section>
    <section aria-label="Principais números" tabIndex={0} className={styles.counts}>{countCards.map((card) => <Card key={card.key} className={styles.count}><span className={styles.entityIcon}><Icon name={card.icon} /></span><div><span>{card.label}</span><strong>{data.counts[card.key].toLocaleString('pt-BR')}</strong></div></Card>)}</section>
    <div className={styles.details}>
      <Card className={styles.setup}><h2>Configuração da escola</h2><p>{configured ? 'Todas as etapas foram concluídas com sucesso.' : 'Acompanhe as etapas de configuração e os pontos que precisam de atenção.'}</p><Progress value={data.setup.progress} />
        <ol className={styles.steps}>{data.setup.steps.map((step) => { const p = stepPresentation(step.code); const destination = step.code === 'school_units' ? '/admin/units' : step.code === 'academic_year' ? '/admin/academic-years' : step.code === 'classes' ? '/admin/academic-structure?tab=turmas' : step.code === 'teachers' ? '/admin/teachers' : step.code === 'students' ? '/admin/students' : null; return <li key={step.code}><span className={styles.entityIcon}><Icon name={p.icon} /></span><div className={styles.stepText}><strong>{destination ? <Link className={styles.setupLink} to={destination}>{p.label}<span className={styles.freppMark} aria-hidden="true"><i /><i /><i /></span></Link> : p.label}</strong><p>{p.description}</p></div><Badge status={step.status} /></li> })}</ol>
      </Card>
      <div className={styles.side}>
        <Card><h2>Alertas e pendências</h2>{data.alerts.length === 0 ? <div className={styles.positive}><Icon name="check" /><strong>Nenhuma pendência de configuração</strong><p>Não há alertas nesta visão geral.</p></div>
          : <ul className={styles.alerts}>{data.alerts.map((alert) => { const p = alertPresentation(alert); return <li key={alert.code} className={styles[alert.severity]}><span className={styles.alertIcon}><Icon name={p.icon} /></span><div><span className={styles.alertLabel}>Atenção</span><h3>{p.title}</h3><p>{p.description}</p></div></li> })}</ul>}
        </Card>
        <Card><span className={styles.tipIcon}><Icon name="student" /></span><h2>{configured ? 'Uma escola mais conectada' : 'Cada etapa faz a diferença'}</h2><p>{configured ? 'As informações da sua escola estão reunidas aqui, de forma simples e organizada.' : 'Use este resumo para acompanhar a estrutura da escola e os vínculos entre sua equipe, alunos e responsáveis.'}</p></Card>
        {actions.length > 0 && <Card><h2>Ações rápidas</h2>{actions.map((action) => <Link className={styles.setupLink} key={action.code} to={action.destination}>{actionLabel(action.code)}<span className={styles.freppMark} aria-hidden="true"><i /><i /><i /></span></Link>)}</Card>}
      </div>
    </div>
  </div>
}
