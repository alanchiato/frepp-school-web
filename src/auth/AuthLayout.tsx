import type { ReactNode } from 'react'
import { Logo } from '../shared/components/ui'
import styles from './auth.module.css'

export function AuthLayout({ children, selection = false }: { children: ReactNode; selection?: boolean }) {
  return <div className={styles.page}>
    <header className={styles.header}>{selection && <Logo />}<p>Educação organizada<br />para um futuro melhor</p></header>
    <main id="main" className={styles.panel}>
      <section className={styles.form}>{children}</section>
      <aside className={styles.story} aria-label="Bem-vindo ao Frepp School">
        <p className="eyebrow">GESTÃO ESCOLAR SEM COMPLICAÇÃO</p>
        <h2>{selection ? 'Mais educação em cada caminho.' : 'Mais tempo para o que importa: a educação.'}</h2>
        <span className={styles.underline} />
        <p>{selection ? 'Escolha sua escola e continue participando de uma educação mais simples, conectada e eficiente.' : 'Organize sua escola e acompanhe as informações da sua equipe, alunos e processos em um só lugar.'}</p>
        <div className={styles.illustration} aria-hidden="true"><div className={styles.sun} /><div className={styles.book}><span /><span /></div><div className={styles.bookStack}><i /><i /><i /></div><div className={styles.plant}><i /><i /><i /><span /></div></div>
        <p className={styles.storyFoot}>Um novo capítulo para a sua escola.</p>
      </aside>
    </main>
    <footer className={styles.footer}>Frepp School · Educação mais simples e conectada.</footer>
  </div>
}
