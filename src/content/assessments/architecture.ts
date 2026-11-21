/**
 * Readiness assessments: architecture and interior design. Simplified space
 * guidance with fictional projects, for learning.
 */
import type { CaseInput } from '../cases/schema'
import { assessment, report } from './shared'

const CAREER = 'architecture-interiors'

/** Level 2: is a bedroom big enough for a double? */
function bedroom(p: {
  version: string
  practical: string
  width: number
  depth: number
}) {
  const area = Math.round(p.width * p.depth * 100) / 100
  const meets = area >= 11.5 && p.width >= 2.75
  return assessment({
    practical: p.practical,
    id: 'ready-arch-designer',
    careerId: CAREER,
    level: 2,
    title: 'Readiness assessment: is it a double bedroom?',
    summary:
      'Check a bedroom against the space standard, decide what to tell the client, and report.',
    brief: `This assessment checks that you can check a design against a space standard and advise a client.

A developer wants to sell a flat as "two double bedrooms". Check bedroom 2, decide what to advise, write a short note in Word Craft, and explain it to the developer. You have 3 hours. (Simplified space guidance: a double bedroom needs at least 11.5 m² and 2.75 m width.)`,
    whyItMatters:
      "Designers at the next level check their own and others' plans against standards before a client relies on them.",
    objectives: [
      "Measure a room's area",
      'Check it against a standard',
      'Advise a client honestly',
    ],
    evidence: [
      {
        id: 'room',
        title: 'Bedroom 2 (inside the walls)',
        text: `${p.width.toFixed(2)} m wide × ${p.depth.toFixed(2)} m deep. One window. The developer's brochure calls it a double bedroom.`,
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'What is true?',
        prompt: 'Tick every statement that is true.',
        points: 15,
        findings: [
          {
            id: 'inside',
            text: 'Room areas are measured inside the walls.',
            issue: true,
            why: 'The usable floor is what counts.',
          },
          {
            id: 'both',
            text: 'A double bedroom must meet both the area and the width.',
            issue: true,
            why: 'A long, thin room can have the area but not fit a double bed with space round it.',
          },
          {
            id: 'brochure',
            text: 'If the brochure says double, it is a double.',
            issue: false,
            why: 'The standard decides, not the marketing.',
          },
        ],
      },
      {
        id: 'area',
        kind: 'figure',
        title: 'Its area',
        prompt: "What is bedroom 2's area, in m²?",
        points: 10,
        answer: area,
        tolerance: 0.02,
        unit: 'm²',
        why: `${p.width.toFixed(2)} × ${p.depth.toFixed(2)} = ${area} m².`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'Your advice',
        prompt: 'What do you advise the developer?',
        points: 10,
        options: meets
          ? [
              {
                id: 'yes',
                label: 'It meets the standard: it can be called a double',
                verdict: 'best',
                why: `${area} m² and ${p.width.toFixed(2)} m wide meet 11.5 m² and 2.75 m.`,
              },
              {
                id: 'no',
                label: 'It must be sold as a single',
                verdict: 'poor',
                why: 'It meets both parts of the standard.',
              },
            ]
          : [
              {
                id: 'single',
                label: 'Sell it as a single bedroom, or enlarge it to meet the standard',
                verdict: 'best',
                why: `${area} m² is below 11.5 m².`,
              },
              {
                id: 'yes',
                label: 'Call it a double: it is close enough',
                verdict: 'poor',
                why: 'Misdescribing a home misleads buyers.',
              },
            ],
      },
      report(
        'Note: bedroom 2 against the space standard',
        [['Standard'], ['Measurement'], ['Advice']],
        [{ label: 'the area in m²', value: area }],
        [['11.5'], [meets ? 'double' : 'single']],
      ),
      {
        id: 'explain',
        kind: 'reply',
        to: 'the developer',
        title: 'Explain it to the developer',
        prompt: 'Explain your finding and your advice.',
        points: 10,
        minWords: 35,
        mentions: [[String(area)], ['11.5'], [meets ? 'double' : 'single']],
        model: meets
          ? `Bedroom 2 is ${p.width.toFixed(2)} × ${p.depth.toFixed(2)} m inside the walls, ${area} m². A double bedroom needs at least 11.5 m² and 2.75 m width, so it meets the standard and can be sold as a double. {name}`
          : `Bedroom 2 is ${p.width.toFixed(2)} × ${p.depth.toFixed(2)} m inside the walls, ${area} m². A double bedroom needs at least 11.5 m², so it should be sold as a single, or enlarged to meet the standard. {name}`,
      },
    ],
    skills: { 'space-planning': 30, 'client-briefs': 20 },
  })
}

/** Level 3: how many desks fit, and the client wants more. */
function occupancy(p: {
  version: string
  practical: string
  area: number
  wanted: number
}) {
  const desks = Math.floor(p.area / 8)
  const short = p.wanted - desks
  return assessment({
    practical: p.practical,
    id: 'ready-arch-senior',
    careerId: CAREER,
    level: 3,
    title: 'Readiness assessment: how many desks?',
    summary:
      'Work out how many desks an office holds, advise a client who wants more, and report.',
    brief: `This assessment checks that you can plan an office to a density and advise a client.

A client wants ${p.wanted} desks in their open-plan office. Work out how many fit at our allowance of 8 m² per desk (including circulation), decide what to advise, write a short note in Word Craft, and reply to the client. You have 3 hours.`,
    whyItMatters:
      "Senior designers set what a space can hold and keep clients' expectations honest, with options.",
    objectives: [
      'Plan to a space allowance',
      'Advise a client with options',
      'Report clearly',
    ],
    evidence: [
      {
        id: 'office',
        title: 'The open-plan office',
        text: `${p.area} m² of open-plan floor, after meeting rooms and support spaces. The client wants ${p.wanted} desks; staff are in the office three days a week on average.`,
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'What is true?',
        prompt: 'Tick every statement that is true.',
        points: 15,
        findings: [
          {
            id: 'circulation',
            text: 'The 8 m² allowance includes the space to walk between desks.',
            issue: true,
            why: 'Circulation is part of the allowance.',
          },
          {
            id: 'squeeze',
            text: 'Desks can always be moved closer to fit more.',
            issue: false,
            why: 'Below the allowance, routes and clearances fail.',
          },
          {
            id: 'sharing',
            text: 'If staff come in part of the week, shared desks can serve more people.',
            issue: true,
            why: 'Desk sharing matches desks to attendance.',
          },
        ],
      },
      {
        id: 'desks',
        kind: 'figure',
        title: 'Desks that fit',
        prompt: 'How many desks fit, at 8 m² each?',
        points: 10,
        answer: desks,
        tolerance: 0,
        unit: 'desks',
        why: `${p.area} ÷ 8 = ${(p.area / 8).toFixed(1)}, so ${desks} desks.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'Your advice',
        prompt: `${desks} fit; the client wants ${p.wanted}. What do you advise?`,
        points: 10,
        options: [
          {
            id: 'share',
            label: `${desks} desks, shared: with staff in three days a week, ${desks} desks serve ${p.wanted} people`,
            verdict: 'best',
            why: 'It meets the need within the space, safely.',
          },
          {
            id: 'squeeze',
            label: `Squeeze in ${p.wanted} desks`,
            verdict: 'poor',
            why: `${short} desks over the allowance breaks the clearances.`,
          },
        ],
      },
      report(
        'Note: desk numbers',
        [['Space'], ['Capacity'], ['Recommendation']],
        [{ label: 'the number of desks', value: desks }],
        [['8 m'], ['shar']],
      ),
      {
        id: 'reply',
        kind: 'reply',
        to: 'the client',
        title: 'Reply to the client',
        prompt: 'Explain the capacity and your recommendation.',
        points: 10,
        minWords: 35,
        mentions: [[String(desks)], ['8 m'], ['shar']],
        model: `At 8 m² per desk, including space to move, the ${p.area} m² floor holds ${desks} desks, ${short} fewer than ${p.wanted}. As staff are in three days a week, I recommend ${desks} shared desks with a simple booking system: everyone has a desk when they are in, safely. {name}`,
      },
    ],
    skills: { 'space-planning': 30, 'client-briefs': 20 },
  })
}

export const ASSESSMENTS_ARCHITECTURE: Record<string, CaseInput[]> = {
  'ready-arch-designer': [
    bedroom({ version: 'a', practical: 'arch-two-bed', width: 3.2, depth: 3.4 }),
    bedroom({ version: 'b', practical: 'arch-reception', width: 3.0, depth: 4.0 }),
  ],
  'ready-arch-senior': [
    occupancy({ version: 'a', practical: 'arch-tight', area: 132, wanted: 20 }),
    occupancy({ version: 'b', practical: 'arch-commercial', area: 116, wanted: 18 }),
  ],
}
