import styles from './unit-stepper.module.css'

const steps = [
  { label: 'Identificação', compact: 'Dados' },
  { label: 'Endereço', compact: 'Endereço' },
  { label: 'Revisão', compact: 'Revisão' },
]

export function UnitStepper({ currentStep }: { currentStep: number }) {
  const progress = currentStep / (steps.length - 1) * 100

  return <div className={styles.progress}>
    <div className={styles.track} aria-hidden="true">
      <span className={styles.fill} style={{ width: `${progress}%` }} />
    </div>
    <ol className={styles.stepper} aria-label="Etapas do cadastro da unidade">
      {steps.map(({ label, compact }, index) => {
        const state = index < currentStep ? 'completed' : index === currentStep ? 'current' : 'future'
        return <li key={label} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
          <span className={styles.indicator} aria-hidden="true">
            <span className={styles.number}>{index + 1}</span>
            <svg className={styles.check} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 12 4 4L19 6" />
            </svg>
          </span>
          <span className={styles.label} aria-hidden="true">
            <span className={styles.full}>{label}</span>
            <span className={styles.compact}>{compact}</span>
          </span>
          <span className="sr-only">{label}{state === 'completed' ? ' — concluída' : state === 'future' ? ' — a seguir' : ''}</span>
        </li>
      })}
    </ol>
  </div>
}
