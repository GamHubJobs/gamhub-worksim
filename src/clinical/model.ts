/**
 * The clinical simulation's vocabulary: case definitions (data), the actions
 * a player can take and who may take them, how each case classifies them, and
 * the rules that change a patient's condition. One engine runs every case.
 *
 * SIMULATION ONLY. Every patient, history, observation, result, rule and score
 * is fictional and simplified for learning. Nothing here is medical advice or
 * a validated clinical tool. The player is healthcare support staff: they
 * observe, record, communicate and escalate; they never diagnose, prescribe
 * or treat.
 */

export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert'
export const DIFFICULTIES: Difficulty[] = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
]

/** The player's role, from their career level (healthcare support grades). */
export type Role = 0 | 1 | 2 | 3
export const ROLE_TITLES = [
  'Healthcare Support Trainee',
  'Healthcare Assistant',
  'Senior Healthcare Assistant',
  'Ward Coordinator',
] as const

export const ROLE_OF_LEVEL: Record<string, Role> = {
  'healthcare-trainee': 0,
  'healthcare-assistant': 1,
  'senior-healthcare-assistant': 2,
  'ward-coordinator': 3,
}

export type ActionCategory =
  | 'communication'
  | 'history'
  | 'observations'
  | 'examination'
  | 'specimens'
  | 'investigations'
  | 'documentation'
  | 'escalation'
  | 'clinical-communication'
  | 'care'
  | 'handover'
  | 'follow-up'

export const CATEGORY_NAMES: Record<ActionCategory, string> = {
  communication: 'Patient communication',
  history: 'History',
  observations: 'Observations',
  examination: 'Looking and checking',
  specimens: 'Specimens',
  investigations: 'Results',
  documentation: 'Documentation',
  escalation: 'Escalation',
  'clinical-communication': 'Talking to the team',
  care: 'Care and comfort',
  handover: 'Handover',
  'follow-up': 'Follow-up',
}

/** What the assessment scores, each from 0 to 100. */
export type Rubric =
  | 'communication'
  | 'information'
  | 'observation'
  | 'recognition'
  | 'escalation'
  | 'documentation'
  | 'conduct'
  | 'responsibilities'
  | 'infection'
  | 'safety'

export const RUBRIC_NAMES: Record<Rubric, string> = {
  communication: 'Patient communication',
  information: 'Information gathering',
  observation: 'Observation accuracy',
  recognition: 'Recognising concerning findings',
  escalation: 'Timely escalation',
  documentation: 'Documentation',
  conduct: 'Professional conduct',
  responsibilities: 'Assigned responsibilities',
  infection: 'Infection prevention',
  safety: 'Patient safety',
}

export type Classification =
  'critical' | 'recommended' | 'optional' | 'unnecessary' | 'harmful'

export interface Vitals {
  /** Breaths per minute. */
  resp: number
  /** Oxygen saturation, %. */
  spo2: number
  /** °C */
  temp: number
  sys: number
  dia: number
  pulse: number
  /** Alert (or new confusion / not alert). */
  alert: boolean
  /** Pain score the patient gives, 0 to 10. */
  pain: number
  /** Capillary blood glucose, mmol/L (when measured). */
  glucose: number
}

export type Measure =
  'resp' | 'spo2' | 'temp' | 'bp' | 'pulse' | 'avpu' | 'pain' | 'glucose'

export const MEASURE_NAMES: Record<Measure, string> = {
  resp: 'Breathing rate',
  spo2: 'Oxygen saturation',
  temp: 'Temperature',
  bp: 'Blood pressure',
  pulse: 'Pulse',
  avpu: 'Alertness (ACVPU)',
  pain: 'Pain score',
  glucose: 'Blood glucose',
}

/** One action in the catalogue (the same for every case). */
export interface ActionDef {
  id: string
  label: string
  category: ActionCategory
  /** The lowest role allowed to do it; beyond the player's role it is referred, not done. */
  minRole: Role
  /** Simulated minutes it takes. */
  minutes: number
  /** A measurement it takes, if any. */
  measure?: Measure[]
  /** Who to ask instead, for actions beyond the player's role. */
  referTo?: string
  /** What the player sees happen (when the case says nothing more). */
  done: string
  /** Kit used (the bedside objects). */
  kit?: Kit
}

export type Kit =
  | 'gel'
  | 'gloves'
  | 'monitor'
  | 'cuff'
  | 'thermometer'
  | 'oximeter'
  | 'notes'
  | 'specimens'
  | 'workstation'
  | 'bell'
  | 'glucometer'
  | 'phone'

/** A fact about the patient, revealed only when asked. */
export interface Fact {
  id: string
  /** What the player asks about, as words or phrases (any one matches). */
  topics: string[]
  /** What the patient says (one is picked; same meaning). */
  answers: string[]
  /** Important to find out (counts towards information gathering). */
  key?: boolean
  /** Only true in these phases (e.g. new pain once they get worse). */
  phases?: string[]
  /** Also written in the notes: reading them finds it out (for patients who cannot say). */
  inNotes?: boolean
}

/** A stage of the patient's condition, with their true observations. */
export interface Phase {
  id: string
  vitals: Vitals
  /** What anyone at the bedside can see. */
  looks: string
  /** How they come across, for the patient's voice. */
  mood: string
  /** What they say, unprompted, when this stage begins (if anything). */
  says?: string
  /** A concerning stage: should be recognised and escalated. */
  concerning?: boolean
  /** What looking and checking finds (by action ID). */
  findings?: Record<string, string>
}

/** A rule moving the patient from one stage to another. */
export interface Rule {
  id: string
  from: string[]
  to: string
  /** After this long in the stage (simulated minutes). */
  after?: number
  /** As soon as an action is done (in the stage). */
  done?: string
  /** If an action is still not done this long after entering the stage. */
  notDone?: { action: string; within: number }
  /** What happens, for the event log and the debrief. */
  event: string
}

/** How this case judges an action. */
export interface CaseAction {
  as: Classification
  why: string
  rubric: Rubric
  /** Full marks only if done within this long (minutes) after `from` (case start, or entering a stage). */
  within?: { minutes: number; from?: string }
  /** What happens when it is done, if more than the catalogue says. */
  result?: string
  /** Other actions that count as doing this one (e.g. the emergency buzzer for telling the nurse). */
  alt?: string[]
  /** Only right after this action has been done: before it, doing it is a fault (judged by `fault`). */
  requires?: string
  fault?: string
}

export interface LabResult {
  test: string
  value: number
  unit: string
  low: number
  high: number
  /** What it shows, in plain words (the doctor's interpretation; simplified). */
  meaning: string
}

export interface CaseResults {
  /** Specimen → results, available this long after it reaches the laboratory. */
  specimens?: Partial<
    Record<
      'blood' | 'urine' | 'swab' | 'stool' | 'sputum',
      { results: LabResult[]; minutes: number }
    >
  >
  ecg?: {
    rhythm: string
    rate: number
    meaning: string
    trace: 'normal' | 'fast' | 'irregular' | 'slow'
  }
  imaging?: { study: string; finding: string; meaning: string }
}

export interface PatientProfile {
  id: string
  name: string
  age: number
  sex: 'female' | 'male'
  /** Height and build, for the patient model at the bedside. */
  build: 'slight' | 'average' | 'heavy'
  skin: string
  hair: string
  /** A sentence of who they are. */
  background: string
  /** How they talk (and what helps them). */
  manner: string
  /** What they prefer to be called. */
  callMe: string
  allergies: Array<{ substance: string; reaction: string }>
  /** In plain words, from the fictional doctors. */
  history: string[]
}

export type Room =
  'bay' | 'exam' | 'emergency' | 'treatment' | 'observation' | 'side-room' | 'collection'

export const ROOM_NAMES: Record<Room, string> = {
  bay: 'Bay A, Ward 4',
  exam: 'Examination room',
  emergency: 'Emergency assessment room',
  treatment: 'Treatment room',
  observation: 'Observation area',
  'side-room': 'Side room (isolation)',
  collection: 'Specimen collection area',
}

export interface CaseDef {
  id: string
  title: string
  difficulty: Difficulty
  /** The kind of scenario, for the library. */
  type: string
  room: Room
  /** The lowest role the case is written for. */
  role: Role
  patient: PatientProfile
  /** What the player is told at the start (shown in full only on easier settings). */
  presentation: string
  /** The clinical background (from the notes). */
  background: string
  /** What the player is asked to do, by whom. */
  task: { from: string; text: string }
  objectives: string[]
  phases: Phase[]
  start: string
  rules: Rule[]
  facts: Fact[]
  /** How the case judges actions (anything not listed is optional). */
  actions: Record<string, CaseAction>
  /** Words a good note or escalation should contain (any of each group). */
  documentation: string[][]
  results?: CaseResults
  /** The teaching after the case. */
  debrief: {
    summary: string
    points: string[]
    terms: Array<{ term: string; meaning: string }>
  }
  /** The case ends when the player finishes, or at this many minutes. */
  limit: number
}
