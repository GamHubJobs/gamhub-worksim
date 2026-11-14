/**
 * Healthcare: admitting a new patient to bed 4A-4 after a fall at home. The
 * support worker introduces themselves and gets consent, notices new
 * confusion and reports it, makes the bed space safe from falls, spots a
 * pressure area, protects confidentiality on the phone, escalates severe
 * pain and writes the admission note. Fictional patient; simplified for
 * learning. No diagnosis or prescribing.
 */
import { SCRUBS, SMART } from './looks'
import type { Scenario } from './types'

const BED = { x: 10.4, z: 8.3 }

export const ADMISSION: Scenario = {
  id: 'ward-admission',
  careerId: 'healthcare',
  title: 'Admitting a new patient: bed 4A-4',
  summary:
    'Admit Mr Whitfield after a fall: consent, new confusion, falls prevention, a pressure area, a phone call and his pain.',
  workplace: 'ward',
  room: 'Bay A, Ward 4',
  minLevel: 1,
  player: { at: { x: 8.85, z: 7.55 }, faces: BED },
  camera: { from: [6.4, 2.9, 5.4], looks: [10.2, 1.0, 8.3] },
  cast: [
    {
      id: 'whitfield',
      name: 'George Whitfield',
      role: 'Patient, 82, bed 4A-4 (fictional)',
      look: SMART(0, 'bald', 0, '#fbcfe8'),
      at: { x: 10.9, z: 8.3 },
      faces: { x: 8, z: 8.3 },
      figure: false,
    },
    {
      id: 'owen',
      name: 'Owen Fraser',
      role: 'Nurse in charge',
      look: SCRUBS(2, 'short', 2, '#1e3a8a'),
      at: { x: 9.05, z: 7.05 },
      faces: BED,
      personId: 'senior',
    },
    {
      id: 'paul',
      name: 'Paul Whitfield',
      role: 'Mr Whitfield’s son',
      look: SMART(1, 'short', 3, '#64748b'),
      at: { x: 8.6, z: 8.75 },
      faces: BED,
    },
  ],
  exhibits: [
    {
      id: 'falls',
      title: 'Falls risk assessment',
      text: 'Falls history, new confusion, walks with a frame, needs the toilet at night.',
    },
    {
      id: 'pressure',
      title: 'Pressure ulcer risk assessment and skin chart',
      text: 'Records risk score and any skin damage, with a body map. Red, non-blanching skin is reported and recorded here.',
    },
    {
      id: 'fluid',
      title: 'Fluid balance chart',
      text: 'Intake and output since admission.',
    },
  ],
  beats: [
    {
      id: 'handover',
      kind: 'say',
      who: 'owen',
      gesture: 'talk',
      text: 'New admission in bed four: Mr Whitfield, 82, from A&E after a fall at home. Can you do his admission checks? Shout if anything worries you.',
    },
    {
      id: 'consent',
      kind: 'choose',
      prompt: 'You arrive at Mr Whitfield’s bed.',
      points: 10,
      options: [
        {
          id: 'introduce',
          label:
            '“Hello Mr Whitfield, I’m {name}, a healthcare support worker. Can I check your wristband, and is it all right if I do some checks to help us look after you?”',
          score: 1,
          reply: [{ who: 'whitfield', text: 'Yes, go on, love.' }],
          lesson:
            'Introduce yourself, check identity, explain, and ask consent before any care.',
        },
        {
          id: 'start',
          label: 'Start the checks straight away to save time.',
          score: 0.2,
          reply: [{ who: 'paul', text: 'Sorry, who are you?' }],
          lesson:
            'Care without introduction or consent is disrespectful, and frightening for the patient.',
        },
      ],
    },
    {
      id: 'muddled',
      kind: 'say',
      who: 'whitfield',
      text: 'Where am I? Is this the bus station?',
    },
    {
      id: 'confusion',
      kind: 'choose',
      prompt: 'Mr Whitfield seems confused.',
      points: 15,
      options: [
        {
          id: 'ask-son',
          label:
            'Ask Paul whether this is usual for his dad, and tell Owen straight away that the confusion may be new.',
          score: 1,
          reply: [
            {
              who: 'paul',
              text: 'He’s never like this. He was sharp as anything yesterday.',
              gesture: 'talk',
            },
            {
              who: 'owen',
              text: 'New confusion: I’ll get the doctor to see him. Well spotted.',
              gesture: 'talk',
            },
          ],
          lesson:
            'New confusion can be a sign of serious illness (delirium): find out if it is new and report it.',
        },
        {
          id: 'assume',
          label: 'Assume it’s his age and carry on.',
          score: 0,
          reply: [{ who: 'paul', text: 'He isn’t usually like this at all!' }],
          lesson:
            'Never assume confusion is normal for an older person: ask, and report.',
        },
      ],
    },
    {
      id: 'safe-bed',
      kind: 'choose',
      prompt:
        'He came in after a fall, walks with a frame, and is confused. How do you make his bed space safe?',
      points: 15,
      options: [
        {
          id: 'falls-measures',
          label:
            'Bed at its lowest, call bell and frame within reach, non-slip socks, his glasses on, a clear path to the toilet, and the falls assessment done.',
          score: 1,
          reply: [
            { who: 'owen', text: 'That’s a safe bed space. Thank you.', gesture: 'talk' },
          ],
          lesson:
            'Falls prevention is many small things: low bed, call bell, footwear, sight, a clear path.',
        },
        {
          id: 'rails',
          label: 'Put the bed rails up so he can’t get out.',
          score: 0.3,
          reply: [
            {
              who: 'owen',
              text: 'Careful: confused patients can climb over rails and fall further. We assess first.',
            },
          ],
          lesson:
            'Bed rails can increase harm in confused patients; they need an assessment.',
        },
      ],
    },
    {
      id: 'skin',
      kind: 'exhibit',
      who: 'owen',
      prompt:
        'His right heel has a red patch that does not fade when you press it. Where do you assess and record it (after telling Owen)?',
      points: 15,
      items: ['falls', 'fluid', 'pressure'],
      correct: 'pressure',
      right: [
        {
          who: 'owen',
          text: 'Right: that’s early pressure damage. Heels off the bed, and a pressure-relieving mattress.',
          gesture: 'talk',
        },
      ],
      wrong: [
        {
          who: 'owen',
          text: 'That’s not where skin damage goes: the pressure ulcer assessment and skin chart.',
        },
      ],
      lesson:
        'Red skin that does not blanch is early pressure damage: report it and record it on the skin chart.',
    },
    {
      id: 'phone',
      kind: 'say',
      who: 'narrator',
      text: 'The bay phone rings. A caller says she is Mr Whitfield’s niece and asks what is wrong with him.',
    },
    {
      id: 'confidential',
      kind: 'choose',
      prompt: 'The caller wants details about Mr Whitfield.',
      points: 15,
      options: [
        {
          id: 'protect',
          label:
            'Don’t share anything over the phone without his consent: take her name and number, and say a nurse will speak with Mr Whitfield and his son about who can be told.',
          score: 1,
          reply: [
            {
              who: 'paul',
              text: 'Thank you. There’s no niece I know of, actually.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Patient information is confidential: no details without consent, whoever says they are calling.',
        },
        {
          id: 'share',
          label: 'Tell her: he’s had a fall and is confused.',
          score: 0,
          reply: [
            {
              who: 'owen',
              text: 'You can’t share that over the phone. That’s a confidentiality breach.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { senior: -2 } },
          lesson:
            'Sharing without consent breaches confidentiality, and callers are not always who they say.',
        },
      ],
    },
    {
      id: 'pain',
      kind: 'say',
      who: 'whitfield',
      text: 'Ooh, my hip. It’s really bad when I move. Eight out of ten.',
    },
    {
      id: 'escalate',
      kind: 'choose',
      prompt: 'Severe hip pain after a fall.',
      points: 10,
      options: [
        {
          id: 'now',
          label:
            'Keep him still and tell Owen now: severe hip pain after a fall needs checking (it could be a fracture).',
          score: 1,
          reply: [
            {
              who: 'owen',
              text: 'Good. I’ll ask the doctor to look at that hip too, and give him pain relief.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Severe or new pain after a fall is reported at once: injuries can be missed in A&E.',
        },
        {
          id: 'later',
          label: 'Note it and mention it at the end of the shift.',
          score: 0,
          reply: [{ who: 'paul', text: 'He’s in agony! Can someone do something?' }],
          lesson: 'Pain is reported when it is found, not saved up.',
        },
      ],
    },
    {
      id: 'note',
      kind: 'speak',
      who: 'owen',
      prompt:
        'Write the admission note in your own words: what you found and who you told.',
      points: 20,
      minWords: 30,
      mentions: [
        ['confus', 'delirium'],
        ['heel', 'pressure', 'skin'],
        ['pain', 'hip'],
        ['falls', 'call bell', 'low bed'],
      ],
      model:
        'Admitted after a fall at home. New confusion (son says not usual): reported to Owen, doctor to review. Falls measures in place: low bed, call bell and frame in reach, non-slip socks, glasses. Red non-blanching patch on right heel: recorded on skin chart, reported. Hip pain 8/10 on movement: reported to Owen. Phone caller claiming to be a niece: no details given.',
      good: [
        {
          who: 'owen',
          text: 'Thorough and clear. That’s a proper admission.',
          gesture: 'talk',
        },
      ],
      weak: [
        {
          who: 'owen',
          text: 'Put in what you found and who you told: confusion, skin, pain, falls.',
        },
      ],
      lesson: 'The admission note is the baseline everyone else works from.',
    },
    { id: 'end', kind: 'end' },
  ],
  outcomes: {
    excellent: {
      verdict:
        'A safe admission: delirium, pressure damage and a possible fracture all caught early',
      feedback:
        'You noticed everything that mattered and told the right people straight away.',
      effects: { trust: { senior: 3 }, reputation: 3 },
    },
    good: {
      verdict: 'A safe admission',
      feedback: 'Good admission. A couple of things needed prompting.',
      effects: { trust: { senior: 2 }, reputation: 1 },
    },
    pass: {
      verdict: 'Admitted, with things missed',
      feedback:
        'He’s safe, but we nearly missed some things. Let’s go through admissions together.',
      effects: { trust: { senior: 1 } },
    },
    poor: {
      verdict: 'Admission redone by the nurse in charge',
      feedback: 'Several risks were missed. No blame: let’s learn from it together.',
      effects: { trust: { senior: -2 }, wellbeing: { stress: 5 } },
    },
  },
  xp: 100,
  skills: { 'patient-safety': 25, confidentiality: 20, 'clinical-documentation': 15 },
}
