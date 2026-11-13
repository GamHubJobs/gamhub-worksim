/**
 * Readiness assessments: healthcare. Fictional patients; a simulation for
 * learning, not medical advice.
 */
import type { CaseInput } from '../cases/schema'
import { escalationFor, warningScore } from '../../tools/clinical/model'
import { assessment, report } from './shared'

/** Level 2: a patient getting worse. The score is worked out from the observations. */
function deteriorating(p: {
  version: string
  practical: string
  name: string
  bed: string
  obs: {
    resp: number
    spo2: number
    temp: number
    sys: number
    dia: number
    pulse: number
    alert: boolean
  }
}) {
  const { score, anyThree } = warningScore(p.obs)
  const level = escalationFor(score, anyThree).level
  return assessment({
    practical: p.practical,
    id: 'ready-hc-assistant',
    careerId: 'healthcare',
    level: 2,
    title: 'Readiness assessment: a patient getting worse',
    summary:
      'Work out a patient’s early-warning score, escalate correctly, and record it.',
    brief: `This assessment checks that you can recognise a patient who is getting worse and act on it.

Work out ${p.name}’s early-warning score from the observations, decide what to do, write a short escalation record in Word Craft, and hand over to the nurse in charge. You have 3 hours. (Fictional patient; the score is the ward’s simplified teaching score.)`,
    whyItMatters:
      'Healthcare Assistants take most of the observations on a ward. Recognising deterioration and escalating it clearly is the single most important safety skill at the next level.',
    objectives: [
      'Work out the early-warning score',
      'Escalate at the right level',
      'Record and hand over clearly',
    ],
    evidence: [
      {
        id: 'obs',
        title: `${p.name}, bed ${p.bed}: observations at 14:00`,
        table: {
          head: ['Breathing', 'O₂ %', 'Temp °C', 'BP', 'Pulse', 'Alert?'],
          rows: [
            [
              String(p.obs.resp),
              String(p.obs.spo2),
              String(p.obs.temp),
              `${p.obs.sys}/${p.obs.dia}`,
              String(p.obs.pulse),
              p.obs.alert ? 'Yes' : 'No: new confusion',
            ],
          ],
        },
      },
      {
        id: 'scoring',
        title: 'The ward’s teaching score',
        text: 'Breathing: 8 or less 3; 9–11 1; 12–20 0; 21–24 2; 25 or more 3. Oxygen: 91 or less 3; 92–93 2; 94–95 1. Temperature: 35 or less 3; 35.1–36 1; 38.1–39 1; above 39 2. Upper blood pressure: 90 or less 3; 91–100 2; 101–110 1; 220 or more 3. Pulse: 40 or less 3; 41–50 1; 91–110 1; 111–130 2; above 130 3. Not alert: 3. Escalation: 1–4 tell the nurse in charge; 5–6 or any single 3 urgent doctor review; 7 or more emergency.',
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'What the observations show',
        prompt: 'Tick every statement that is true.',
        points: 15,
        findings: [
          {
            id: 'repeat-later',
            text: 'It is fine to repeat the observations at the next routine round before telling anyone.',
            issue: false,
            why: `A score of ${score} needs action now, not at the next round.`,
          },
          {
            id: 'sbar',
            text: 'The escalation should give the score and the actual numbers.',
            issue: true,
            why: 'The person you call needs facts to judge how urgent it is.',
          },
          {
            id: 'record',
            text: 'The escalation must be recorded in the patient’s notes.',
            issue: true,
            why: 'If it isn’t written down, it didn’t happen: the next shift needs to know.',
          },
        ],
      },
      {
        id: 'score',
        kind: 'figure',
        title: 'The score',
        prompt: `What is ${p.name}’s early-warning score?`,
        points: 10,
        answer: score,
        tolerance: 0,
        why: `Adding the points for each observation gives ${score}.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'What do you do?',
        prompt: 'Choose your action.',
        points: 10,
        options: [
          {
            id: 'right',
            label:
              level === 'emergency'
                ? 'Call the doctor and the outreach team now, and stay with the patient'
                : 'Tell the nurse in charge and ask for an urgent doctor review now, using SBAR',
            verdict: 'best',
            why: `A score of ${score} is ${level === 'emergency' ? 'an emergency' : 'urgent'}.`,
          },
          {
            id: 'wait',
            label: 'Recheck in four hours',
            verdict: 'poor',
            why: 'Waiting lets a seriously ill patient get worse.',
          },
          {
            id: 'tell-only',
            label: 'Mention it to a colleague at the next break',
            verdict: 'poor',
            why: 'An informal mention is not an escalation.',
          },
        ],
      },
      report(
        `Escalation record: ${p.name}`,
        [['Situation'], ['Background'], ['Assessment'], ['Recommendation']],
        [{ label: 'the early-warning score', value: score }],
        [
          ['oxygen', 'saturation'],
          ['escalat', 'review'],
        ],
      ),
      {
        id: 'handover',
        kind: 'reply',
        to: 'the nurse in charge',
        title: 'Hand over',
        prompt: 'Write your SBAR handover to the nurse in charge.',
        points: 10,
        minWords: 40,
        mentions: [
          [String(score)],
          [String(p.obs.spo2), 'oxygen'],
          ['review', 'see', 'assess'],
        ],
        avoid: [
          {
            terms: ['probably fine', 'nothing to worry'],
            why: 'Never play down a high score.',
          },
        ],
        model: `Situation: ${p.name} in ${p.bed} has an early-warning score of ${score}. Background: admitted with an infection. Assessment: breathing ${p.obs.resp}, oxygen ${p.obs.spo2}%, pulse ${p.obs.pulse}, blood pressure ${p.obs.sys}/${p.obs.dia}. Recommendation: please review her now; I am staying with her and repeating the observations. {name}`,
      },
    ],
    skills: { 'clinical-observation': 30, 'clinical-documentation': 20 },
  })
}

/** Level 3: an audit of a medicines chart (doses without a record). */
function chartAudit(p: {
  version: string
  practical: string
  doses: Array<[string, string, string]>
}) {
  const unexplained = p.doses.filter(([, outcome]) => outcome === '').length
  return assessment({
    practical: p.practical,
    id: 'ready-hc-senior',
    careerId: 'healthcare',
    level: 3,
    title: 'Readiness assessment: the medicines chart audit',
    summary:
      'Audit a week of a medicines chart, find the gaps, and report what to change.',
    brief: `This assessment checks that you can audit medicines records and lead improvement.

Audit the chart extract, count the doses with no record, decide what to do, write an audit report in Word Craft, and brief the ward manager. You have 3 hours. (Fictional patient and medicines.)`,
    whyItMatters:
      'Senior support staff help keep the ward’s records safe: audits find the gaps before they cause harm.',
    objectives: [
      'Find unexplained gaps in a medicines chart',
      'Recommend proportionate improvements',
    ],
    evidence: [
      {
        id: 'chart',
        title: 'Glucoren 500 mg, twice a day: chart extract',
        table: {
          head: ['Dose', 'Recorded', 'Reason'],
          rows: p.doses.map(([when, outcome, reason]) => [
            when,
            outcome || '(blank)',
            reason,
          ]),
        },
      },
    ],
    steps: [
      {
        id: 'review',
        kind: 'review',
        title: 'What the audit shows',
        prompt: 'Tick every statement that is true.',
        points: 15,
        findings: [
          {
            id: 'blank',
            text: 'A blank on the chart could mean the dose was forgotten.',
            issue: true,
            why: 'Without a record, nobody can tell whether it was given.',
          },
          {
            id: 'withheld-ok',
            text: 'Doses recorded as not given, with a reason, are acceptable.',
            issue: true,
            why: 'A recorded decision with a reason is safe practice.',
          },
          {
            id: 'blame',
            text: 'The audit should name and discipline whoever left the blanks.',
            issue: false,
            why: 'Audits are for learning and systems; individual issues are handled supportively and separately.',
          },
        ],
      },
      {
        id: 'count',
        kind: 'figure',
        title: 'Unexplained doses',
        prompt: 'How many doses have no record at all?',
        points: 10,
        answer: unexplained,
        tolerance: 0,
        why: `${unexplained} doses are blank.`,
      },
      {
        id: 'decide',
        kind: 'decide',
        title: 'What do you recommend?',
        prompt: 'Choose your main recommendation.',
        points: 10,
        options: [
          {
            id: 'system',
            label:
              'Report it to the ward manager, check the patient is safe, and suggest a check of every chart at each handover',
            verdict: 'best',
            why: 'Patient first, then a system change that catches gaps every shift.',
          },
          {
            id: 'fill',
            label: 'Fill in the blanks as “given”: they probably were',
            verdict: 'poor',
            why: 'Never record something you did not see: that is falsifying a record.',
          },
          {
            id: 'ignore',
            label: 'Do nothing: the patient seems fine',
            verdict: 'poor',
            why: 'Gaps in medicines records are a safety risk even when no harm is seen.',
          },
        ],
      },
      report(
        'Medicines chart audit',
        [['Findings'], ['Risk'], ['Recommendations']],
        [{ label: 'the number of unexplained doses', value: unexplained }],
        [['handover'], ['blank', 'gap']],
      ),
      {
        id: 'brief',
        kind: 'reply',
        to: 'the ward manager',
        title: 'Brief the ward manager',
        prompt: 'Write a short briefing: what you found and what you recommend.',
        points: 10,
        minWords: 40,
        mentions: [[String(unexplained)], ['handover', 'check'], ['safe', 'patient']],
        avoid: [
          { terms: ['useless', 'careless'], why: 'Keep it factual and supportive.' },
        ],
        model: `Hi Grace, the audit of the Glucoren chart found ${unexplained} doses with no record at all. I checked with the nurse in charge and the patient is safe. I recommend we check every medicines chart at handover so gaps are caught the same day. {name}`,
      },
    ],
    skills: { 'patient-safety': 25, 'clinical-documentation': 25 },
  })
}

export const ASSESSMENTS_HEALTHCARE: Record<string, CaseInput[]> = {
  'ready-hc-assistant': [
    deteriorating({
      version: 'a',
      practical: 'ward-observations',
      name: 'Joan Ellery',
      bed: '4A-5',
      obs: { resp: 24, spo2: 92, temp: 38.4, sys: 98, dia: 60, pulse: 118, alert: true },
    }),
    deteriorating({
      version: 'b',
      practical: 'ward-specimens',
      name: 'Harold Benn',
      bed: '4A-3',
      obs: { resp: 26, spo2: 91, temp: 39.3, sys: 96, dia: 58, pulse: 124, alert: false },
    }),
  ],
  'ready-hc-senior': [
    chartAudit({
      version: 'a',
      practical: 'ward-medicines',
      doses: [
        ['Mon 08:00', 'Given', ''],
        ['Mon 18:00', 'Given', ''],
        ['Tue 08:00', '', ''],
        ['Tue 18:00', 'Not given', 'Nil by mouth for a scan'],
        ['Wed 08:00', 'Given', ''],
        ['Wed 18:00', '', ''],
        ['Thu 08:00', 'Given', ''],
      ],
    }),
    chartAudit({
      version: 'b',
      practical: 'ward-beds',
      doses: [
        ['Mon 08:00', '', ''],
        ['Mon 18:00', 'Given', ''],
        ['Tue 08:00', 'Given', ''],
        ['Tue 18:00', '', ''],
        ['Wed 08:00', 'Not given', 'Refused: felt sick'],
        ['Wed 18:00', '', ''],
        ['Thu 08:00', 'Given', ''],
      ],
    }),
  ],
}
