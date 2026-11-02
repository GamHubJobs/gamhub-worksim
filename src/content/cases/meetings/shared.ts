/**
 * Meetings: prepare a document or slides with the existing apps, join the
 * meeting when it starts (office time passes), make the decisions that come
 * up in the room, then record the actions with owners and follow up.
 */

export const replies = (sender: string, done: string) => ({
  excellent: `Hi {name},

${done}

${sender}`,
  good: `Hi {name},

Thanks, a useful meeting.

${sender}`,
  pass: `Hi {name},

Thanks. A few things from the meeting need tidying up.

${sender}`,
  fail: `Hi {name},

That meeting didn’t get us where we needed to be. Let’s talk.

${sender}`,
})

export const people = (...names: Array<[string, string]>) =>
  names.map(([id, name]) => ({ id, name }))

// ---------------------------------------------------------------------------
// Finance & Admin: the monthly team meeting
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Accounting: a client meeting about credit terms
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// IT Help Desk: the change advisory board
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Digital Marketing: a client campaign review
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Data Analysis: a project review
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Software Development: the sprint review
// ---------------------------------------------------------------------------
