import { WizardStepper } from '../../shared/components/WizardStepper'

const steps = [
  { label: 'Identificação', compact: 'Dados' },
  { label: 'Endereço', compact: 'Endereço' },
  { label: 'Revisão', compact: 'Revisão' },
]

export function UnitStepper({ currentStep }: { currentStep: number }) {
  return <WizardStepper steps={steps} currentStep={currentStep} label="Etapas do cadastro da unidade" />
}
