/**
 * Management and leadership: cases that only arrive at a career's top level.
 * The player now leads: delegating by strengths and capacity, reviewing a
 * team member's work, resolving disagreements and making fair, ethical
 * decisions, and giving constructive feedback.
 */

export const replies = (sender: string, done: string) => ({
  excellent: `Hi {name},

${done}

${sender}`,
  good: `Hi {name},

Thanks: good leadership, with a couple of things to think about.

${sender}`,
  pass: `Hi {name},

Thanks. Some of these calls need another look.

${sender}`,
  fail: `Hi {name},

I’m not comfortable with how this was handled. Let’s talk it through.

${sender}`,
})

export const FEEDBACK_AVOID = [
  {
    terms: ['careless', 'lazy', 'useless', 'disappointed in you'],
    why: 'Criticise the work, never the person.',
  },
]

// ---------------------------------------------------------------------------
// Finance & Admin (Finance Officer)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Accounting (Senior Accountant)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// IT Help Desk (Service Desk Lead)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Digital Marketing (Digital Marketing Manager)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Data Analysis (Lead Data Analyst)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Software Development (Lead Developer)
// ---------------------------------------------------------------------------
