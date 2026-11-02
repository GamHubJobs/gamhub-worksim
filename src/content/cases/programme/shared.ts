/**
 * The Manchester office programme: every career delivers its own workstream
 * in two stages (its contribution, then the programme review), using what
 * the other departments hand over. Simulated colleagues deliver the other
 * workstreams. Each career's two stages form a project in the portfolio.
 */
import { PROGRAMME } from '../../programme'

export const brief = {
  id: 'programme',
  title: 'Programme brief: the Manchester office',
  text: PROGRAMME.facts.join('\n\n'),
}

export const replies = (sender: string, done: string) => ({
  excellent: `Hi {name},

${done}

${sender}`,
  good: `Hi {name},

Thanks: a solid contribution to the programme.

${sender}`,
  pass: `Hi {name},

Thanks. A few things need another look before the programme board.

${sender}`,
  fail: `Hi {name},

This isn’t ready for the programme board yet.

${sender}`,
})

export const stage = (careerId: string, n: 1 | 2) => ({
  projectId: `expansion-${careerId}`,
  kind: 'programme' as const,
  minLevel: 3,
  ...(n === 1 ? {} : {}),
})

// ---------------------------------------------------------------------------
// Finance & Admin: the programme budget
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Accounting: accounting set-up
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// IT Help Desk: technology and equipment
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Digital Marketing: the launch campaign
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Data Analysis: business case and measures
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Software Development: system changes
// ---------------------------------------------------------------------------
