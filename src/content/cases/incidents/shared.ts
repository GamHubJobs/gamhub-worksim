/**
 * Complex workplace incidents: situations that need investigation and
 * judgement, not just a right answer. Every option is judged with its
 * reasoning (integrity, security, honesty with clients, owning mistakes,
 * fairness to colleagues), and the player does the corrective work.
 */

export const replies = (sender: string, done: string) => ({
  excellent: `Hi {name},

${done}

${sender}`,
  good: `Hi {name},

Thanks: handled well, with a couple of things to tidy up.

${sender}`,
  pass: `Hi {name},

Thanks. Some of this needs another look.

${sender}`,
  fail: `Hi {name},

I’m worried about how this was handled. Let’s talk today.

${sender}`,
})
