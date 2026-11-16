/**
 * What goes wrong on site, and what the engineer decides. Each issue comes
 * up at a point in a construction stage, stops that work until the player
 * decides, and each choice has its consequences: quality, safety, cost,
 * time, the client's satisfaction, the player's reputation and colleagues'
 * trust. Some choices change the as-built work itself (bars spaced too far
 * apart, a gap cut without a lintel), which the inspections then find.
 *
 * Pure data and rules; the people are the site team (content in people.ts).
 */
import type { StageId } from './quantities'

export interface Effects {
  quality?: number
  safety?: number
  client?: number
  /** £ added to the project's cost. */
  cost?: number
  /** Working days the site loses. */
  days?: number
  reputation?: number
  /** Office colleagues' trust (person IDs of the department). */
  trust?: Record<string, number>
  /** Changes to the as-built work, by inspection item ID (a deviation, in the item's unit). */
  asBuilt?: Record<string, number>
  xp?: number
}

export interface IssueChoice {
  id: string
  label: string
  effects: Effects
  /** What happens, told afterwards. */
  outcome: string
  /** The professional choice (for feedback and tests). */
  best?: boolean
  /** A wrong guess that leaves the issue open (the player tries again). */
  retry?: boolean
  /** The issue stays open until an approved design revision does what was asked. */
  awaitRevision?: boolean
}

export interface IssueDef {
  id: string
  title: string
  /** The stage it comes up in: the first of these the project has. */
  stage: StageId | StageId[]
  /** How far into the stage it comes up (0–1). */
  at: number
  /** Who raises it (a site person's ID, see people.ts). */
  who: string
  /** What they say. */
  text: string
  /** Readings or facts the player can look at before deciding. */
  facts?: (seed: number) => string[]
  choices: (seed: number) => IssueChoice[]
  /** The lesson, shown with the outcome. */
  lesson: string
}

/** Which circuit fails its insulation test (1-based), from the project's seed. */
export function faultyCircuit(seed: number, circuits: number): number {
  return (Math.abs(seed) % Math.max(1, circuits)) + 1
}

/** Insulation resistance readings (MΩ) for each circuit: one below 1 MΩ. */
export function irReadings(seed: number, circuits: number): number[] {
  const bad = faultyCircuit(seed, circuits)
  return Array.from({ length: Math.max(1, circuits) }, (_, i) =>
    i + 1 === bad ? 0.4 : 50 + ((seed * (i + 3)) % 150),
  )
}

export const ISSUES: IssueDef[] = [
  {
    id: 'excavator-hose',
    title: 'Excavator hydraulic hose burst',
    stage: 'excavation',
    at: 0.45,
    who: 'supervisor',
    text: 'A hydraulic hose on the excavator has just burst. There’s oil on the ground by the trench, and the machine’s stopped. The lads reckon they can tape it and keep digging.',
    choices: () => [
      {
        id: 'contain-replace',
        label:
          'Stop, contain the spill with the spill kit, and get a replacement machine',
        effects: {
          cost: 900,
          days: 1,
          safety: 2,
          reputation: 2,
          trust: { hr: 4 },
          xp: 10,
        },
        outcome:
          'The spill is contained before it reaches the drain, the soil is bagged for disposal, and a replacement excavator arrives the next morning.',
        best: true,
      },
      {
        id: 'wait-fitter',
        label: 'Contain the spill and wait for the hire company’s fitter',
        effects: { days: 2, cost: 250 },
        outcome:
          'The spill is contained; the fitter comes two days later and the hose is replaced.',
      },
      {
        id: 'tape-it',
        label: 'Tape the hose and keep digging',
        effects: { safety: -20, quality: -5, reputation: -6, trust: { hr: -8 } },
        outcome:
          'The tape fails within the hour and sprays oil across the operator’s cab. Nobody is hurt, but the oil has reached the surface-water drain and has to be reported.',
      },
    ],
    lesson:
      'Pressurised hydraulic oil can inject through skin, and a spill must be contained before it reaches a drain. Stop the machine, contain, report, and repair properly.',
  },
  {
    id: 'rebar-short',
    title: 'Reinforcement delivery short',
    stage: 'reinforcement',
    at: 0.3,
    who: 'supervisor',
    text: 'The steel fixers have only had 60% of the reinforcement. The supplier can’t deliver the rest until next week. One of them says if we space the bars out a bit we’ll have enough to finish.',
    choices: () => [
      {
        id: 'alternative-supplier',
        label:
          'Order the same bars from the approved alternative supplier, at a higher price',
        effects: {
          cost: 1800,
          days: 1,
          quality: 2,
          reputation: 2,
          trust: { manager: 4 },
          xp: 10,
        },
        outcome:
          'The alternative supplier delivers the next day. The bars match the schedule.',
        best: true,
      },
      {
        id: 'wait',
        label: 'Wait for the original supplier',
        effects: { days: 5, client: -5 },
        outcome: 'The site stands for five days. The client is unhappy about the delay.',
      },
      {
        id: 'space-out',
        label: 'Space the bars further apart to make the steel go round',
        effects: {
          quality: -15,
          safety: -15,
          reputation: -4,
          asBuilt: { spacing: 100 },
        },
        outcome:
          'The fixers finish with the bars at 300 mm centres instead of 200 mm. The foundation now has a third less steel than designed.',
      },
    ],
    lesson:
      'Reinforcement is designed: spacing it out to save steel weakens the concrete. Changes to the design go back to the designer; materials are substituted only like for like.',
  },
  {
    id: 'rain-pour',
    title: 'Heavy rain forecast for the concrete pour',
    stage: 'foundations',
    at: 0.15,
    who: 'manager-site',
    text: 'The concrete is booked for this afternoon, but the forecast says heavy rain from two o’clock. Cancelling the trucks costs a day; pouring in heavy rain washes out the cement at the surface.',
    choices: () => [
      {
        id: 'postpone',
        label: 'Postpone the pour to the next dry day',
        effects: { days: 1, cost: 300, quality: 2, xp: 10 },
        outcome:
          'The pour moves to the next morning, dry and still. The concrete is placed and cured well.',
        best: true,
      },
      {
        id: 'covers',
        label: 'Pour this morning and protect it with covers',
        effects: { cost: 600 },
        outcome:
          'The crew pours early and gets the covers on before the rain. A little surface damage at one end.',
      },
      {
        id: 'pour-anyway',
        label: 'Pour anyway; it will be fine',
        effects: { quality: -15, client: -3, reputation: -3 },
        outcome:
          'The rain washes the surface of the concrete out. Cores later show weak concrete at the top.',
      },
    ],
    lesson:
      'Concrete needs protecting while it sets: heavy rain, frost and heat all weaken it. A day’s delay is cheaper than weak foundations.',
  },
  {
    id: 'client-window',
    title: 'The client wants another window',
    stage: 'walls',
    at: 0.3,
    who: 'client',
    text: 'I’ve been looking at the walls going up: it’s going to be dark at the back. Can you put another window in? The bricklayers say they can just leave a gap.',
    choices: () => [
      {
        id: 'revise',
        label:
          'Agree to look at it: revise the drawings, check the lintel, and get the revision approved before the bricklayers build that wall',
        effects: { client: 5, reputation: 3, trust: { manager: 3 }, xp: 15 },
        outcome:
          'The walls wait while you revise the design. Add the window in CAD Craft or the plan editor, then submit the revision for approval.',
        best: true,
        awaitRevision: true,
      },
      {
        id: 'leave-gap',
        label: 'Tell the bricklayers to leave a gap for it',
        effects: {
          client: 5,
          quality: -15,
          safety: -15,
          reputation: -8,
          trust: { manager: -6 },
          asBuilt: { openings: 1 },
        },
        outcome:
          'The gap goes in without a lintel or a revised drawing. It is not on any approved drawing, and nobody checked what holds the blockwork above it.',
      },
      {
        id: 'decline',
        label: 'Say no: the design is approved and it is too late',
        effects: { client: -15 },
        outcome:
          'The client accepts it, unhappily, and mentions it at every site meeting.',
      },
    ],
    lesson:
      'A change on site is still a design change: it is drawn, checked (here, the lintel and the wall either side) and approved before it is built. Approved drawings are what the site builds.',
  },
  {
    id: 'harness',
    title: 'Working at height without a harness',
    stage: ['roofing', 'structure'],
    at: 0.35,
    who: 'safety',
    text: 'There’s a roofer at the edge of the roof without his harness clipped on. He says he’s only up there for five minutes.',
    choices: () => [
      {
        id: 'stop-brief',
        label:
          'Stop the work now, get him down, and brief the whole crew before restarting',
        effects: { days: 0.5, safety: 5, reputation: 3, trust: { hr: 6 }, xp: 10 },
        outcome:
          'Work stops for a toolbox talk on working at height. The harness anchor turns out to be too far from the edge: a second line is fitted.',
        best: true,
      },
      {
        id: 'word-later',
        label: 'Have a word with him at the end of the day',
        effects: { safety: -10, trust: { hr: -4 } },
        outcome: 'He carries on unclipped all afternoon. Nothing happens, this time.',
      },
      {
        id: 'ignore',
        label: 'It is his responsibility; carry on',
        effects: { safety: -25, reputation: -8, trust: { hr: -10 } },
        outcome:
          'A safety inspector visiting the next day sees the same thing and issues a prohibition notice: the roof work stops until it is fixed.',
      },
    ],
    lesson:
      'Falls from height are the biggest killer in construction. Anyone who sees unsafe work stops it: “five minutes” is long enough to fall.',
  },
  {
    id: 'ir-test',
    title: 'An electrical circuit fails its insulation test',
    stage: 'electrical',
    at: 0.6,
    who: 'electrician',
    text: 'One circuit is failing the insulation resistance test. The minimum is 1 MΩ. Here are the readings: which circuit do we strip back and fix?',
    facts: () => [],
    choices: () => [],
    lesson:
      'Insulation resistance shows whether a cable’s insulation is damaged (a nail through it, a nicked sheath). Below 1 MΩ the circuit is not safe to energise: find the fault, repair it, and test again.',
  },
  {
    id: 'budget',
    title: 'The cost forecast is over budget',
    stage: 'finishing',
    at: 0.1,
    who: 'manager-site',
    text: 'The cost report says we’ll finish over the client’s budget. How do we handle it?',
    choices: () => [
      {
        id: 'tell-client',
        label: 'Tell the client now, with the reasons and options to bring it down',
        effects: { client: 3, reputation: 4, trust: { manager: 4 }, xp: 10 },
        outcome:
          'The client appreciates hearing it early. They agree a simpler floor finish in the store area and accept the rest.',
        best: true,
      },
      {
        id: 'cheap-finishes',
        label: 'Quietly use cheaper finishes to save money',
        effects: { cost: -2500, quality: -10, client: -10, reputation: -5 },
        outcome:
          'The client notices the finishes at handover and is not pleased that nobody asked.',
      },
      {
        id: 'hide',
        label: 'Say nothing and claim it at the end',
        effects: { client: -20, reputation: -8, trust: { manager: -6 } },
        outcome:
          'The final account arrives over budget with no warning. The client disputes it.',
      },
    ],
    lesson:
      'Cost problems only get worse when hidden. Report early, explain why, and offer the client choices.',
  },
]

/** The stage an issue comes up in on a project with these stages (null: it does not). */
export function issueStage(def: IssueDef, stages: readonly StageId[]): StageId | null {
  const wanted = Array.isArray(def.stage) ? def.stage : [def.stage]
  return wanted.find((s) => stages.includes(s)) ?? null
}

export function getIssue(id: string): IssueDef | undefined {
  return ISSUES.find((i) => i.id === id)
}

/** The insulation test's readings and choices depend on the design's circuits. */
export function issueChoices(
  def: IssueDef,
  seed: number,
  circuits: number,
): IssueChoice[] {
  if (def.id !== 'ir-test') return def.choices(seed)
  const bad = faultyCircuit(seed, circuits)
  const readings = irReadings(seed, circuits)
  return [
    ...readings.map((_, i) => {
      const n = i + 1
      return n === bad
        ? {
            id: `circuit-${n}`,
            label: `Circuit ${n}`,
            effects: { days: 0.5, cost: 150, quality: 2, xp: 10 },
            outcome: `Circuit ${n}’s cable had been pierced by a fixing behind the plasterboard. It is replaced and now tests at over 200 MΩ.`,
            best: true,
          }
        : {
            id: `circuit-${n}`,
            label: `Circuit ${n}`,
            effects: { days: 0.25, cost: 80 },
            outcome: `Circuit ${n} reads ${readings[i]} MΩ: it was never the problem. Look at the readings again.`,
            retry: true,
          }
    }),
    {
      id: 'sign-off',
      label: 'Sign the installation off anyway; it is only one circuit',
      effects: {
        safety: -25,
        quality: -10,
        reputation: -8,
        asBuilt: { [`ir-${bad}`]: -1 },
      },
      outcome:
        'The circuit is energised with damaged insulation. It is a shock and fire risk until someone finds it.',
    },
  ]
}

export function issueFacts(def: IssueDef, seed: number, circuits: number): string[] {
  if (def.id !== 'ir-test') return def.facts?.(seed) ?? []
  return irReadings(seed, circuits).map((r, i) => `Circuit ${i + 1}: ${r} MΩ`)
}
