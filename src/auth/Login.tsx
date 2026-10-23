import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSession } from '../session/context'
import { Button, Input, Logo } from '../shared/components/ui'
import { Icon } from '../shared/components/Icon'
import { AuthLayout } from './AuthLayout'
import styles from './auth.module.css'

export function Login() {
  const { state, login } = useSession()
  const controller = useRef<AbortController | null>(null)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const busy = state.status === 'logging_in'
  const message = state.status === 'unauthenticated' ? state.message : undefined
  const invalidCredentials = message === 'Email ou senha inválidos.'
  const feedback = useRef<HTMLParagraphElement>(null)
  useEffect(() => () => controller.current?.abort(), [])
  useEffect(() => { if (message) feedback.current?.focus() }, [message])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (controller.current && !controller.current.signal.aborted) return
    const form = event.currentTarget
    const data = new FormData(form)
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')
    const next = { email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Informe um email válido.' : undefined,
      password: !password ? 'Informe sua senha.' : undefined }
    setErrors(next)
    if (next.email || next.password) { form.querySelector<HTMLInputElement>(next.email ? '[name="email"]' : '[name="password"]')?.focus(); return }
    const request = new AbortController(); controller.current = request
    await login({ email, password }, request.signal)
    if (!request.signal.aborted) { const field = form.elements.namedItem('password'); if (field instanceof HTMLInputElement) field.value = '' }
    controller.current = null
  }
  return <AuthLayout><div className={styles.welcome}><p className="eyebrow">BEM-VINDO(A) AO</p><Logo /><h1>Sua escola, mais conectada.</h1><p>A plataforma de gestão escolar para uma educação mais simples e eficiente.</p></div>
    <form noValidate onSubmit={submit} className={styles.fields} aria-label="Entrar no Frepp School" aria-busy={busy}>
      <Input label="Email" name="email" type="email" autoComplete="email" required icon="mail" placeholder="seu@email.com" disabled={busy} error={errors.email || (invalidCredentials ? 'Verifique seu email e senha.' : undefined)} />
      <Input label="Senha" name="password" type="password" autoComplete="current-password" required icon="lock" placeholder="Digite sua senha" disabled={busy} error={errors.password || (invalidCredentials ? 'Verifique seu email e senha.' : undefined)} />
      {message && <p ref={feedback} tabIndex={-1} role="alert" className={styles.feedback}>{message}</p>}
      <Button type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}<Icon name="arrow" /></Button>
      <span role="status" className="sr-only">{busy ? 'Verificando suas informações.' : ''}</span>
    </form></AuthLayout>
}
