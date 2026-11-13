import type { AssignmentInput } from '../../schemas'
import { reviewClause } from '../../../tools/legal/model'
import { CHECK_NO_CONFLICT, firm, must } from './common'

/**
 * Law (paralegal): reviewing a supply agreement against the playbook.
 * Teaches reading each clause, applying the playbook, and writing comments
 * the other side can act on.
 */
const start = firm()

function solution() {
  let s = must(reviewClause(start, 'K-1', 'k1-price', 'accept', ''))
  s = must(
    reviewClause(
      s,
      'K-1',
      'k1-liability',
      'amend',
      'We cannot accept a complete exclusion of liability for quality. The Supplier must be liable for defective goods up to at least the contract value.',
    ),
  )
  s = must(reviewClause(s, 'K-1', 'k1-termination', 'accept', ''))
  s = must(
    reviewClause(
      s,
      'K-1',
      'k1-law',
      'amend',
      'The agreement must be governed by Westmark law, with the Westmark courts.',
    ),
  )
  return s
}

export const legalContract: AssignmentInput = {
  id: 'legal-contract',
  version: 1,
  careerId: 'legal',
  levelId: 'paralegal',
  order: 4,
  kind: 'tool',
  title: 'Reviewing the Millstone renewal',
  summary: 'Review a supply agreement clause by clause against the firm’s playbook.',
  estimatedMinutes: 30,
  from: 'manager',
  briefing: {
    subject: 'Millstone’s new supply agreement',
    body: `Hi {name},

Despite the dispute, Brightwater still needs flour, and Millstone has sent a renewed supply agreement. Please review it in **Matter Desk → Contract review**, clause by clause, against our **playbook**.

Accept what the playbook allows. For anything else, **amend** it with a comment Millstone’s lawyers can act on: what must change, and why.

Eleanor`,
  },
  whyItMatters:
    'Contract review protects clients from risks they cannot see in the small print. A playbook makes it consistent; clear comments make the negotiation quick.',
  objectives: [
    'Apply a review playbook',
    'Spot unacceptable risk',
    'Write comments the other side can act on',
  ],
  steps: [
    {
      id: 'read',
      title: 'Read each clause',
      instructions: 'Compare each clause with the playbook note under it.',
    },
    {
      id: 'decide',
      title: 'Decide each clause',
      instructions: 'Accept, or amend with a clear comment.',
    },
    { id: 'submit', title: 'Hand in', instructions: 'Click **Submit to {manager}**.' },
  ],
  tool: {
    id: 'legal',
    title: 'Matter Desk: contract review',
    start,
    solution: solution(),
    checks: [
      {
        id: 'price',
        type: 'clause',
        contract: 'K-1',
        clause: 'k1-price',
        decision: 'accept',
        mentions: [],
        title: 'Price accepted',
        points: 10,
        why: 'The playbook accepts a 12-month fixed price.',
        hint: 'Check the playbook note for clause 3.',
      },
      {
        id: 'liability',
        type: 'clause',
        contract: 'K-1',
        clause: 'k1-liability',
        decision: 'amend',
        mentions: [
          ['liab'],
          ['defective', 'quality'],
          ['contract value', 'value of the contract'],
        ],
        title: 'The liability exclusion amended',
        points: 40,
        why: 'A complete exclusion of liability for quality, after a dispute about quality, would leave Brightwater with no remedy next time.',
        hint: 'Amend clause 9: liability for defective goods up to at least the contract value.',
      },
      {
        id: 'termination',
        type: 'clause',
        contract: 'K-1',
        clause: 'k1-termination',
        decision: 'accept',
        mentions: [],
        title: 'Termination accepted',
        points: 10,
        why: 'Mutual 30 days’ notice is within the playbook.',
        hint: 'Check the playbook note for clause 12.',
      },
      {
        id: 'law',
        type: 'clause',
        contract: 'K-1',
        clause: 'k1-law',
        decision: 'amend',
        mentions: [['Westmark']],
        title: 'Governing law amended',
        points: 30,
        why: 'Letting the supplier choose the law later means Brightwater cannot know its rights.',
        hint: 'Amend clause 15: Westmark law and courts.',
      },
      CHECK_NO_CONFLICT,
    ],
  },
  passScore: 70,
  xp: 110,
  skills: { 'legal-drafting': 40, accuracy: 25, 'professional-ethics': 10 },
  feedback: {
    excellent: `Hi {name},

Exactly what I would have done, and your comments are clear enough to send as they are.

Eleanor`,
    good: `Hi {name},

A good review; one clause to look at again.

Eleanor`,
    pass: `Hi {name},

Some decisions don’t follow the playbook. See the notes.

Eleanor`,
    fail: `Hi {name},

Not yet. Start with clause 9: read the playbook note carefully.

Eleanor`,
  },
}
