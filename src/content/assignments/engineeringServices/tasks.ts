/**
 * Engineering & Technical Services: the five tasks in Works Desk, one per
 * discipline. Each model answer is built from the player's own actions.
 * Standard formulas with simplified, fictional data: for learning.
 */
import type { AssignmentInput } from '../../schemas'
import { sampleEngineering } from '../../../tools/engineering/data'
import {
  chooseSection,
  closeWorkOrder,
  decidePart,
  doStep,
  flagSample,
  SAFE_ORDER,
  setComponent,
  setStages,
  toggleCritical,
  type Result,
} from '../../../tools/engineering/model'
import type { EngineeringState } from '../../../tools/engineering/schema'

function must(result: Result): EngineeringState {
  if (result.problems.length) throw new Error(result.problems.join(' '))
  return result.state
}

const feedback = (sender: string, excellent: string, first: string) => ({
  excellent: `Hi {name},

${excellent}

${sender}`,
  good: `Hi {name},

Good work; a detail or two to fix. See the notes.

${sender}`,
  pass: `Hi {name},

Some of this isn’t right yet. Read the notes carefully.

${sender}`,
  fail: `Hi {name},

Not yet. ${first}

${sender}`,
})

// ---------------------------------------------------------------------------
// 1. Electrical: the indicator lamp
// ---------------------------------------------------------------------------

const circuitStart = sampleEngineering()

export const engCircuit: AssignmentInput = {
  id: 'eng-circuit',
  version: 1,
  careerId: 'engineering-services',
  levelId: 'graduate-engineer',
  order: 1,
  kind: 'tool',
  title: 'The indicator lamp that keeps failing',
  summary:
    'Work out why an LED keeps burning out, and choose a resistor that makes the circuit safe.',
  estimatedMinutes: 25,
  from: 'manager',
  briefing: {
    subject: 'Panel indicator keeps failing',
    body: `Hi {name},

The green “running” lamp on the control panel has burned out three times this month. It is an LED on the 12 V panel supply with a 100 Ω, 0.125 W resistor. In **Works Desk → Circuits**, look at circuit C-1.

Choose a standard resistor and power rating so the LED runs at about **20 mA** (between 15 and 25 mA), and nothing is over its rating.

Helena`,
  },
  whyItMatters:
    'Components fail when they carry more current or dissipate more power than they are rated for. Ohm’s law and P = I²R tell you, before you build anything, whether a circuit is safe.',
  objectives: [
    'Apply Ohm’s law to a series circuit',
    'Check component ratings with P = I²R',
    'Choose standard values',
  ],
  steps: [
    {
      id: 'look',
      title: 'Read the analysis',
      instructions: 'Open **Circuits**: what current does the LED carry now?',
    },
    {
      id: 'resistor',
      title: 'Choose the resistor',
      instructions:
        'R = (12 V − 2 V) ÷ 0.02 A. Pick the nearest standard value at or above it, then a power rating above what it dissipates.',
      hint: '10 V ÷ 0.02 A = 500 Ω. The next standard value up is 560 Ω.',
    },
    { id: 'submit', title: 'Hand in', instructions: 'Click **Submit to {manager}**.' },
  ],
  tool: {
    id: 'engineering',
    title: 'Works Desk: indicator circuit',
    start: circuitStart,
    solution: must(setComponent(circuitStart, 'C-1', 'r1', 560, 0.25)),
    checks: [
      {
        id: 'circuit',
        type: 'circuit',
        circuit: 'C-1',
        minCurrent: 0.015,
        maxCurrent: 0.025,
        title: 'A safe circuit at about 20 mA',
        points: 100,
        why: '560 Ω gives (12 − 2) ÷ 560 = 17.9 mA, and dissipates 0.18 W, so it needs a 0.25 W resistor.',
        hint: 'Use 560 Ω and a 0.25 W rating.',
      },
    ],
  },
  passScore: 70,
  xp: 100,
  skills: { 'engineering-analysis': 45, 'design-judgement': 20, accuracy: 15 },
  feedback: feedback(
    'Helena',
    'Exactly right: 560 Ω at a quarter of a watt. The lamp has been on all week.',
    'Look at the current the LED carries now.',
  ),
}

// ---------------------------------------------------------------------------
// 2. Structural: the mezzanine beam
// ---------------------------------------------------------------------------

const beamStart = sampleEngineering()

export const engBeam: AssignmentInput = {
  id: 'eng-beam',
  version: 1,
  careerId: 'engineering-services',
  levelId: 'graduate-engineer',
  order: 2,
  kind: 'tool',
  title: 'Sizing the mezzanine beam',
  summary: 'Choose the lightest steel section that safely carries the mezzanine load.',
  estimatedMinutes: 25,
  from: 'manager',
  briefing: {
    subject: 'Mezzanine beam: your first calculation',
    body: `Hi {name},

The warehouse mezzanine needs a beam spanning **6 m**, simply supported, carrying a point load of **20 kN** at mid-span (the design load, already including our factors). In **Works Desk → Beams**, choose the **lightest** section whose bending stress is within the allowable stress.

I will check it before it goes to the client: that is how we do every calculation.

Helena`,
  },
  whyItMatters:
    'Too weak, and a structure fails; too heavy, and the client pays for steel they do not need. Engineers find the lightest safe answer, and have it checked.',
  objectives: [
    'Calculate a bending moment',
    'Compare stress with the allowable',
    'Choose the lightest safe section',
  ],
  steps: [
    {
      id: 'moment',
      title: 'The moment',
      instructions: 'M = P × L ÷ 4 = 20 × 6 ÷ 4 kN·m.',
    },
    {
      id: 'section',
      title: 'The section',
      instructions:
        'Compare each section’s stress with the allowable, and use the lightest that passes.',
    },
    { id: 'submit', title: 'Hand in', instructions: 'Click **Submit to {manager}**.' },
  ],
  tool: {
    id: 'engineering',
    title: 'Works Desk: mezzanine beam',
    start: beamStart,
    solution: must(chooseSection(beamStart, 'B-1', 'NB-200')),
    checks: [
      {
        id: 'safe',
        type: 'beam',
        beam: 'B-1',
        title: 'A section that is safe',
        points: 60,
        why: 'M = 30 kN·m. A section whose stress exceeds the allowable would be overstressed.',
        hint: 'Choose a section whose stress is no more than 165 N/mm².',
      },
      {
        id: 'lightest',
        type: 'beam',
        beam: 'B-1',
        section: 'NB-200',
        title: 'The lightest safe section',
        points: 40,
        why: 'NB-200 works at 158 N/mm² (96%); NB-150 would be overstressed; anything heavier wastes steel.',
        hint: 'Of the sections that pass, choose the one with the least mass.',
      },
    ],
  },
  passScore: 70,
  xp: 100,
  skills: { 'engineering-analysis': 35, 'design-judgement': 35 },
  feedback: feedback(
    'Helena',
    'NB-200: right, and economical. I checked it and signed it off.',
    'Work out the bending moment first.',
  ),
}

// ---------------------------------------------------------------------------
// 3. Maintenance: the conveyor bearing, under lockout-tagout
// ---------------------------------------------------------------------------

const woStart = sampleEngineering()

function woSolution() {
  let s = woStart
  for (const step of SAFE_ORDER) s = must(doStep(s, 'WO-311', step))
  return must(
    closeWorkOrder(
      s,
      'WO-311',
      64,
      'Replaced the drive-end bearing; runs quiet at 64 °C.',
    ),
  )
}

export const engMaintenance: AssignmentInput = {
  id: 'eng-maintenance',
  version: 1,
  careerId: 'engineering-services',
  levelId: 'graduate-engineer',
  order: 3,
  kind: 'tool',
  title: 'The hot bearing on Conveyor 3',
  summary:
    'Replace a motor bearing safely: permit, isolation, lockout-tagout, then the repair and a test run.',
  estimatedMinutes: 25,
  from: 'senior',
  briefing: {
    subject: 'WO-311: Conveyor 3 bearing',
    body: `Hi {name},

Conveyor 3’s drive motor bearing is running at 95 °C. We are replacing it today: work order **WO-311** in **Works Desk → Maintenance**.

Do it the safe way, in order: permit, isolate, your lock and tag, **prove it dead**, the repair, locks off when everyone is clear, and a test run. After the test run the bearing reads **64 °C** (the limit is 80 °C). Close the work order with what you did.

Dmitri`,
  },
  whyItMatters:
    'Machines that start unexpectedly kill and injure people every year. A permit, isolation, a personal lock and proving the equipment dead make it impossible for anyone to start it while you work.',
  objectives: [
    'Follow a safe system of work',
    'Apply lockout-tagout',
    'Close a job only when it is fixed',
  ],
  steps: [
    {
      id: 'safe',
      title: 'Make it safe',
      instructions: 'Permit, isolate, lock and tag, prove dead.',
    },
    {
      id: 'repair',
      title: 'Repair and test',
      instructions: 'Repair, remove your lock (everyone clear), test run.',
    },
    {
      id: 'close',
      title: 'Close it',
      instructions:
        'Record the 64 °C reading and what you did, then close the work order.',
    },
    { id: 'submit', title: 'Hand in', instructions: 'Click **Submit to {senior}**.' },
  ],
  tool: {
    id: 'engineering',
    title: 'Works Desk: WO-311',
    start: woStart,
    solution: woSolution(),
    checks: [
      {
        id: 'wo',
        type: 'work-order',
        order: 'WO-311',
        title: 'The bearing replaced safely, and the job closed',
        points: 100,
        why: 'Every step done in the safe order, and closed only once the reading was within the limit.',
        hint: 'Follow the steps from the top, then close with the reading.',
      },
    ],
  },
  passScore: 70,
  xp: 100,
  skills: { 'safe-systems-of-work': 50, accuracy: 15, 'technical-writing': 10 },
  feedback: feedback(
    'Dmitri',
    'Textbook. Permit, lock, proved dead, fixed, tested. That is how everyone goes home safe.',
    'Start at the top: the permit.',
  ),
}

// ---------------------------------------------------------------------------
// 4. Mechanical and planning: the conveyor drive and the mezzanine plan
// ---------------------------------------------------------------------------

const drivePlanStart = sampleEngineering()

function drivePlanSolution() {
  let s = must(setStages(drivePlanStart, 'G-1', [[20, 100]]))
  for (const id of ['A', 'B', 'E', 'F']) s = must(toggleCritical(s, 'P-1', id))
  return s
}

export const engDrivePlan: AssignmentInput = {
  id: 'eng-drive-plan',
  version: 1,
  careerId: 'engineering-services',
  levelId: 'engineer',
  order: 4,
  kind: 'tool',
  title: 'The conveyor drive and the installation plan',
  summary:
    'Choose gears for the right conveyor speed, and find the critical path of the mezzanine plan.',
  estimatedMinutes: 30,
  from: 'manager',
  briefing: {
    subject: 'Two jobs: gears and a plan',
    body: `Hi {name},

**1. Conveyor drive (Gear trains, G-1).** The motor runs at 1,450 rpm and the conveyor needs **290 rpm**. The current gears give the wrong speed. Choose gear pairs that give exactly 290 rpm.

**2. Mezzanine plan (Project planning, P-1).** The client wants to know which tasks cannot slip without delaying the handover. Mark the **critical path**.

Helena`,
  },
  whyItMatters:
    'The wrong ratio means a machine runs too fast or too slow for its process. And the critical path tells everyone where a delay matters, and where there is slack.',
  objectives: ['Calculate a gear ratio', 'Find a project’s critical path'],
  steps: [
    {
      id: 'gears',
      title: 'The gears',
      instructions: 'Ratio needed = 1,450 ÷ 290. Enter driver:driven pairs that give it.',
    },
    {
      id: 'plan',
      title: 'The critical path',
      instructions:
        'Find the longest chain of tasks from start to finish, and mark each task on it.',
    },
    { id: 'submit', title: 'Hand in', instructions: 'Click **Submit to {manager}**.' },
  ],
  tool: {
    id: 'engineering',
    title: 'Works Desk: drive and plan',
    start: drivePlanStart,
    solution: drivePlanSolution(),
    checks: [
      {
        id: 'gears',
        type: 'gears',
        gear: 'G-1',
        rpm: 290,
        tolerance: 1,
        title: 'The conveyor runs at 290 rpm',
        points: 50,
        why: '1,450 ÷ 290 = a 5 : 1 ratio, e.g. a 20-tooth gear driving a 100-tooth gear.',
        hint: 'One pair of 20:100, or two pairs whose ratios multiply to 5.',
      },
      {
        id: 'critical',
        type: 'critical-path',
        plan: 'P-1',
        title: 'The critical path marked',
        points: 50,
        why: 'Design, steel delivery, erection and inspection (24 days) have no float; preparing the floor and the foundations have a day to spare.',
        hint: 'Compare the two routes to “Erect the steelwork”.',
      },
    ],
  },
  passScore: 70,
  xp: 110,
  skills: { 'engineering-analysis': 35, 'design-judgement': 20, accuracy: 20 },
  feedback: feedback(
    'Helena',
    'Both right: 5 : 1, and the steel delivery is what we must chase.',
    'Start with the ratio: input speed ÷ output speed.',
  ),
}

// ---------------------------------------------------------------------------
// 5. Quality and environment: shaft inspection and the monitoring results
// ---------------------------------------------------------------------------

const qeStart = sampleEngineering()

function qeSolution() {
  let s = qeStart
  for (const [id, d] of [
    ['S-01', 'accept'],
    ['S-02', 'reject'],
    ['S-03', 'accept'],
    ['S-04', 'reject'],
  ] as const)
    s = must(decidePart(s, 'DW-12', id, d))
  s = must(
    flagSample(
      s,
      'E-1',
      'Told Dr Byrne; closing the settling tank outlet and re-sampling tomorrow.',
    ),
  )
  s = must(
    flagSample(
      s,
      'E-3',
      'Told Dr Byrne; checking the interceptor and re-sampling tomorrow.',
    ),
  )
  return s
}

export const engQuality: AssignmentInput = {
  id: 'eng-quality',
  version: 1,
  careerId: 'engineering-services',
  levelId: 'senior-engineer',
  order: 5,
  kind: 'tool',
  title: 'Shaft inspection and the monitoring results',
  summary:
    'Accept or reject machined shafts against the drawing, and flag monitoring results over the permit limits.',
  estimatedMinutes: 30,
  from: 'manager',
  briefing: {
    subject: 'Quality and environment checks',
    body: `Hi {name},

**1. Inspection.** Four drive shafts came back from the machine shop. In **Inspection**, compare each one with drawing DW-12 and accept only the ones where **every** feature is within tolerance.

**2. Environment.** This week’s monitoring results are in **Environment**. Flag every result over our permit limit, with what you are doing about it (tell Dr Byrne, and the next step). Don’t flag anything that is within its limit.

Helena`,
  },
  whyItMatters:
    'A part just outside tolerance can fail in service; a release over a permit limit harms the environment and breaks the law. Both are caught by careful checking against the numbers.',
  objectives: ['Inspect against tolerances', 'Recognise and report permit exceedances'],
  steps: [
    {
      id: 'inspect',
      title: 'Inspect the shafts',
      instructions: 'For each shaft, compare each deviation with the tolerance.',
    },
    {
      id: 'samples',
      title: 'The monitoring results',
      instructions: 'Flag each result above its limit, with the action.',
    },
    { id: 'submit', title: 'Hand in', instructions: 'Click **Submit to {manager}**.' },
  ],
  tool: {
    id: 'engineering',
    title: 'Works Desk: quality and environment',
    start: qeStart,
    solution: qeSolution(),
    checks: [
      {
        id: 'parts',
        type: 'parts',
        drawing: 'DW-12',
        title: 'Every shaft decided correctly',
        points: 50,
        why: 'S-02’s diameter (+0.08) and S-04’s keyway (+0.05) are outside tolerance; S-01 and S-03 conform.',
        hint: 'A part conforms only if every deviation is within its tolerance.',
      },
      {
        id: 'samples',
        type: 'samples',
        title: 'Exactly the exceedances flagged',
        points: 50,
        why: 'Suspended solids (42 > 30) and oil (12.5 > 10) exceed the limits; ammonia and NOx are within them.',
        hint: 'Compare each value with its limit.',
      },
    ],
  },
  passScore: 75,
  xp: 120,
  skills: { 'quality-control': 50, accuracy: 25 },
  feedback: feedback(
    'Helena',
    'Spot on, both. The machine shop is re-making two shafts, and the discharge is under control.',
    'Start with S-02: compare each deviation with its tolerance.',
  ),
}

export const ENGINEERING_TASKS = [
  engCircuit,
  engBeam,
  engMaintenance,
  engDrivePlan,
  engQuality,
]
