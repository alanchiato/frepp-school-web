import type { CSSProperties } from 'react'
import styles from './wizard-stepper.module.css'

export interface WizardStep { label: string; compact: string }

export function WizardStepper({ steps, currentStep, label }: { steps: readonly WizardStep[]; currentStep: number; label: string }) {
  const progress = steps.length > 1 ? currentStep / (steps.length - 1) * 100 : 100
  const columns = { '--step-count': steps.length } as CSSProperties

  return <div className={styles.progress} style={columns}>
    <div className={styles.track} aria-hidden="true">
      <span className={styles.fill} style={{ width: `${progress}%` }} />
    </div>
    <ol className={styles.stepper} aria-label={label}>
      {steps.map(({ label: stepLabel, compact }, index) => {
        const state = index < currentStep ? 'completed' : index === currentStep ? 'current' : 'future'
        return <li key={stepLabel} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
          <span className={styles.indicator} aria-hidden="true">
            <span className={styles.number}>{index + 1}</span>
            <svg className={styles.check} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 12 4 4L19 6" />
            </svg>
          </span>
          <span className={styles.label} aria-hidden="true">
            <span className={styles.full}>{stepLabel}</span>
            <span className={styles.compact}>{compact}</span>
          </span>
          <span className="sr-only">{stepLabel}{state === 'completed' ? ' — concluída' : state === 'future' ? ' — a seguir' : ''}</span>
        </li>
      })}
    </ol>
  </div>
}
