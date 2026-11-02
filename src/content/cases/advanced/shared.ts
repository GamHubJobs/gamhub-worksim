/**
 * Advanced customer cases, one per career, from the third career level. Each
 * mixes investigation, a calculation, a judgement under pressure and a written
 * reply, with more competing considerations than the earlier cases.
 */

export const replies = (sender: string, done: string) => ({
  excellent: `Hi {name},

${done}

${sender}`,
  good: `Hi {name},

Thank you. That mostly resolves it; one or two points still need tidying up.

${sender}`,
  pass: `Hi {name},

Thanks. I am not sure this is fully resolved yet; could you take another look?

${sender}`,
  fail: `Hi {name},

I am afraid this does not solve our problem. I will raise it with your manager.

${sender}`,
})

export const OUTCOMES = {
  pass: {
    trust: { manager: 3 },
    reputation: 3,
    indicators: { satisfaction: 2, risk: -2 },
  },
  fail: { reputation: -1, indicators: { risk: 2 } },
  lapse: { reputation: -2, indicators: { satisfaction: -3, risk: 2 } },
}
