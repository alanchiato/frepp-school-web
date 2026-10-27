import type { ReactNode } from 'react'
import styles from './person-avatar.module.css'

type Size = 'small' | 'large'

function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toLocaleUpperCase('pt-BR')).join('') || '?'
}

export function PersonAvatar({ name, size = 'small' }: { name: string; size?: Size }) {
  return <span className={`${styles.avatar} ${styles[size]}`} data-person-avatar={size} aria-hidden="true">{initials(name)}</span>
}

export function PersonIdentity({ name, size = 'small', children }: { name: string; size?: Size; children: ReactNode }) {
  return <span className={styles.identity}><PersonAvatar name={name} size={size} /><span className={styles.content}>{children}</span></span>
}
