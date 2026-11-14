/**
 * Law: a real hearing at Westmark County Court (fictional), played at the
 * courthouse itself (court/): the player goes there from the office, passes
 * security, signs in with the usher and appears in Court 2 for a tenant whose
 * deposit was withheld. Addressing the judge, the issues in a sentence, the
 * evidence that proves the flat's condition at the start, questioning the
 * other side's witness fairly, late documents, candour about the one point
 * that goes against the client, and a closing in their own words. Fictional
 * parties, court and rules; no legal advice.
 */
import { look, ROBE, SMART } from './looks'
import type { Scenario } from './types'

const BENCH = { x: 11, z: 4.6 }
const COUNSEL = { x: 8, z: 4.6 }
const BOX = { x: 10.25, z: 7.95 }

export const SMALL_CLAIM: Scenario = {
  id: 'law-small-claim',
  careerId: 'legal',
  title: 'At court: Shah v Corner Lettings',
  summary:
    'Go to Westmark County Court and represent a tenant whose £1,350 deposit was kept for “damage”: evidence, a witness, late papers and your closing.',
  workplace: 'courtroom',
  venue: 'court',
  room: 'Court 2, Westmark County Court',
  minLevel: 1,
  player: { at: { x: 7.45, z: 3.0 }, faces: BENCH },
  camera: { from: [5.7, 3.3, -0.2], looks: [10.2, 1.0, 5.2] },
  cast: [
    {
      id: 'judge',
      name: 'District Judge Hartley',
      role: 'The judge',
      look: ROBE(2, 'bob', 1, { glasses: true }),
      at: { x: 11.55, z: 4.6 },
      faces: COUNSEL,
      seated: true,
      raised: 0.45,
    },
    {
      id: 'usher',
      name: 'Grace Mensah',
      role: 'Court usher',
      look: look(5, 'bun', 0, 'blazer', '#111827', '#111827', { under: '#f8fafc' }),
      at: { x: 9.5, z: 0.0 },
      faces: COUNSEL,
      moves: [
        { from: 'judge-in', at: { x: 9.6, z: 1.3 }, faces: BENCH },
        { from: 'call-turner', at: { x: 9.4, z: 7.2 }, faces: BOX },
        { from: 'turner-sworn', at: { x: 9.6, z: 1.3 }, faces: BENCH },
      ],
    },
    {
      id: 'priya',
      name: 'Priya Shah',
      role: 'Your client: the tenant',
      look: SMART(3, 'long', 1, '#9d174d'),
      at: { x: 7.45, z: 2.2 },
      faces: BENCH,
      seated: true,
    },
    {
      id: 'marsh',
      name: 'Owen Marsh',
      role: 'For the defendant: Lettings Manager, Corner Lettings',
      look: SMART(0, 'side', 2, '#334155', { beard: true }),
      at: { x: 7.45, z: 6.2 },
      faces: BENCH,
    },
    {
      id: 'turner',
      name: 'Lee Turner',
      role: 'Witness: cleaning contractor',
      look: look(1, 'short', 3, 'polo', '#15803d', '#1f2937', { sleeves: 'short' }),
      at: { x: 7.45, z: 7.0 },
      faces: BENCH,
      seated: true,
      moves: [
        { from: 'turner-sworn', at: BOX, faces: COUNSEL },
        { from: 'late-papers', at: { x: 7.45, z: 7.0 }, faces: BENCH, seated: true },
      ],
    },
    {
      id: 'public',
      name: 'Member of the public',
      role: 'Waiting for the next case',
      look: SMART(6, 'curly', 0, '#a16207'),
      at: { x: 6.15, z: 7.8 },
      faces: { x: 9, z: 7.8 },
      seated: true,
    },
  ],
  exhibits: [
    {
      id: 'inventory',
      title: 'C1: Check-in inventory with photos, 1 September',
      text: 'Lounge and bedroom carpet: “worn in places, slight staining by the door”. 14 dated photos. Signed by Corner Lettings and Ms Shah.',
    },
    {
      id: 'tenancy',
      title: 'C2: Tenancy agreement',
      text: 'Deposit £1,350. Clause 9: the tenant returns the flat clean, allowing for fair wear and tear.',
    },
    {
      id: 'emails',
      title: 'C3: Emails about the deposit',
      text: 'Ms Shah asks for her deposit back on 3 August. Corner Lettings: “Deductions to follow.” No breakdown sent.',
    },
    {
      id: 'bank',
      title: 'C4: Ms Shah’s bank statement',
      text: 'Shows the deposit paid on 28 August, £1,350.',
    },
  ],
  beats: [
    {
      id: 'arrive',
      kind: 'say',
      who: 'narrator',
      text: 'Court 2 is small and quiet: the judge’s bench under the crest, two tables facing it, a witness box and a few public seats. Priya sits beside you, holding the bundle a little too tightly.',
    },
    {
      id: 'reassure',
      kind: 'say',
      who: 'priya',
      text: 'I’ve never been in a court before. Do I have to say anything?',
      gesture: 'talk',
    },
    {
      id: 'calm',
      kind: 'choose',
      who: 'priya',
      prompt: 'Priya is nervous. What do you tell her?',
      points: 5,
      options: [
        {
          id: 'explain',
          label:
            '“I’ll do the talking. If the judge asks you something, answer truthfully and briefly, and it’s fine to say you don’t know.”',
          score: 1,
          reply: [{ who: 'priya', text: 'Okay. Truthfully and briefly. I can do that.' }],
          lesson:
            'A client who knows what to expect gives clearer, more credible answers.',
        },
        {
          id: 'script',
          label: '“If the judge asks about the oven, just say it was clean.”',
          score: 0,
          reply: [
            {
              who: 'priya',
              text: 'But it wasn’t, really. You want me to say it was?',
            },
          ],
          effects: { trust: { senior: -2 } },
          lesson:
            'Never coach a client to say something untrue: it is serious misconduct, and it usually comes out.',
        },
        {
          id: 'nothing',
          label: '“Don’t worry about it.”',
          score: 0.3,
          reply: [{ who: 'priya', text: 'That doesn’t really help…' }],
          lesson:
            'Reassurance works best with something concrete about what will happen.',
        },
      ],
    },
    {
      id: 'judge-in',
      kind: 'say',
      who: 'usher',
      text: 'All rise. District Judge Hartley.',
      gesture: 'wave',
    },
    {
      id: 'judge-open',
      kind: 'say',
      who: 'judge',
      text: 'Please sit. This is Shah against Corner Lettings Limited, a claim for the return of a deposit of £1,350. I have read the papers. Who appears for the claimant?',
      gesture: 'talk',
    },
    {
      id: 'appear',
      kind: 'choose',
      who: 'judge',
      prompt: 'Introduce yourself to the court.',
      points: 10,
      options: [
        {
          id: 'proper',
          label:
            '“Good morning, Judge. {name}, of Kestrel & Vane, for the claimant, Ms Shah, who is beside me. Mr Marsh, the defendant’s lettings manager, appears for the defendant.”',
          score: 1,
          reply: [{ who: 'judge', text: 'Thank you. Good morning, Mr Marsh.' }],
          lesson:
            'District judges are addressed as “Judge”. Introduce yourself, your client and the other side.',
        },
        {
          id: 'honour',
          label: '“Your Honour, I represent Ms Shah.”',
          score: 0.5,
          reply: [
            {
              who: 'judge',
              text: '“Judge” will do; I am a district judge. And you are…?',
            },
          ],
          lesson:
            'Use the right form of address, and give your name: “Your Honour” is for circuit judges.',
        },
        {
          id: 'casual',
          label: '“Hi, I’m the lawyer. Shall we crack on?”',
          score: 0,
          reply: [
            {
              who: 'judge',
              text: 'We will begin with names, please. This is a court.',
            },
          ],
          lesson:
            'Courts have conventions for a reason: they show respect and keep the record clear.',
        },
      ],
    },
    {
      id: 'issues',
      kind: 'choose',
      who: 'judge',
      prompt: '“In a sentence or two: what is the dispute?”',
      points: 10,
      options: [
        {
          id: 'crisp',
          label:
            '“The defendant kept the whole deposit for carpet and cleaning. We say the carpet was already worn when Ms Shah moved in, so that is fair wear and tear, and the cleaning charge is far more than the one item left, the oven.”',
          score: 1,
          reply: [
            {
              who: 'judge',
              text: 'Clear. So the real issues are the carpet’s condition at the start, and the oven.',
            },
          ],
          lesson:
            'Narrowing the issues early helps the judge, and shows you know your case.',
        },
        {
          id: 'story',
          label:
            '“It started when Ms Shah first viewed the flat in August last year, and…”',
          score: 0.3,
          reply: [
            {
              who: 'judge',
              text: 'I have read the history. The issues, please.',
            },
          ],
          lesson: 'The judge has read the papers: give the issues, not the whole story.',
        },
        {
          id: 'attack',
          label: '“The defendant is simply trying to keep money that isn’t theirs.”',
          score: 0,
          reply: [{ who: 'marsh', text: 'That’s not fair at all, Judge.' }],
          lesson: 'Accusations are not issues. Say what is disputed and why.',
        },
      ],
    },
    {
      id: 'marsh-case',
      kind: 'say',
      who: 'marsh',
      text: 'Judge, when Ms Shah left, the carpet was ruined and the flat was dirty. We spent £900 replacing the carpet and £450 on a professional clean. That is the deposit.',
      gesture: 'talk',
    },
    {
      id: 'show-start',
      kind: 'exhibit',
      who: 'judge',
      prompt:
        '“What evidence is there of the carpet’s condition when Ms Shah moved in?” Hand up the document that answers it.',
      points: 15,
      items: ['inventory', 'tenancy', 'emails', 'bank'],
      correct: 'inventory',
      right: [
        {
          who: 'judge',
          text: '“Worn in places, slight staining by the door”, signed by both sides, with photographs. Mr Marsh, your own inventory?',
        },
        { who: 'marsh', text: 'It… is our inventory, yes.' },
      ],
      wrong: [
        {
          who: 'judge',
          text: 'That does not tell me how the carpet looked at the start. Is there an inventory?',
        },
      ],
      lesson:
        'Answer the judge’s question with the document that proves it: the signed check-in inventory and its photos.',
    },
    {
      id: 'call-turner',
      kind: 'say',
      who: 'marsh',
      text: 'I would like to call Mr Turner, who cleaned the flat afterwards.',
    },
    {
      id: 'turner-sworn',
      kind: 'say',
      who: 'turner',
      text: 'When I went in, it was filthy. Took me and a colleague most of a day. The carpet was worn right through by the door.',
      gesture: 'talk',
    },
    {
      id: 'question-turner',
      kind: 'choose',
      who: 'judge',
      prompt: '“Any questions for Mr Turner?”',
      points: 15,
      options: [
        {
          id: 'start',
          label:
            '“Mr Turner, did you ever see the flat before Ms Shah moved in, or only after she left?”',
          score: 1,
          reply: [
            { who: 'turner', text: 'Only after. I wasn’t there at the start.' },
            {
              who: 'judge',
              text: 'So you cannot say whether the carpet got worse during the tenancy.',
            },
          ],
          lesson:
            'One fair, closed question can show the limit of a witness’s evidence without attacking them.',
        },
        {
          id: 'liar',
          label: '“You’re exaggerating to help your client, aren’t you?”',
          score: 0,
          reply: [
            { who: 'turner', text: 'I’m not. I’m telling you what I saw.' },
            {
              who: 'judge',
              text: 'If you have a question, ask it. Do not make speeches at the witness.',
            },
          ],
          lesson:
            'Accusing a witness without a basis loses the judge’s confidence, and gains nothing.',
        },
        {
          id: 'career',
          label: '“How long have you worked as a cleaner?”',
          score: 0.3,
          reply: [{ who: 'turner', text: 'Twelve years.' }],
          lesson: 'A question that does not touch the issues only helps the other side.',
        },
      ],
    },
    {
      id: 'late-papers',
      kind: 'choose',
      who: 'marsh',
      prompt:
        'Mr Marsh hands up a new set of receipts and photographs. You have never seen them: the court directed both sides to send their documents 14 days ago.',
      points: 15,
      options: [
        {
          id: 'object',
          label:
            '“Judge, these were not sent to us as the directions required, and I have not seen them. I ask that they are not relied on, or that we have time to read them and take instructions.”',
          score: 1,
          reply: [
            {
              who: 'judge',
              text: 'Quite right. Mr Marsh, why were these not sent? … I will give Ms Shah’s representative ten minutes to read them, and I will bear the lateness in mind.',
            },
          ],
          lesson:
            'Object to late evidence politely and ask for a fair remedy: exclusion, or time to consider it.',
        },
        {
          id: 'silent',
          label: 'Say nothing, and let the judge read them.',
          score: 0.2,
          reply: [
            {
              who: 'judge',
              text: 'No objection? Then I will take them into account.',
            },
          ],
          lesson:
            'If you do not object to late documents, the court will usually admit them.',
        },
        {
          id: 'snatch',
          label: 'Take them from the usher and start reading aloud from them.',
          score: 0.3,
          reply: [
            {
              who: 'judge',
              text: 'Wait. Do you object to these or not? Address me, please.',
            },
          ],
          lesson: 'Deal with procedure through the judge, not by grabbing the papers.',
        },
      ],
    },
    {
      id: 'oven',
      kind: 'say',
      who: 'priya',
      text: '(whispering) The oven… I didn’t clean it. I ran out of time.',
    },
    {
      id: 'candour',
      kind: 'choose',
      who: 'judge',
      prompt: '“Is it accepted that anything was left uncleaned?”',
      points: 15,
      options: [
        {
          id: 'candid',
          label:
            '“Yes, Judge: the oven. Ms Shah accepts a reasonable charge for cleaning it. On Mr Turner’s own price list that is £60.”',
          score: 1,
          reply: [
            {
              who: 'judge',
              text: 'That is helpful and fair. The oven, £60, is not in dispute.',
            },
            { who: 'priya', text: '(quietly) Thank you.' },
          ],
          effects: { reputation: 1 },
          lesson:
            'Conceding a point you cannot win builds credibility for the points you can.',
        },
        {
          id: 'deny',
          label: '“No, Judge. The flat was left spotless.”',
          score: 0,
          reply: [
            {
              who: 'turner',
              text: 'The oven was thick with grease. I have photos of it.',
            },
            {
              who: 'judge',
              text: 'I am troubled by that answer. I will treat the rest of the claimant’s case with care.',
            },
          ],
          effects: { trust: { senior: -2 }, reputation: -2 },
          lesson:
            'You must never mislead the court. Once the judge doubts you, every point you make loses weight.',
        },
        {
          id: 'unsure',
          label: '“I don’t have instructions on that, Judge.”',
          score: 0.4,
          reply: [
            {
              who: 'judge',
              text: 'Your client is sitting beside you. Perhaps take them now.',
            },
          ],
          lesson: 'When you can get instructions in the room, get them, then answer.',
        },
      ],
    },
    {
      id: 'closing',
      kind: 'speak',
      who: 'judge',
      prompt:
        '“Anything you want to say in closing?” In your own words: the carpet, the cleaning, and what you ask the court to order.',
      points: 15,
      minWords: 25,
      mentions: [
        ['inventory', 'check-in', 'check in', 'photos', 'photographs'],
        ['wear', 'worn', 'tear'],
        ['oven', '£60', '60'],
        ['1,290', '1290', 'balance', 'rest of the deposit', 'remainder'],
      ],
      model:
        'Judge, the signed check-in inventory and its photos show the carpet was already worn, so its condition at the end is fair wear and tear, not damage. Mr Turner never saw the flat at the start, so he cannot say it got worse. We accept £60 for the oven. We ask the court to order the balance of the deposit, £1,290, to be returned, with the court fee.',
      good: [
        {
          who: 'judge',
          text: 'Thank you. That was clear and properly focused.',
        },
      ],
      weak: [
        {
          who: 'judge',
          text: 'I am not sure what you say about the carpet, or what figure you ask for. I will do my best with the papers.',
        },
      ],
      lesson:
        'A closing ties the key evidence to the issue and ends with exactly what you ask the court to order.',
    },
    {
      id: 'judgment',
      kind: 'say',
      who: 'judge',
      text: 'I will give my decision now.',
    },
    { id: 'end', kind: 'end' },
  ],
  outcomes: {
    excellent: {
      verdict: 'Judgment for Ms Shah: £1,290 and the court fee',
      feedback:
        'The inventory shows the carpet was already worn; that is fair wear and tear. The oven, £60, was rightly conceded. The balance of the deposit is to be repaid within 14 days, with the fee.',
      effects: { trust: { senior: 3, manager: 1 }, reputation: 3 },
    },
    good: {
      verdict: 'Judgment for Ms Shah: £1,290',
      feedback:
        'I accept the carpet was already worn. The balance of the deposit, less the oven, is to be repaid within 14 days.',
      effects: { trust: { senior: 2 }, reputation: 1 },
    },
    pass: {
      verdict: 'Part of the deposit returned: £700',
      feedback:
        'The evidence about the carpet’s condition was not fully drawn out. I order £700 to be repaid.',
      effects: { trust: { senior: 1 } },
    },
    poor: {
      verdict: 'Most of the deposit kept: £250 returned',
      feedback:
        'I was not helped on the key points. The defendant may keep most of the deposit; £250 is to be repaid.',
      effects: { trust: { senior: -2 }, reputation: -1, wellbeing: { stress: 5 } },
    },
  },
  xp: 120,
  skills: { 'legal-research': 15, 'professional-ethics': 25, 'case-management': 20 },
}
