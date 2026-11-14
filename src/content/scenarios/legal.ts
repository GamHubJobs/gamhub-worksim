/**
 * Law: a full hearing in the firm's moot courtroom, laid out and run as the
 * (fictional) Westmark County Court, with the training team playing the
 * court. The player represents the claimant from first words to judgment:
 * examines their own witness, objects when the other side oversteps,
 * cross-examines the defendant's witness, presents the evidence, answers the
 * judge candidly, opposes an adjournment and closes in their own words.
 * Fictional parties, court and law; no legal advice.
 */
import { look, ROBE, SMART, SUIT } from './looks'
import type { Scenario } from './types'

const BENCH = { x: 11, z: 4.6 }
const COUNSEL = { x: 8, z: 4.6 }
const BOX = { x: 10.25, z: 7.95 }

export const HEARING: Scenario = {
  id: 'law-hearing',
  careerId: 'legal',
  title: 'Hearing: Brightwater v Millstone',
  summary:
    'Represent the claimant at a full hearing: witnesses, evidence, objections and your closing submission, before the judge.',
  workplace: 'courtroom',
  room: 'The moot courtroom, sitting as the Westmark County Court',
  minLevel: 1,
  player: { at: { x: 7.45, z: 3.0 }, faces: BENCH },
  camera: { from: [4.3, 3.5, 2.0], looks: [10.4, 1.1, 5.6] },
  cast: [
    {
      id: 'judge',
      name: 'District Judge Okonkwo',
      role: 'The judge (played by Neil Ferrante)',
      look: ROBE(5, 'crop', 0, { glasses: true }),
      at: { x: 11.55, z: 4.6 },
      faces: COUNSEL,
      seated: true,
      raised: 0.45,
    },
    {
      id: 'clerk',
      name: 'Ruth Adeyemi',
      role: 'Court clerk',
      look: look(3, 'bun', 1, 'cardigan', '#475569', '#1f2937', { under: '#e2e8f0' }),
      at: { x: 10.2, z: 3.3 },
      faces: COUNSEL,
      seated: true,
    },
    {
      id: 'hale',
      name: 'Marcus Hale',
      role: 'Counsel for the defendant',
      look: SUIT(1, 'side', 3, '#1f2937', { tie: '#1e3a8a' }),
      at: { x: 7.45, z: 6.2 },
      faces: BENCH,
    },
    {
      id: 'dana',
      name: 'Dana Ilić',
      role: 'Witness: Quality Manager, Brightwater Bakery',
      look: SMART(2, 'ponytail', 4, '#0f766e'),
      at: { x: 6.15, z: 1.4 },
      faces: { x: 9, z: 1.4 },
      seated: true,
      moves: [
        { from: 'call-dana', at: BOX, faces: COUNSEL },
        {
          from: 'call-reeve',
          at: { x: 6.15, z: 1.4 },
          faces: { x: 9, z: 1.4 },
          seated: true,
        },
      ],
    },
    {
      id: 'reeve',
      name: 'Martin Reeve',
      role: 'Witness: Warehouse Manager, Millstone Mills',
      look: SMART(0, 'short', 2, '#64748b', { beard: true }),
      at: { x: 6.15, z: 7.0 },
      faces: { x: 9, z: 7 },
      seated: true,
      moves: [{ from: 'call-reeve', at: BOX, faces: COUNSEL }],
    },
    {
      id: 'security',
      name: 'Sam Okafor',
      role: 'Court security officer',
      look: look(6, 'bald', 0, 'polo', '#1e3a8a', '#111827', { sleeves: 'short' }),
      at: { x: 5.7, z: 4.6 },
      faces: { x: 9, z: 4.6 },
    },
    {
      id: 'public1',
      name: 'Member of the public',
      role: 'Watching from the public seats',
      look: SMART(4, 'curly', 0, '#a16207'),
      at: { x: 6.15, z: 2.3 },
      faces: { x: 9, z: 2.3 },
      seated: true,
    },
    {
      id: 'public2',
      name: 'Law student',
      role: 'Watching from the public seats',
      look: SMART(1, 'bob', 3, '#7c3aed'),
      at: { x: 6.15, z: 7.8 },
      faces: { x: 9, z: 7.8 },
      seated: true,
    },
  ],
  exhibits: [
    {
      id: 'delivery',
      title: 'C1: Delivery note, 3 March',
      text: '40 sacks of strong white flour, sealed, received in good order (outer condition). Signed: D. Ilić.',
    },
    {
      id: 'lab',
      title: 'C2: Laboratory report, 12 March',
      text: 'Samples from the centre of 6 sacks: mould throughout the core. Outer layers and packaging clean. Mould of this kind is not visible until a sack is opened.',
    },
    {
      id: 'log',
      title: 'D4: Millstone storage log, February',
      text: 'Warehouse B humidity: week of 24 February 82% (dehumidifier fault reported). Batch MM-2231 filled and sealed 26 February.',
    },
    {
      id: 'invoice',
      title: 'D1: Millstone invoice',
      text: '40 × strong white flour, £460 per sack: £18,400. Payment terms 30 days.',
    },
  ],
  beats: [
    {
      id: 'rise',
      kind: 'say',
      who: 'clerk',
      gesture: 'talk',
      text: 'All rise. The County Court at Westmark is now in session, District Judge Okonkwo presiding.',
    },
    {
      id: 'open',
      kind: 'say',
      who: 'judge',
      gesture: 'talk',
      text: 'Please be seated. Brightwater Bakery Limited against Millstone Mills Limited: a claim for £18,400 for flour said to be mouldy. Who appears?',
    },
    {
      id: 'appear',
      kind: 'choose',
      who: 'judge',
      prompt: 'Introduce yourself to the court.',
      points: 5,
      options: [
        {
          id: 'proper',
          label:
            '“May it please the court: {name}, for the claimant, Brightwater. My friend Mr Hale appears for the defendant.”',
          score: 1,
          reply: [
            { who: 'judge', text: 'Thank you. Mr Hale, good morning.', gesture: 'talk' },
          ],
          lesson:
            'Address the bench properly and introduce both sides: the court notes who appears for whom.',
        },
        {
          id: 'casual',
          label: '“Hi, I’m {name}, I’m with Brightwater.”',
          score: 0.3,
          reply: [
            {
              who: 'judge',
              text: 'In this court we introduce ourselves and our opponent, counsel. But go on.',
            },
          ],
          lesson:
            'Courts have conventions for a reason: they show respect and keep the record clear.',
        },
      ],
    },
    {
      id: 'defence',
      kind: 'say',
      who: 'hale',
      gesture: 'present',
      text: 'Judge, the defence is simple. The claimant never inspected the sacks on delivery. Quill v Asterton is clear: a buyer who does not inspect cannot complain.',
    },
    {
      id: 'opening',
      kind: 'choose',
      who: 'judge',
      prompt:
        'The judge turns to you: “Your opening, counsel. What is your case in a sentence?”',
      points: 15,
      options: [
        {
          id: 'hidden',
          label:
            'The mould was inside sealed sacks and could not be seen on delivery, so the flour was not of satisfactory quality under section 14 of the Westmark Sale of Goods Act.',
          score: 1,
          reply: [
            {
              who: 'judge',
              text: 'A hidden defect point. Clear. Go on.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Lead with the legal test and the fact that meets it: the judge then knows what to listen for.',
        },
        {
          id: 'blame',
          label:
            'Millstone is a careless supplier and should pay for the damage it caused.',
          score: 0.3,
          reply: [
            {
              who: 'judge',
              text: 'That is a conclusion, not a case. What is the legal basis?',
            },
          ],
          lesson:
            'Rhetoric is not an argument: say which rule applies and why the facts meet it.',
        },
        {
          id: 'concede',
          label:
            'Concede the sacks should have been checked, and ask for half the claim.',
          score: 0,
          reply: [
            {
              who: 'hale',
              text: 'I am grateful to my friend for that concession, Judge.',
              gesture: 'present',
            },
            { who: 'judge', text: 'Noted. That is a significant concession, counsel.' },
          ],
          lesson:
            'Never concede your client’s case without instructions, least of all in your opening.',
        },
      ],
    },
    {
      id: 'call-dana',
      kind: 'say',
      who: 'judge',
      gesture: 'talk',
      text: 'Call your witness. Ms Ilić, please take the stand.',
    },
    {
      id: 'sworn',
      kind: 'say',
      who: 'dana',
      gesture: 'talk',
      text: 'I promise to tell the truth, the whole truth and nothing but the truth.',
    },
    {
      id: 'chief',
      kind: 'choose',
      prompt: 'Examination in chief: ask your witness about the delivery.',
      points: 10,
      options: [
        {
          id: 'open-q',
          label: '“Ms Ilić, what did you see when the sacks were delivered?”',
          score: 1,
          reply: [
            {
              who: 'dana',
              text: 'Sealed sacks, dry and clean on the outside. Nothing looked wrong. We check sealed flour by sample when a sack is opened, as the contract says.',
              gesture: 'talk',
            },
          ],
          lesson:
            'With your own witness, ask open questions: the evidence is worth more in their words.',
        },
        {
          id: 'leading',
          label: '“You saw nothing at all wrong with the sacks, did you?”',
          score: 0.2,
          reply: [
            {
              who: 'hale',
              text: 'Objection, Judge: my friend is leading the witness.',
              gesture: 'present',
            },
            { who: 'judge', text: 'Sustained. Rephrase the question, counsel.' },
            { who: 'dana', text: 'The sacks were sealed and looked clean.' },
          ],
          lesson:
            'Leading questions (which suggest the answer) are not allowed when examining your own witness.',
        },
      ],
    },
    {
      id: 'show-mould',
      kind: 'exhibit',
      who: 'judge',
      prompt: 'Show the court where and when the mould was found.',
      points: 10,
      items: ['delivery', 'lab', 'invoice'],
      correct: 'lab',
      right: [
        {
          who: 'judge',
          text: 'Exhibit C2, the laboratory report: mould throughout the core, the outside clean, not visible until opened. Noted.',
          gesture: 'talk',
        },
      ],
      wrong: [
        { who: 'judge', text: 'That does not show me where the mould was, counsel.' },
      ],
      lesson:
        'Prove each fact with the document that proves it: here, the laboratory report.',
    },
    {
      id: 'hale-cross',
      kind: 'say',
      who: 'hale',
      gesture: 'present',
      text: 'Ms Ilić, you did not open a single sack on delivery, did you? And you would agree your company was simply careless?',
    },
    {
      id: 'object',
      kind: 'choose',
      prompt:
        'Mr Hale has asked your witness to agree her company was careless. Do you act?',
      points: 10,
      options: [
        {
          id: 'object-opinion',
          label:
            '“Objection, Judge: whether anyone was careless is the very issue the court must decide. It is not for the witness.”',
          score: 1,
          reply: [
            { who: 'judge', text: 'Sustained. Move on, Mr Hale.', gesture: 'talk' },
            { who: 'hale', text: 'I will move on, Judge.' },
          ],
          lesson:
            'Object when a witness is asked to decide the issue for the court; protect your witness.',
        },
        {
          id: 'silent',
          label: 'Say nothing and let her answer.',
          score: 0.3,
          reply: [
            { who: 'dana', text: 'I… I suppose we could have opened one. I don’t know.' },
          ],
          lesson: 'Staying silent lets an unfair question damage your witness.',
        },
        {
          id: 'object-unfair',
          label: '“Objection, that’s unfair!”',
          score: 0.4,
          reply: [
            {
              who: 'judge',
              text: 'On what basis, counsel? Without a ground, I will allow it.',
            },
            { who: 'dana', text: 'We followed the contract.' },
          ],
          lesson:
            'An objection needs a ground: leading, opinion on the issue, hearsay, relevance.',
        },
      ],
    },
    {
      id: 'call-reeve',
      kind: 'say',
      who: 'hale',
      gesture: 'present',
      text: 'I call Mr Martin Reeve, Millstone’s warehouse manager.',
    },
    {
      id: 'reeve-chief',
      kind: 'say',
      who: 'reeve',
      gesture: 'talk',
      text: 'The flour was stored properly at Millstone. If there was mould, it happened at Brightwater.',
    },
    {
      id: 'cross',
      kind: 'choose',
      prompt: 'Cross-examine Mr Reeve.',
      points: 15,
      options: [
        {
          id: 'humidity',
          label:
            '“Mr Reeve, your own storage log shows Warehouse B at 82% humidity in the week this batch was filled, doesn’t it?”',
          score: 1,
          reply: [
            {
              who: 'reeve',
              text: '…Yes. The dehumidifier was broken that week.',
              gesture: 'talk',
            },
            { who: 'narrator', text: 'Mr Hale looks down at his notes.' },
          ],
          lesson:
            'In cross-examination, short leading questions on a fact the witness cannot deny are the strongest.',
          goto: 'put-log',
        },
        {
          id: 'speech',
          label: '“Why should the court believe a word you say?”',
          score: 0.1,
          reply: [
            {
              who: 'judge',
              text: 'That is a speech, not a question. Ask a question, counsel.',
            },
          ],
          lesson: 'Arguing with a witness wins nothing: ask questions they must answer.',
          goto: 'put-log',
        },
        {
          id: 'every-sack',
          label: '“Did you personally check every sack?”',
          score: 0.5,
          reply: [{ who: 'reeve', text: 'No. Nobody checks every sack.' }],
          lesson: 'A fair question, but it does not show where the mould came from.',
          goto: 'put-log',
        },
      ],
    },
    {
      id: 'put-log',
      kind: 'exhibit',
      who: 'judge',
      prompt: 'Put the document to the witness.',
      points: 10,
      items: ['log', 'delivery', 'invoice', 'lab'],
      correct: 'log',
      right: [
        {
          who: 'reeve',
          text: 'That’s our log. Warehouse B, 82 per cent.',
          gesture: 'talk',
        },
        { who: 'judge', text: 'Exhibit D4. I have it.' },
      ],
      wrong: [
        { who: 'judge', text: 'Which document shows the storage conditions, counsel?' },
      ],
      lesson: 'Put the witness’s own document to them: it is hard to argue with.',
    },
    {
      id: 'quill',
      kind: 'say',
      who: 'hale',
      gesture: 'present',
      text: 'Judge, whatever the warehouse, the claimant cannot escape Quill v Asterton.',
    },
    {
      id: 'candour',
      kind: 'choose',
      who: 'judge',
      prompt: '“Counsel, is there any authority against you that I should know about?”',
      points: 15,
      options: [
        {
          id: 'candid',
          label:
            'Tell the judge about Quill, and explain that Harlow v Penmore overruled it for defects that could not be seen on delivery.',
          score: 1,
          reply: [
            {
              who: 'judge',
              text: 'Thank you for your candour. Harlow overruled Quill for hidden defects. That assists you.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Advocates must not mislead the court and must mention authorities against them.',
        },
        {
          id: 'hide',
          label: 'Say you are not aware of any authority against you.',
          score: 0,
          reply: [
            {
              who: 'hale',
              text: 'Judge, my friend must know of Quill: it is in the bundle.',
              gesture: 'present',
            },
            {
              who: 'judge',
              text: 'Counsel, you have a duty not to mislead this court. I will remember that.',
            },
          ],
          effects: { reputation: -2 },
          lesson: 'Misleading the court is serious professional misconduct.',
        },
        {
          id: 'later',
          label: 'Ask for time to check.',
          score: 0.5,
          reply: [
            {
              who: 'judge',
              text: 'You prepared this case, counsel. You should know. Very well.',
            },
          ],
          lesson: 'Honest, but preparation means knowing the authorities against you.',
        },
      ],
    },
    {
      id: 'adjourn',
      kind: 'choose',
      who: 'judge',
      prompt:
        'Mr Hale applies to adjourn so the defendant can call an expert on mould. The judge asks for your position.',
      points: 10,
      options: [
        {
          id: 'oppose',
          label:
            'Oppose: expert evidence was due 28 days ago under the court’s directions, the laboratory report is unchallenged, and a delay adds cost.',
          score: 1,
          reply: [
            {
              who: 'judge',
              text: 'I agree. The directions were clear and the report has not been challenged. Application refused.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Procedural decisions turn on the court’s directions, fairness and cost: argue them.',
        },
        {
          id: 'agree',
          label: 'Agree, to be fair to the other side.',
          score: 0.3,
          reply: [
            {
              who: 'judge',
              text: 'Very well, though your client will not thank you for the delay.',
            },
          ],
          lesson: 'Being courteous is not the same as giving up your client’s advantage.',
        },
        {
          id: 'costs',
          label: 'Do not oppose, but ask that the defendant pay the costs of the delay.',
          score: 0.6,
          reply: [
            {
              who: 'judge',
              text: 'I will not adjourn: the directions were clear. But your costs point was a fair one.',
            },
          ],
          lesson:
            'Costs protect your client if a delay is allowed, but here the directions decide it.',
        },
      ],
    },
    {
      id: 'closing',
      kind: 'speak',
      who: 'judge',
      prompt:
        'Your closing submission, in your own words: the test, the facts that meet it, and the authority.',
      points: 20,
      minWords: 40,
      mentions: [
        ['hidden', 'not visible', 'could not be seen', 'inside'],
        ['satisfactory quality', 'section 14', 's.14', 's 14'],
        ['Harlow'],
        ['humid', 'storage log', '82'],
      ],
      model:
        'Judge, the flour was not of satisfactory quality under section 14. The mould was inside sealed sacks and could not be seen on delivery, as the laboratory report shows. Millstone’s own storage log records 82% humidity when the batch was filled. Quill does not help the defendant: Harlow overruled it for hidden defects. I ask for judgment for £18,400 and costs.',
      good: [
        {
          who: 'judge',
          text: 'Clear, and well supported by the evidence. Thank you.',
          gesture: 'talk',
        },
      ],
      weak: [
        {
          who: 'judge',
          text: 'I have your point, counsel, though it could have been better supported.',
        },
      ],
      lesson:
        'A closing ties the legal test to the evidence and deals with the other side’s best authority.',
    },
    {
      id: 'judgment',
      kind: 'say',
      who: 'judge',
      gesture: 'talk',
      text: 'I will give judgment now.',
    },
    { id: 'end', kind: 'end' },
  ],
  outcomes: {
    excellent: {
      verdict: 'Judgment for the claimant: £18,400 and costs',
      feedback:
        'The defect was hidden, the storage conditions explain it, and counsel dealt candidly with Quill. Judgment for the claimant, with costs.',
      effects: { trust: { senior: 3, manager: 2 }, reputation: 3 },
    },
    good: {
      verdict: 'Judgment for the claimant: £18,400',
      feedback:
        'The claim succeeds. Some points could have been made more firmly. Costs to be argued in writing.',
      effects: { trust: { senior: 2, manager: 1 }, reputation: 2 },
    },
    pass: {
      verdict: 'Judgment for the claimant, damages reduced to £12,000',
      feedback:
        'The claim succeeds in part. The evidence of when the mould arose was not fully put.',
      effects: { trust: { senior: 1 }, reputation: 1 },
    },
    poor: {
      verdict: 'Claim dismissed',
      feedback:
        'I am not satisfied the defect was hidden or that the defendant was responsible. The claim is dismissed.',
      effects: { trust: { senior: -2 }, reputation: -1, wellbeing: { stress: 5 } },
    },
  },
  xp: 120,
  skills: { 'legal-drafting': 20, 'professional-ethics': 25, 'legal-research': 15 },
  caseLink: {
    caseId: 'law-mock-hearing',
    answers: [
      {
        beat: 'candour',
        step: 'judge',
        options: { candid: 'candid', hide: 'hide', later: 'later' },
      },
    ],
  },
}
