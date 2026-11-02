/** Leadership cases: it-support. */
import type { CaseInput } from '../schema'
import { replies, FEEDBACK_AVOID } from './shared'

const itLead: CaseInput = {
  id: 'lead-it-queue',
  version: 1,
  careerId: 'it-support',
  kind: 'leadership',
  minLevel: 4,
  title: 'Run the service desk for a week',
  summary:
    'Assign the week’s work, review an analyst’s ticket replies, and handle a complaint about a colleague.',
  from: {
    name: 'Ravi Menon',
    role: 'IT Service Desk Manager',
    organisation: 'IT Support',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'outage-triage' },
  deadlineHours: 8,
  email: {
    subject: 'The desk is yours this week',
    body: `Hi {name},

I’m at the suppliers’ conference all week, so you’re leading the desk. Please assign the week’s work, review Tom’s ticket replies (a user complained), and let me know how it goes.

Ravi`,
  },
  whyItMatters:
    'Service desk leads balance the queue, the team’s skills and its wellbeing, and protect the quality of what users hear. How they handle a complaint about a colleague shapes the whole team’s trust.',
  objectives: [
    'Assign work by skill and capacity',
    'Review a team member’s replies to users',
    'Handle a complaint about a colleague fairly',
  ],
  evidence: [
    {
      id: 'reply',
      title: 'Tom’s reply on INC-4410 (the complaint)',
      text: '“It’s a known issue. Restart your laptop.” (The user had already said they restarted twice. Ticket closed.)',
    },
    {
      id: 'complaint',
      title: 'The user’s complaint',
      text: '“Rude and unhelpful. He closed my ticket without reading it.”',
    },
  ],
  steps: [
    {
      id: 'assign',
      kind: 'assign',
      title: 'Assign the week’s work',
      prompt: 'Give each piece of work to the right person.',
      points: 25,
      members: [
        {
          id: 'tom',
          name: 'Tom Hughes',
          strengths: 'Fast at hardware fixes; brief with users',
          capacity: 2,
        },
        {
          id: 'maya',
          name: 'Nadia Okoye',
          strengths: 'Patient, great with users; learning networks',
          capacity: 1,
        },
        { id: 'ben', name: 'Ben Carter', strengths: 'Network specialist', capacity: 1 },
      ],
      items: [
        {
          id: 'vip',
          label: 'Set up the directors’ new laptops in person',
          best: ['maya'],
          why: 'Face-to-face work with senior users suits Nadia’s patience.',
        },
        {
          id: 'switch',
          label: 'Replace the floor 2 switch',
          best: ['ben'],
          why: 'Network hardware needs the specialist.',
        },
        {
          id: 'hardware',
          label: 'Clear the hardware repair backlog',
          best: ['tom'],
          why: 'Tom is fastest at hardware fixes.',
        },
        {
          id: 'printers',
          label: 'Swap the toner and drums on four printers',
          best: ['tom'],
          why: 'Quick hardware jobs suit Tom.',
        },
      ],
    },
    {
      id: 'review',
      kind: 'review',
      title: 'Review Tom’s reply',
      prompt: 'Which of these are real problems with how INC-4410 was handled?',
      points: 25,
      findings: [
        {
          id: 'read',
          text: 'The reply ignored that the user had already restarted twice.',
          issue: true,
          why: 'It shows the ticket wasn’t read.',
        },
        {
          id: 'closed',
          text: 'The ticket was closed without the user confirming it was fixed.',
          issue: true,
          why: 'Tickets close when the user agrees it’s fixed.',
        },
        {
          id: 'known',
          text: 'Saying it’s a known issue was wrong in itself.',
          issue: false,
          why: 'Telling users about a known issue is helpful if you also say what happens next.',
        },
      ],
    },
    {
      id: 'complaint',
      kind: 'decide',
      title: 'The complaint about Tom',
      prompt: 'How do you handle it?',
      points: 20,
      options: [
        {
          id: 'private',
          label:
            'Reopen the ticket and help the user today, then talk to Tom privately about the reply, with the facts',
          verdict: 'best',
          why: 'The user is helped first, and Tom gets fair, private, specific feedback.',
          effects: { indicators: { satisfaction: 3 } },
        },
        {
          id: 'public',
          label: 'Share the complaint in the team chat as an example of what not to do',
          verdict: 'poor',
          why: 'Public criticism humiliates a colleague and makes the whole team defensive.',
          effects: { reputation: -2 },
        },
        {
          id: 'ignore',
          label: 'Ignore it: Tom is the fastest fixer on the team',
          verdict: 'poor',
          why: 'Speed doesn’t excuse how users are treated, and the user still isn’t helped.',
          effects: { indicators: { satisfaction: -3 } },
        },
      ],
    },
    {
      id: 'feedback',
      kind: 'reply',
      to: 'Tom Hughes',
      title: 'Feedback for Tom',
      prompt: 'Give Tom constructive, specific feedback.',
      points: 30,
      minWords: 50,
      mentions: [
        ['fast', 'quick', 'good at'],
        ['read', 'restarted'],
        ['close', 'confirm'],
      ],
      avoid: FEEDBACK_AVOID,
      model:
        'Hi Tom, thanks for clearing so much of the hardware backlog; you are the quickest fixer on the team. One thing I would like you to work on: on INC-4410 the user had already restarted twice, so the reply missed what she had told us, and the ticket was closed before she confirmed it was fixed. Please read the whole ticket first and only close it once the user agrees. Shall we look at a couple of replies together on Thursday? {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 4, indicators: { satisfaction: 2 } },
    fail: { reputation: -1 },
    lapse: { reputation: -4, indicators: { satisfaction: -3 } },
  },
  replies: replies(
    'Ravi',
    'Great week. The user complaint turned into a thank-you, and Tom has asked to do more user-facing work.',
  ),
  lapseLog: 'The desk drifted without direction while Ravi was away.',
  skills: { 'incident-management': 25, 'customer-service': 20 },
  xp: 150,
}

export const LEADERSHIP_IT: CaseInput[] = [itLead]
