/**
 * The action catalogue: every action the bedside offers, the same for every
 * case. A case decides how each is judged (critical, recommended, optional,
 * unnecessary, harmful); the catalogue decides who may do it and how long it
 * takes. Actions for qualified clinicians are never done by the player: they
 * are offered as a referral to the right person instead (SIMULATION ONLY).
 */
import type { ActionDef, ActionCategory, Role } from './model'

/** A role beyond every support grade: the action belongs to registered clinicians. */
export const CLINICIAN = 9 as Role

const A = (
  id: string,
  label: string,
  category: ActionCategory,
  minRole: Role,
  minutes: number,
  done: string,
  more: Partial<ActionDef> = {},
): ActionDef => ({ id, label, category, minRole, minutes, done, ...more })

export const ACTIONS: ActionDef[] = [
  // Infection prevention and getting ready
  A(
    'hand-hygiene',
    'Clean your hands (gel)',
    'care',
    0,
    1,
    'You clean your hands with the alcohol gel.',
    { kit: 'gel' },
  ),
  A(
    'gloves',
    'Put on gloves and apron',
    'care',
    0,
    1,
    'You put on a fresh pair of gloves and an apron.',
    { kit: 'gloves' },
  ),
  A(
    'isolation-ppe',
    'Put on isolation PPE (gown, gloves, mask)',
    'care',
    0,
    2,
    'You put on a gown, gloves and a fluid-resistant mask before going in.',
    { kit: 'gloves' },
  ),
  A(
    'privacy',
    'Draw the curtains for privacy',
    'communication',
    0,
    1,
    'You draw the curtains around the bed.',
  ),

  // Communication
  A(
    'introduce',
    'Introduce yourself and your role',
    'communication',
    0,
    1,
    'You say who you are and what you do.',
  ),
  A(
    'check-id',
    'Check identity (name, date of birth, wristband)',
    'communication',
    0,
    1,
    'You check their name and date of birth against the wristband.',
  ),
  A(
    'consent',
    'Explain and ask permission',
    'communication',
    0,
    1,
    'You explain what you would like to do and ask if that is all right.',
  ),
  A(
    'reassure',
    'Reassure and explain what happens next',
    'communication',
    0,
    1,
    'You explain calmly what will happen next.',
  ),
  A(
    'stay',
    'Stay with the patient',
    'care',
    0,
    2,
    'You stay at the bedside and keep talking to them.',
  ),
  A(
    'call-bell',
    'Leave the call bell within reach',
    'care',
    0,
    1,
    'You put the call bell where they can reach it and show them.',
    { kit: 'bell' },
  ),

  // Observations
  A(
    'obs-resp',
    'Count the breathing rate',
    'observations',
    0,
    1,
    'You count their breaths for a full minute.',
    { measure: ['resp'] },
  ),
  A(
    'obs-spo2',
    'Measure oxygen saturation',
    'observations',
    0,
    1,
    'You clip the oximeter to a finger and wait for a steady reading.',
    { measure: ['spo2'], kit: 'oximeter' },
  ),
  A(
    'obs-temp',
    'Take the temperature',
    'observations',
    0,
    1,
    'You take their temperature with the ear thermometer.',
    { measure: ['temp'], kit: 'thermometer' },
  ),
  A(
    'obs-bp',
    'Measure blood pressure',
    'observations',
    0,
    2,
    'You put the cuff on the upper arm and take a reading.',
    { measure: ['bp'], kit: 'cuff' },
  ),
  A(
    'obs-pulse',
    'Take the pulse',
    'observations',
    0,
    1,
    'You feel the pulse at the wrist for a full minute.',
    { measure: ['pulse'] },
  ),
  A(
    'obs-avpu',
    'Check alertness (ACVPU)',
    'observations',
    0,
    1,
    'You check how alert they are and whether they are confused.',
    { measure: ['avpu'] },
  ),
  A(
    'obs-pain',
    'Ask for a pain score',
    'observations',
    0,
    1,
    'You ask them to score their pain from 0 to 10.',
    { measure: ['pain'] },
  ),
  A(
    'full-obs',
    'Take a full set of observations',
    'observations',
    0,
    5,
    'You take a full set of observations with the monitor.',
    {
      measure: ['resp', 'spo2', 'temp', 'bp', 'pulse', 'avpu'],
      kit: 'monitor',
    },
  ),
  A(
    'obs-glucose',
    'Measure blood glucose (finger prick)',
    'observations',
    1,
    2,
    'You do a finger-prick blood glucose test.',
    { measure: ['glucose'], kit: 'glucometer' },
  ),
  A(
    'record-obs',
    'Record the observations on the chart',
    'documentation',
    0,
    1,
    'You enter the observations on the electronic chart.',
    { kit: 'workstation' },
  ),

  // Looking and checking (within scope: looking, not diagnosing)
  A(
    'look-general',
    'Look at the patient (colour, breathing, sweating)',
    'examination',
    0,
    1,
    'You take a careful look at how they are.',
  ),
  A(
    'look-skin',
    'Check skin and pressure areas',
    'examination',
    0,
    2,
    'You check their skin and pressure areas, with permission.',
  ),
  A(
    'look-wound',
    'Look at the wound dressing',
    'examination',
    0,
    1,
    'You look at the dressing without disturbing it.',
  ),
  A(
    'look-legs',
    'Look at the legs and ankles',
    'examination',
    0,
    1,
    'You look at their legs and ankles.',
  ),
  A(
    'look-face',
    'Check face, arms and speech (FAST)',
    'examination',
    0,
    1,
    'You ask them to smile, lift both arms and repeat a sentence.',
  ),
  A(
    'fluid-chart',
    'Check the fluid balance chart',
    'examination',
    0,
    1,
    'You look at what they have drunk and passed today.',
    { kit: 'notes' },
  ),
  A(
    'read-notes',
    'Read the notes and care plan',
    'examination',
    0,
    2,
    'You read the notes and the care plan.',
    { kit: 'notes' },
  ),

  // Specimens
  A(
    'collect-urine',
    'Collect a urine sample (mid-stream)',
    'specimens',
    0,
    4,
    'You explain how to give a mid-stream sample and collect it in a labelled pot.',
    { kit: 'specimens' },
  ),
  A(
    'collect-stool',
    'Collect a stool sample',
    'specimens',
    0,
    4,
    'You collect a stool sample in a labelled pot.',
    { kit: 'specimens' },
  ),
  A(
    'collect-swab',
    'Take a swab',
    'specimens',
    1,
    3,
    'You take the swab and seal it in its labelled tube.',
    { kit: 'specimens' },
  ),
  A(
    'collect-sputum',
    'Collect a sputum sample',
    'specimens',
    0,
    3,
    'You help them cough into a labelled pot.',
    { kit: 'specimens' },
  ),
  A(
    'collect-blood',
    'Take blood (venepuncture)',
    'specimens',
    2,
    5,
    'You take the blood samples into labelled bottles.',
    { kit: 'specimens' },
  ),
  A(
    'send-specimen',
    'Label and send the specimens to the laboratory',
    'specimens',
    0,
    2,
    'You label the specimens at the bedside and send them to the laboratory.',
    { kit: 'specimens' },
  ),

  // Results and tests
  A(
    'ecg',
    'Record a 12-lead ECG',
    'investigations',
    1,
    6,
    'You place the electrodes and record the ECG.',
    { kit: 'monitor' },
  ),
  A(
    'view-results',
    'Check results on the computer',
    'investigations',
    0,
    1,
    'You look up their results on the computer.',
    { kit: 'workstation' },
  ),

  // Documentation
  A(
    'write-note',
    'Write in the notes',
    'documentation',
    0,
    2,
    'You write in the notes.',
    { kit: 'workstation' },
  ),
  A(
    'update-fluid-chart',
    'Update the fluid chart',
    'documentation',
    0,
    1,
    'You add what they drank and passed to the fluid chart.',
    { kit: 'notes' },
  ),

  // Escalation
  A(
    'tell-nurse',
    'Tell the nurse in charge (SBAR)',
    'escalation',
    0,
    2,
    'You tell the nurse in charge.',
    { kit: 'phone' },
  ),
  A(
    'call-outreach',
    'Call the outreach (deteriorating patient) team',
    'escalation',
    2,
    2,
    'You call the outreach team.',
    { kit: 'phone' },
  ),
  A(
    'emergency-call',
    'Pull the emergency buzzer / call for help',
    'escalation',
    0,
    1,
    'You pull the emergency buzzer and call for help.',
  ),

  // Talking to the team
  A(
    'ask-nurse',
    'Ask the nurse a question',
    'clinical-communication',
    0,
    1,
    'You ask the nurse.',
  ),
  A('handover', 'Give a handover', 'handover', 1, 3, 'You hand over to the next shift.'),

  // Care and comfort (within scope)
  A(
    'sit-up',
    'Help them sit upright',
    'care',
    0,
    1,
    'You help them sit upright, supported with pillows.',
  ),
  A(
    'lie-down',
    'Help them lie down flat',
    'care',
    0,
    1,
    'You help them lie down, with their legs raised on a pillow.',
  ),
  A(
    'reposition',
    'Reposition to relieve pressure',
    'care',
    0,
    2,
    'You help them change position, using the right equipment.',
  ),
  A('offer-drink', 'Offer a drink', 'care', 0, 1, 'You offer them a drink of water.'),
  A(
    'sick-bowl',
    'Give a sick bowl and tissues',
    'care',
    0,
    1,
    'You put a sick bowl and tissues within reach.',
  ),
  A(
    'help-walk',
    'Help them walk to the toilet',
    'care',
    0,
    3,
    'You help them walk to the toilet.',
  ),
  A(
    'pressure-on-wound',
    'Press firmly on the bleeding with a pad',
    'care',
    0,
    2,
    'You press a clean pad firmly on the dressing, with gloves on.',
  ),
  A(
    'lift-up',
    'Help them up off the floor',
    'care',
    0,
    2,
    'You help them up off the floor and back onto the bed.',
  ),
  A(
    'nbm-sign',
    'Put up a nil-by-mouth sign',
    'care',
    0,
    1,
    'You put a nil-by-mouth sign above the bed.',
  ),
  A(
    'stop-and-check',
    'Stop and check before going on',
    'care',
    0,
    1,
    'You stop what you are doing and check.',
  ),
  A(
    'wait',
    'Wait and watch (5 minutes)',
    'follow-up',
    0,
    5,
    'You wait and keep an eye on them.',
  ),

  // For registered clinicians only: the player refers, never does
  A('give-oxygen', 'Start or change oxygen', 'care', CLINICIAN, 0, '', {
    referTo: 'the nurse in charge',
  }),
  A('give-medicine', 'Give medicine (including pain relief)', 'care', CLINICIAN, 0, '', {
    referTo: 'the nurse in charge',
  }),
  A('change-drip', 'Change or stop an infusion (drip)', 'care', CLINICIAN, 0, '', {
    referTo: 'the nurse in charge',
  }),
  A('interpret-ecg', 'Say what the ECG shows', 'investigations', CLINICIAN, 0, '', {
    referTo: 'the doctor',
  }),
  A(
    'diagnose',
    'Tell the patient what is wrong with them',
    'communication',
    CLINICIAN,
    0,
    '',
    { referTo: 'the doctor' },
  ),
  A('insert-cannula', 'Put in a cannula', 'care', CLINICIAN, 0, '', {
    referTo: 'the doctor',
  }),
]

const BY_ID = new Map(ACTIONS.map((a) => [a.id, a]))

export function getAction(id: string): ActionDef | undefined {
  return BY_ID.get(id)
}

/** Whether the role may do it themselves. */
export function allowed(action: ActionDef, role: Role): boolean {
  return action.minRole <= role
}

export function outOfScope(action: ActionDef): boolean {
  return action.minRole === CLINICIAN
}
