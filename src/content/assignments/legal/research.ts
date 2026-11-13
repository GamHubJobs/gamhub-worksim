import type { AssignmentInput } from '../../schemas'
import { saveAuthority } from '../../../tools/legal/model'
import { CHECK_NO_CONFLICT, firm, must } from './common'

/**
 * Law (trainee): research for the Brightwater claim. Teaches searching the
 * library, reading authorities, and checking they are still good law.
 */
const start = firm()

function solution() {
  let s = must(saveAuthority(start, 'M-2041', 'sga-12'))
  s = must(saveAuthority(s, 'M-2041', 'sga-31'))
  s = must(saveAuthority(s, 'M-2041', 'harlow'))
  return s
}

export const legalResearch: AssignmentInput = {
  id: 'legal-research',
  version: 1,
  careerId: 'legal',
  levelId: 'legal-trainee',
  order: 2,
  kind: 'tool',
  title: 'The law on spoiled flour',
  summary:
    'Find the statutes and the case that support Brightwater’s claim, and only ones that are still good law.',
  estimatedMinutes: 25,
  from: 'senior',
  briefing: {
    subject: 'Research for Brightwater v Millstone',
    body: `Hi {name},

Brightwater Bakery (M-2041) bought flour from Millstone that turned out to have mould deep inside the sacks; nobody could see it on delivery. We say Millstone breached the contract.

In **Matter Desk → Research**, find and save to M-2041:
- the statute that says goods must be of **satisfactory quality**,
- the statute on the buyer’s **remedies** (rejecting the goods and damages),
- the best **case** on defective flour.

Read everything before you save it, and **check it is still good law**. Millstone’s lawyers will say Brightwater should have inspected the sacks: be careful what you rely on.

Tobias`,
  },
  whyItMatters:
    'Arguments are only as strong as their authorities. Citing a case that has been overruled embarrasses the firm in front of the court and can lose the client’s case.',
  objectives: [
    'Search a law library',
    'Choose the authorities that apply',
    'Check every authority is still good law',
  ],
  steps: [
    {
      id: 'search',
      title: 'Search the library',
      instructions:
        'In **Research**, try searches like “quality”, “damages” and “flour”.',
    },
    {
      id: 'save',
      title: 'Save what applies',
      instructions:
        'Choose M-2041, read each authority, and save the two statutes and the case that help Brightwater.',
      hint: 'Look for the red “NOT GOOD LAW” warning.',
    },
    { id: 'submit', title: 'Hand in', instructions: 'Click **Submit to {senior}**.' },
  ],
  tool: {
    id: 'legal',
    title: 'Matter Desk: research',
    start,
    solution: solution(),
    checks: [
      {
        id: 'statutes',
        type: 'authorities',
        matter: 'M-2041',
        include: ['sga-12', 'sga-31'],
        exclude: [],
        title: 'The statutes on quality and remedies',
        points: 35,
        why: 'Section 12 is the implied term Millstone breached; section 31 is what Brightwater can claim.',
        hint: 'Save the Sale of Goods Act sections 12 and 31.',
      },
      {
        id: 'case',
        type: 'authorities',
        matter: 'M-2041',
        include: ['harlow'],
        exclude: [],
        title: 'The case on defective flour',
        points: 25,
        why: 'Harlow Bakeries is almost exactly our facts, and it answers the “should have inspected” point.',
        hint: 'Search “flour”.',
      },
      {
        id: 'good-law',
        type: 'authorities',
        matter: 'M-2041',
        include: [],
        exclude: ['quill'],
        title: 'Nothing that is no longer good law',
        points: 30,
        why: 'Quill v Asterton was overruled for hidden defects. Relying on it would be wrong, and Millstone would love it.',
        hint: 'Remove anything marked NOT GOOD LAW.',
      },
      CHECK_NO_CONFLICT,
    ],
  },
  passScore: 70,
  xp: 100,
  skills: { 'legal-research': 45, accuracy: 25 },
  feedback: {
    excellent: `Hi {name},

Spot on: the right sections, Harlow, and you didn’t touch Quill. That is how research should be done.

Tobias`,
    good: `Hi {name},

Good research; one thing to fix. See the notes.

Tobias`,
    pass: `Hi {name},

Some of this wouldn’t survive the other side’s scrutiny. See the notes.

Tobias`,
    fail: `Hi {name},

Not yet. Search “quality” and read what comes up.

Tobias`,
  },
}
