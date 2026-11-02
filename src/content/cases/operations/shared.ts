/**
 * Business operations cases (one per career, from the second level): budgets,
 * purchase requests, approvals, suppliers and corrective action. Approval
 * decisions are not fixed answers: each request is judged against policy, the
 * player's approval limit and the department's remaining budget (see
 * `expectedDecision` in `game/cases.ts`).
 */

export const replies = (sender: string, done: string) => ({
  excellent: `Hi {name},

${done}

${sender}`,
  good: `Hi {name},

Thanks, that’s mostly sorted. A couple of points to tidy up; see the notes.

${sender}`,
  pass: `Hi {name},

Thanks. Some of these decisions need another look.

${sender}`,
  fail: `Hi {name},

Several of these decisions aren’t right. Let’s go through them together.

${sender}`,
})
