import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import logo from '../../assets/brand/frepp-school-logo.png'
import type { StepStatus } from '../api/contracts'
import { Icon, type IconName } from './Icon'
import styles from './ui.module.css'

export function Logo() { return <img className={styles.logo} src={logo} alt="Frepp School" width="2048" height="724" /> }
export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }) {
  return <button type="button" className={`${styles.button} ${styles[variant]} ${className}`} {...props} />
}
export function Input({ label, error, icon, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; icon: IconName }) {
  const id = useId()
  return <div className={styles.field}>
    <label htmlFor={id}>{label}</label>
    <div className={styles.inputWrap}><Icon name={icon} /><input {...props} id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} /></div>
    {error && <p className={styles.fieldError} id={`${id}-error`}>{error}</p>}
  </div>
}
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`${styles.card} ${className}`}>{children}</section> }
const statuses: Record<StepStatus, { label: string; icon: IconName }> = {
  complete: { label: 'Concluído', icon: 'check' }, attention: { label: 'Atenção', icon: 'alert' }, not_started: { label: 'Não iniciado', icon: 'lock' },
}
export function Badge({ status }: { status: StepStatus }) { return <span className={`${styles.badge} ${styles[status]}`}><Icon name={statuses[status].icon} />{statuses[status].label}</span> }
export function Progress({ value }: { value: number }) { return <div className={styles.progress}><progress value={value} max={100} aria-label="Progresso da configuração" /><strong>{value}%</strong></div> }
export function Skeleton() { return <div className={styles.skeleton} aria-hidden="true" /> }
export function ErrorState({ title = 'Algo não saiu como esperado', message, onRetry, children }: { title?: string; message: string; onRetry?: () => void; children?: ReactNode }) {
  return <Card className={styles.errorState}><span className={styles.errorIcon}><Icon name="alert" /></span><h1>{title}</h1><p role="alert">{message}</p>{onRetry && <Button onClick={onRetry}>Tentar novamente</Button>}{children}</Card>
}
