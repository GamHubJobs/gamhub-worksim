/**
 * Engineering: the design review for the Mill Lane footbridge in the project
 * room. A request to lower the handrail below the standard, the contractor
 * building from an old drawing revision, a query on the deck, the cost and
 * time of a change, an ecology constraint, and the minutes. Simplified,
 * fictional project for learning; not real design guidance.
 */
import { HI_VIS, SMART, SUIT } from './looks'
import type { Scenario } from './types'

const TABLE = { x: -10.25, z: 0.1 }

export const DESIGN_REVIEW: Scenario = {
  id: 'eng-design-meeting',
  careerId: 'engineering-services',
  title: 'Design review: Mill Lane footbridge',
  summary:
    'Review the footbridge design with the client and the contractor: standards, drawing revisions, a change and its cost.',
  workplace: 'workshop',
  room: 'The project room',
  minLevel: 1,
  player: { at: { x: -9.1, z: 1.5 }, faces: TABLE },
  camera: { from: [-7.3, 3.4, -1.6], looks: [-10.6, 0.8, 0.5] },
  cast: [
    {
      id: 'helena',
      name: 'Helena Okoye',
      role: 'Engineering Manager (chairing)',
      look: SUIT(5, 'bun', 0, '#334155', { tie: undefined }),
      at: { x: -11.35, z: 0.6 },
      faces: TABLE,
      personId: 'manager',
    },
    {
      id: 'laura',
      name: 'Laura Bennett',
      role: 'Client project manager',
      look: SUIT(2, 'bob', 4, '#475569', { tie: undefined }),
      at: { x: -10.3, z: -1.25 },
      faces: TABLE,
    },
    {
      id: 'craig',
      name: 'Craig Mullen',
      role: 'Contractor’s site manager',
      look: HI_VIS(1, 'short', 1),
      at: { x: -11.0, z: 1.55 },
      faces: TABLE,
    },
    {
      id: 'dmitri',
      name: 'Dmitri Volkov',
      role: 'Senior engineer',
      look: SMART(0, 'side', 1, '#334155', { glasses: true }),
      at: { x: -11.35, z: -0.6 },
      faces: TABLE,
      personId: 'senior',
    },
  ],
  exhibits: [
    {
      id: 'register',
      title: 'Drawing register',
      text: 'MLF-GA-001 General arrangement: rev C (12 May, current). Rev B superseded 12 May: deck level changed by 150 mm.',
    },
    {
      id: 'standard',
      title: 'Design basis: parapets',
      text: 'Footbridge parapet height: 1.15 m minimum above the deck (the project’s design standard).',
    },
    {
      id: 'change',
      title: 'Change request CR-04',
      text: 'Client asks for a wider deck (2.5 m to 3.0 m). Estimate: +£38,000, +3 weeks; new steel order needed.',
    },
  ],
  beats: [
    {
      id: 'open',
      kind: 'say',
      who: 'helena',
      gesture: 'talk',
      text: 'Thanks for coming. Design review for the Mill Lane footbridge. {name}, you’ve done the parapet and deck checks: start us off.',
    },
    {
      id: 'parapet',
      kind: 'say',
      who: 'laura',
      gesture: 'talk',
      text: 'Our architect wants the handrail at one metre, for the view. Can we do that?',
    },
    {
      id: 'standard',
      kind: 'choose',
      prompt: 'The design standard requires at least 1.15 m.',
      points: 20,
      options: [
        {
          id: 'explain',
          label:
            'Explain that 1.15 m is the minimum for safety and we can’t go below it, but offer a design that keeps the view: a glass or slim infill panel at full height.',
          score: 1,
          reply: [
            {
              who: 'laura',
              text: 'Glass would work. Can you price it?',
              gesture: 'talk',
            },
            { who: 'helena', text: 'Safe, and solving her problem. Good.' },
          ],
          lesson:
            'Hold the safety standard, and solve the client’s real goal another way.',
        },
        {
          id: 'agree',
          label: 'Agree: it’s their bridge.',
          score: 0,
          reply: [
            {
              who: 'dmitri',
              text: 'We can’t sign off a parapet below the standard. People could fall.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { senior: -2 }, reputation: -1 },
          lesson:
            'Engineers are responsible for safety even when the client wants otherwise.',
        },
      ],
    },
    {
      id: 'show-standard',
      kind: 'exhibit',
      who: 'laura',
      prompt: 'Laura asks where the 1.15 m comes from.',
      points: 5,
      items: ['register', 'standard', 'change'],
      correct: 'standard',
      right: [
        {
          who: 'laura',
          text: 'Understood. It’s in the design basis we agreed.',
          gesture: 'talk',
        },
      ],
      wrong: [{ who: 'laura', text: 'That doesn’t say anything about handrails.' }],
      lesson:
        'Point to the agreed design basis: it is the shared rulebook for the project.',
    },
    {
      id: 'revision',
      kind: 'say',
      who: 'craig',
      gesture: 'talk',
      text: 'We started setting out the abutments last week from drawing GA-001, revision B.',
    },
    {
      id: 'rev',
      kind: 'choose',
      prompt: 'Revision C replaced revision B on 12 May, with the deck 150 mm different.',
      points: 20,
      options: [
        {
          id: 'stop',
          label:
            'Ask Craig to pause the setting out, issue revision C to site today, withdraw revision B, and check what has been built against rev C.',
          score: 1,
          reply: [
            {
              who: 'craig',
              text: 'Nobody sent us rev C. Fair enough, we’ll pause and check.',
              gesture: 'talk',
            },
            {
              who: 'helena',
              text: 'And let’s find out why it wasn’t issued. Good catch.',
            },
          ],
          lesson:
            'Work must be built from the current revision: stop, issue, withdraw the old one, check.',
        },
        {
          id: 'carry-on',
          label: 'It’s only 150 mm: carry on and fix it later.',
          score: 0,
          reply: [
            {
              who: 'dmitri',
              text: '150 mm in the abutments means the deck won’t fit. Stop now.',
              gesture: 'talk',
            },
          ],
          lesson: 'Small differences in foundations become expensive problems later.',
        },
      ],
    },
    {
      id: 'show-register',
      kind: 'exhibit',
      who: 'craig',
      prompt: 'Craig asks which revision is current. Show him.',
      points: 5,
      items: ['register', 'standard', 'change'],
      correct: 'register',
      right: [{ who: 'craig', text: 'Rev C, 12 May. Got it.', gesture: 'talk' }],
      wrong: [{ who: 'craig', text: 'That doesn’t tell me the revision.' }],
      lesson: 'The drawing register is the record of which revision is current.',
    },
    {
      id: 'wider',
      kind: 'say',
      who: 'laura',
      gesture: 'talk',
      text: 'One more thing: the council now wants the deck half a metre wider. That’s fine, isn’t it?',
    },
    {
      id: 'change',
      kind: 'choose',
      prompt: 'A wider deck means new steel: about £38,000 and three weeks.',
      points: 15,
      options: [
        {
          id: 'formal',
          label:
            'Treat it as a formal change: CR-04 with the cost (+£38,000) and time (+3 weeks), for the client to approve in writing before any work changes.',
          score: 1,
          reply: [
            {
              who: 'laura',
              text: 'Send me CR-04 and I’ll get approval this week.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Changes are agreed formally, with their cost and time, before work changes.',
        },
        {
          id: 'just-do',
          label: 'Say yes and absorb it.',
          score: 0,
          reply: [
            {
              who: 'helena',
              text: 'We can’t absorb £38,000 and three weeks. It needs a change request.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { manager: -2 } },
          lesson: 'Unrecorded changes erode budgets and cause disputes later.',
        },
      ],
    },
    {
      id: 'bats',
      kind: 'choose',
      who: 'dmitri',
      prompt:
        'Dmitri: “The ecologist found bats roosting under the old bridge. Clearing starts next month.”',
      points: 10,
      options: [
        {
          id: 'plan',
          label:
            'Get the ecologist’s advice on timing and any licence before clearing, and add it to the programme and risk register.',
          score: 1,
          reply: [
            {
              who: 'dmitri',
              text: 'Right. Bats are protected; we plan around them.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Environmental constraints are planned in early, with specialist advice.',
        },
        {
          id: 'ignore',
          label: 'Clear it anyway: we can’t lose more time.',
          score: 0,
          reply: [
            {
              who: 'helena',
              text: 'Disturbing protected species is a criminal offence. No.',
            },
          ],
          lesson: 'Ignoring environmental law risks prosecution and stops the job.',
        },
      ],
    },
    {
      id: 'minutes',
      kind: 'speak',
      who: 'helena',
      prompt: 'Summarise the actions for the minutes in your own words: who does what.',
      points: 25,
      minWords: 35,
      mentions: [
        ['1.15', 'parapet', 'glass', 'handrail'],
        ['rev C', 'revision', 'GA-001'],
        ['CR-04', 'change request', '38,000'],
        ['ecolog', 'bat'],
      ],
      model:
        'Actions: Northbank to price a full-height glass parapet at 1.15 m. Northbank to issue GA-001 rev C to site today and withdraw rev B; Craig to pause setting out and check against rev C. Northbank to send CR-04 (+£38,000, +3 weeks) for Laura’s written approval. Dmitri to get the ecologist’s advice on the bat roost before clearing.',
      good: [
        {
          who: 'helena',
          text: 'Clear actions with owners. Send the minutes today.',
          gesture: 'talk',
        },
      ],
      weak: [
        {
          who: 'helena',
          text: 'Every action needs an owner: parapet, revision, change, ecology.',
        },
      ],
      lesson: 'Good minutes record each action and its owner.',
    },
    { id: 'end', kind: 'end' },
  ],
  outcomes: {
    excellent: {
      verdict:
        'Design review closed: safe parapet, the right drawings on site, the change agreed properly',
      feedback:
        'You held the standard, caught the revision problem and handled the change by the book.',
      effects: { trust: { manager: 3, senior: 2 }, reputation: 3 },
    },
    good: {
      verdict: 'Design review closed',
      feedback: 'Good review. A couple of points needed tightening.',
      effects: { trust: { manager: 2 }, reputation: 1 },
    },
    pass: {
      verdict: 'Design review closed, with actions for us',
      feedback:
        'We got through it, but some calls needed correcting. Let’s go over change control.',
      effects: { trust: { manager: 1 } },
    },
    poor: {
      verdict: 'Review reconvened by the engineering manager',
      feedback: 'Some decisions would have been unsafe or costly. Let’s review together.',
      effects: { trust: { manager: -2 }, reputation: -1, wellbeing: { stress: 5 } },
    },
  },
  xp: 100,
  skills: { 'design-judgement': 25, 'quality-control': 20, 'technical-writing': 15 },
}
