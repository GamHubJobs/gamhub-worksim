/** The bedside equipment (what each piece does) and how the patient is posed: shared by the 3D view and the tests. */
import type { CaseDef, Phase } from '../../clinical/model'

/** Each piece of equipment and the action it does. */
export const EQUIPMENT: Array<{
  id: string
  label: string
  action: string
  at: [number, number, number]
  size: [number, number, number]
  color: string
}> = [
  {
    id: 'gel',
    label: 'Hand gel',
    action: 'hand-hygiene',
    at: [-1.45, 1.1, -0.9],
    size: [0.12, 0.25, 0.1],
    color: '#e0f2fe',
  },
  {
    id: 'gloves',
    label: 'Gloves and aprons',
    action: 'gloves',
    at: [-1.45, 0.8, -0.9],
    size: [0.25, 0.12, 0.12],
    color: '#a5f3fc',
  },
  {
    id: 'monitor',
    label: 'Observations monitor',
    action: 'full-obs',
    at: [1.3, 1.15, -0.6],
    size: [0.35, 0.28, 0.12],
    color: '#1f2937',
  },
  {
    id: 'cuff',
    label: 'Blood pressure cuff',
    action: 'obs-bp',
    at: [1.25, 0.82, -0.35],
    size: [0.2, 0.06, 0.12],
    color: '#1d4ed8',
  },
  {
    id: 'oximeter',
    label: 'Finger oximeter',
    action: 'obs-spo2',
    at: [1.4, 0.82, -0.35],
    size: [0.06, 0.04, 0.08],
    color: '#f8fafc',
  },
  {
    id: 'thermometer',
    label: 'Ear thermometer',
    action: 'obs-temp',
    at: [1.5, 0.82, -0.45],
    size: [0.04, 0.12, 0.04],
    color: '#f1f5f9',
  },
  {
    id: 'notes',
    label: 'Notes and care plan',
    action: 'read-notes',
    at: [0.6, 0.62, 1.15],
    size: [0.24, 0.02, 0.32],
    color: '#fde68a',
  },
  {
    id: 'workstation',
    label: 'Computer on wheels (chart)',
    action: 'record-obs',
    at: [-1.3, 1.0, 0.8],
    size: [0.4, 0.3, 0.05],
    color: '#0f766e',
  },
  {
    id: 'bell',
    label: 'Call bell',
    action: 'call-bell',
    at: [0.45, 0.62, -0.2],
    size: [0.06, 0.04, 0.14],
    color: '#dc2626',
  },
  {
    id: 'buzzer',
    label: 'Emergency buzzer',
    action: 'emergency-call',
    at: [-0.4, 1.4, -1.18],
    size: [0.14, 0.14, 0.04],
    color: '#b91c1c',
  },
  {
    id: 'phone',
    label: 'Ward phone (tell the nurse)',
    action: 'tell-nurse',
    at: [-1.3, 0.75, 0.8],
    size: [0.16, 0.06, 0.1],
    color: '#334155',
  },
  {
    id: 'specimens',
    label: 'Specimen pots and labels',
    action: 'send-specimen',
    at: [-1.45, 0.8, -0.55],
    size: [0.2, 0.1, 0.14],
    color: '#fef3c7',
  },
]

export type Pose = 'lying' | 'sitting' | 'chair' | 'floor'

export function poseFor(def: CaseDef, phase: Phase): Pose {
  if (phase.id === 'on-floor' || phase.id === 'fallen') return 'floor'
  if (def.room === 'collection' || def.room === 'exam') return 'chair'
  if (!phase.vitals.alert) return 'lying'
  if (phase.vitals.resp >= 22 || phase.vitals.pain >= 6 || def.room === 'emergency')
    return 'sitting'
  return 'lying'
}
