/** Incidents cases: data-analytics. */
import type { CaseInput } from '../schema'
import { replies } from './shared'

const dataIntegrity: CaseInput = {
  id: 'inc-data-preferred-conclusion',
  version: 1,
  careerId: 'data-analytics',
  kind: 'incident',
  minLevel: 3,
  title: 'A director wants a chart that shows growth',
  summary:
    'The data shows sales flat; a director wants the chart changed to show growth.',
  from: { name: 'Chloe Martin', role: 'Sales Manager', organisation: 'Sales' },
  trigger: { afterAssignment: 'studio-statistics' },
  deadlineHours: 4,
  email: {
    subject: 'Tweak the chart for the board?',
    body: `Hi,

The board pack chart makes sales look flat. Could you start the axis at £180k instead of zero, and leave out March (it was a one-off)? Then it shows the growth we’ve worked so hard for. The board meets tomorrow.

Chloe`,
  },
  whyItMatters:
    'Analysts are trusted because their numbers are honest. Presenting data fairly, even under pressure from senior people, protects the company’s decisions and your own credibility, and there is almost always an honest way to show what someone is proud of.',
  objectives: [
    'Recognise misleading presentation of data',
    'Hold to integrity under pressure',
    'Offer an honest alternative',
  ],
  evidence: [
    {
      id: 'sales',
      title: 'Monthly sales',
      table: {
        head: ['Month', 'Sales'],
        rows: [
          ['January', '£190k'],
          ['February', '£193k'],
          ['March', '£181k'],
          ['April', '£192k'],
        ],
      },
    },
    {
      id: 'mix',
      title: 'Sales mix',
      text: 'New-client sales grew from £20k to £34k a month; repeat sales fell.',
    },
  ],
  steps: [
    {
      id: 'misleading',
      kind: 'review',
      title: 'What the changes would do',
      prompt: 'Which of these are true?',
      points: 30,
      findings: [
        {
          id: 'axis',
          text: 'Starting the axis at £180k would make small changes look like big growth.',
          issue: true,
          why: 'A truncated axis exaggerates differences.',
        },
        {
          id: 'march',
          text: 'Leaving out March would hide the dip and overstate the trend.',
          issue: true,
          why: 'Removing inconvenient data points is cherry-picking.',
        },
        {
          id: 'new-growth',
          text: 'There is real growth worth showing: new-client sales.',
          issue: true,
          why: 'New-client sales rose from £20k to £34k a month.',
        },
        {
          id: 'fine',
          text: 'Both changes are normal design choices.',
          issue: false,
          why: 'Together they would mislead the board about overall sales.',
        },
      ],
    },
    {
      id: 'response',
      kind: 'decide',
      title: 'Your response',
      prompt: 'What do you do?',
      points: 40,
      options: [
        {
          id: 'honest-alt',
          label:
            'Keep the honest chart, and add a second chart showing the real growth in new-client sales',
          verdict: 'best',
          why: 'The board gets the truth, and Sales gets credit for what really grew.',
          effects: { trust: { manager: 3 }, indicators: { risk: -4 } },
        },
        {
          id: 'comply',
          label: 'Make the changes: it’s her board pack',
          verdict: 'poor',
          why: 'A misleading chart in a board pack can lead to wrong decisions, and it’s your name on the analysis.',
          effects: { indicators: { risk: 8 }, reputation: -3 },
        },
        {
          id: 'refuse',
          label: 'Refuse and report her to your manager',
          verdict: 'acceptable',
          why: 'Your integrity holds, but jumping to a report before talking it through damages the relationship; offer an honest alternative first.',
          effects: { indicators: { satisfaction: -3 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Chloe Martin, Sales',
      title: 'Reply to Chloe',
      prompt:
        'Explain kindly why you can’t make those changes, and what you can do instead.',
      points: 30,
      minWords: 50,
      mentions: [['axis'], ['March'], ['new-client', 'new client'], ['board']],
      avoid: [
        {
          terms: ['dishonest', 'lying', 'cheat'],
          why: 'Assume good intent: she wants credit for real work.',
        },
      ],
      model:
        'Hi Chloe, I understand why you want the board to see the team’s progress. I can’t start the axis at £180k or leave out March, because together they would make total sales look like they grew when they were flat, and the board needs to rely on the pack. But there is real growth to show: new-client sales rose from £20k to £34k a month. I will add a chart of that next to the total, so the board sees exactly what your team achieved. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 4, indicators: { risk: -2 } },
    fail: { indicators: { risk: 3 } },
    lapse: { reputation: -2 },
  },
  replies: replies(
    'Chloe',
    'That’s a better story than the one I asked for. Thank you, the board loved the new-client chart.',
  ),
  lapseLog: 'The board pack went out without an answer to Sales’ request.',
  skills: { 'insight-communication': 30, 'data-visualisation': 25 },
  xp: 120,
}

export const INCIDENT_DATA: CaseInput[] = [dataIntegrity]
