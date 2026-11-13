/**
 * Readiness assessments: engineering. Standard formulas with simplified,
 * fictional data, for learning.
 */
import type { CaseInput } from '../cases/schema'
import { assessment, report } from './shared'

/** Level 2: a heater circuit that trips. */
function heater(p: {
  version: string
  practical: string
  voltage: number
  resistance: number
  fuse: number
}) {
  const current = Math.round((p.voltage / p.resistance) * 100) / 100
  const power = Math.round(p.voltage * current)
  return assessment({
    practical: p.practical,
    id: 'ready-eng-engineer',
    careerId: 'engineering-services',
    level: 2,
    title: 'Readiness assessment: the heater that keeps tripping',
    summary: 'Work out a heater’s current, find why its fuse blows, and report the fix.',
    brief: `This assessment checks that you can apply electrical calculations and report a fix.

A workshop heater keeps blowing its fuse. Work out its current, decide what to do, write a short fault report in Word Craft, and explain it to the workshop supervisor. You have 3 hours. (Simplified data.)`,
    whyItMatters:
      'Engineers at the next level diagnose faults from first principles and fix the cause, safely.',
    objectives: ['Apply Ohm’s law', 'Size protection correctly', 'Report a fix'],
    evidence: [
      {
        id: 'heater',
        title: 'The heater',
        text: `A ${p.voltage} V heater element with a resistance of ${p.resistance} Ω, protected by a ${p.fuse} A fuse. The cable is rated well above the heater’s current.`,
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
            id: 'ohm',
            text: 'The current is the voltage divided by the resistance.',
            issue: true,
            why: 'Ohm’s law: I = V ÷ R.',
          },
          {
            id: 'bigger',
            text: 'Any bigger fuse is fine as long as it stops blowing.',
            issue: false,
            why: 'The fuse must also protect the cable: not more than the cable rating.',
          },
          {
            id: 'isolate',
            text: 'The heater must be isolated before the fuse is changed.',
            issue: true,
            why: 'Never work on a live circuit.',
          },
        ],
      },
      {
        id: 'current',
        kind: 'figure',
        title: 'The heater’s current',
        prompt: 'What current does the heater draw, in amps?',
        points: 10,
        answer: current,
        tolerance: 0.05,
        unit: 'A',
        why: `${p.voltage} V ÷ ${p.resistance} Ω = ${current} A.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'The fix',
        prompt: `The heater draws ${current} A and the fuse is ${p.fuse} A. What do you do?`,
        points: 10,
        options: [
          {
            id: 'size',
            label:
              'Isolate, and fit the next standard fuse above the heater’s current (still below the cable’s rating)',
            verdict: 'best',
            why: 'Protects the cable without nuisance tripping.',
          },
          {
            id: 'wire',
            label: 'Bridge the fuse with wire',
            verdict: 'poor',
            why: 'That removes all protection: a fire risk.',
          },
        ],
      },
      report(
        'Fault report: workshop heater',
        [['Fault'], ['Cause'], ['Fix']],
        [{ label: 'the current in amps', value: current }],
        [['fuse'], ['isolat']],
      ),
      {
        id: 'explain',
        kind: 'reply',
        to: 'the workshop supervisor',
        title: 'Explain the fix',
        prompt: 'Explain the fault and the fix to the supervisor.',
        points: 10,
        minWords: 35,
        mentions: [[String(current)], ['fuse'], ['isolat']],
        model: `Hi Gus, the heater draws ${current} A (${p.voltage} V ÷ ${p.resistance} Ω, about ${power} W), more than its ${p.fuse} A fuse. I isolated it and fitted the next standard fuse above its current, still below the cable’s rating. It runs without tripping. {name}`,
      },
    ],
    skills: { 'engineering-analysis': 30, 'safe-systems-of-work': 20 },
  })
}

/** Level 3: a risk assessment for a lifting job. */
function lift(p: {
  version: string
  practical: string
  likelihood: number
  severity: number
}) {
  const risk = p.likelihood * p.severity
  return assessment({
    practical: p.practical,
    id: 'ready-eng-senior',
    careerId: 'engineering-services',
    level: 3,
    title: 'Readiness assessment: the risk assessment for a lift',
    summary: 'Score the risk of a lifting job, decide the controls, and brief the team.',
    brief: `This assessment checks that you can assess risk and set safe controls.

A motor is to be lifted out with the overhead crane. Score the risk, decide the controls, write the risk assessment in Word Craft, and brief the team. You have 3 hours. (A simplified 5 × 5 risk matrix.)`,
    whyItMatters:
      'Senior engineers plan the work others do. A clear risk assessment, with real controls, keeps the team safe.',
    objectives: ['Score a risk', 'Choose controls by the hierarchy', 'Brief the team'],
    evidence: [
      {
        id: 'job',
        title: 'The job and the matrix',
        text: `Lifting a 600 kg motor with the overhead crane over a walkway. Likelihood of something going wrong without controls: ${p.likelihood} (out of 5). Severity if it does: ${p.severity} (out of 5). Risk = likelihood × severity; 15 or more is high and must not go ahead without controls.`,
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'Controls',
        prompt: 'Tick every statement that is true.',
        points: 15,
        findings: [
          {
            id: 'exclusion',
            text: 'Closing the walkway under the lift removes people from the hazard.',
            issue: true,
            why: 'Elimination of exposure is the strongest control.',
          },
          {
            id: 'ppe-only',
            text: 'Hard hats alone make it safe.',
            issue: false,
            why: 'PPE is the last line of defence, not the first.',
          },
          {
            id: 'inspect',
            text: 'The crane and slings must be inspected and in date.',
            issue: true,
            why: 'Lifting equipment must be examined before use.',
          },
        ],
      },
      {
        id: 'score',
        kind: 'figure',
        title: 'The risk score',
        prompt: 'What is the risk score before controls?',
        points: 10,
        answer: risk,
        tolerance: 0,
        unit: '',
        why: `${p.likelihood} × ${p.severity} = ${risk}.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'Go ahead?',
        prompt: 'What do you decide?',
        points: 10,
        options: [
          {
            id: 'controls',
            label:
              'Go ahead only with the walkway closed, inspected equipment, a trained slinger and a lift plan',
            verdict: 'best',
            why: 'High risk reduced by real controls.',
          },
          {
            id: 'go',
            label: 'Go ahead carefully',
            verdict: 'poor',
            why: '“Carefully” is not a control.',
          },
        ],
      },
      report(
        'Risk assessment: motor lift',
        [['Hazards'], ['Risk'], ['Controls']],
        [{ label: 'the risk score', value: risk }],
        [['walkway'], ['inspect']],
      ),
      {
        id: 'brief',
        kind: 'reply',
        to: 'the lifting team',
        title: 'Brief the team',
        prompt: 'Brief the team on the risk and the controls.',
        points: 10,
        minWords: 35,
        mentions: [[String(risk)], ['walkway'], ['slinger', 'lift plan']],
        model: `Team, the motor lift scores ${risk} before controls, which is high. So: the walkway below is closed, the crane and slings are inspected and in date, a trained slinger guides the lift, and we follow the lift plan. Anyone can stop the lift if something looks wrong. {name}`,
      },
    ],
    skills: { 'safe-systems-of-work': 30, 'design-judgement': 20 },
  })
}

export const ASSESSMENTS_ENGINEERING: Record<string, CaseInput[]> = {
  'ready-eng-engineer': [
    heater({
      version: 'a',
      practical: 'eng-circuit',
      voltage: 230,
      resistance: 23,
      fuse: 5,
    }),
    heater({
      version: 'b',
      practical: 'eng-beam',
      voltage: 230,
      resistance: 46,
      fuse: 3,
    }),
  ],
  'ready-eng-senior': [
    lift({ version: 'a', practical: 'eng-maintenance', likelihood: 4, severity: 5 }),
    lift({ version: 'b', practical: 'eng-drive-plan', likelihood: 3, severity: 5 }),
  ],
}
