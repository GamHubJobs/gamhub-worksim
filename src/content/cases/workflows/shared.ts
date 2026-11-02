/**
 * Interdepartmental workflows: information arrives from one department, the
 * player does their part, and hands it on to the next in the form that
 * department needs. If the hand-off was wrong, the next department comes back
 * later with the problem it caused (a follow-up case to put right). A correct
 * hand-off simply works.
 */

export const replies = (sender: string, done: string, wrong: string) => ({
  excellent: `Hi {name},

${done}

${sender}`,
  good: `Hi {name},

Thanks, nearly all of it was right.

${sender}`,
  pass: `Hi {name},

Thanks. ${wrong}

${sender}`,
  fail: `Hi {name},

${wrong} Can you look at it again?

${sender}`,
})

export const followUpReplies = (sender: string) => ({
  excellent: `Hi {name},

Thank you for sorting it out so quickly, and for being straight about what happened.

${sender}`,
  good: `Hi {name},

Thanks, that’s fixed.

${sender}`,
  pass: `Hi {name},

OK. Let’s make sure it doesn’t happen again.

${sender}`,
  fail: `Hi {name},

This still isn’t resolved.

${sender}`,
})

// ---------------------------------------------------------------------------
// IT Help Desk: onboarding from People & Culture
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Finance & Admin: purchase order from an approved request
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Accounting: billing schedule from a sales contract
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Digital Marketing: budget request to Finance
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Data Analysis: a dashboard specification for Operations
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Software Development: a support escalation into an engineering ticket
// ---------------------------------------------------------------------------
