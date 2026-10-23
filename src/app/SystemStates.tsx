import { Logo, Card, ErrorState } from '../shared/components/ui'
import styles from './app.module.css'

export function SessionRestoring() { return <div className={styles.restore}><header><Logo /></header><main id="main"><Card><div className={styles.restoreArt} aria-hidden="true"><Logo /></div><div className={styles.spinner} aria-hidden="true" /><h1>Restaurando sessão</h1><p role="status">Estamos verificando suas informações para continuar de onde você parou.</p><p className={styles.restoreNote}>Isso geralmente leva apenas alguns segundos.</p></Card></main></div> }
export function Forbidden({ onRetry }: { onRetry?: () => void }) { return <ErrorState title="Acesso não permitido" message="Você não tem permissão para acessar esta área. Se precisar de ajuda, entre em contato com o administrador da sua escola." onRetry={onRetry} /> }
