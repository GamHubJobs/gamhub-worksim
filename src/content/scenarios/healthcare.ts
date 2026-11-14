/**
 * Healthcare: the morning ward round at bed 4A-2 in Bay A, then an
 * emergency. The player is the healthcare support worker on the round: they
 * hand over the observations, introduce themselves and check the patient's
 * identity, escalate a high early warning score, speak up about an allergy
 * before a prescription, talk with a worried relative, respond when the
 * patient deteriorates, and document it. Fictional patient; simplified
 * clinical content for learning. No real diagnosis or prescribing: decisions
 * are about safety, escalation and communication, the support worker's part.
 */
import { SCRUBS, SMART } from './looks'
import type { Scenario } from './types'

const BED = { x: 10.4, z: 3.9 }

export const WARD_ROUND: Scenario = {
  id: 'ward-round',
  careerId: 'healthcare',
  title: 'Ward round and emergency: bed 4A-2',
  summary:
    'Join the doctor’s round at Mr Price’s bed: hand over, check, escalate, speak up, and respond when he deteriorates.',
  workplace: 'ward',
  room: 'Bay A, Ward 4',
  minLevel: 1,
  player: { at: { x: 8.85, z: 3.1 }, faces: BED },
  camera: { from: [6.6, 2.9, 1.0], looks: [10.2, 1.0, 4.2] },
  cast: [
    {
      id: 'price',
      name: 'Derek Price',
      role: 'Patient, 74, bed 4A-2 (fictional)',
      look: SMART(1, 'bald', 0, '#a7f3d0'),
      at: { x: 10.9, z: 3.9 },
      faces: { x: 8, z: 3.9 },
      figure: false,
    },
    {
      id: 'haddad',
      name: 'Dr Amira Haddad',
      role: 'Medical registrar',
      look: SMART(4, 'long', 1, '#f8fafc', { under: '#bfdbfe' }),
      at: { x: 8.85, z: 4.75 },
      faces: BED,
    },
    {
      id: 'owen',
      name: 'Owen Fraser',
      role: 'Nurse in charge',
      look: SCRUBS(2, 'short', 2, '#1e3a8a'),
      at: { x: 9.25, z: 2.55 },
      faces: BED,
      personId: 'senior',
    },
    {
      id: 'julie',
      name: 'Julie Price',
      role: 'Mr Price’s daughter',
      look: SMART(1, 'bob', 3, '#be185d'),
      at: { x: 8.6, z: 5.6 },
      faces: BED,
    },
  ],
  exhibits: [
    {
      id: 'drug',
      title: 'Drug chart',
      text: 'ALLERGIES: Penicillin (rash, 2019). Regular: amlodipine 5 mg mane. No antibiotics yet charted.',
    },
    {
      id: 'obs',
      title: 'Observation chart, 10:00',
      text: 'RR 24 · SpO₂ 91% on air · BP 104/68 · HR 112 · Temp 38.4 °C · New confusion: no. NEWS2: 8.',
    },
    {
      id: 'fluid',
      title: 'Fluid balance chart',
      text: 'Intake 900 ml since midnight; output 300 ml.',
    },
  ],
  beats: [
    {
      id: 'arrive',
      kind: 'say',
      who: 'owen',
      gesture: 'talk',
      text: 'Round’s here. Bed two, Mr Price. You did his observations at ten, didn’t you? Dr Haddad will want them.',
    },
    {
      id: 'handover',
      kind: 'choose',
      who: 'haddad',
      prompt: 'Dr Haddad: “Morning. What have we got?”',
      points: 15,
      options: [
        {
          id: 'sbar',
          label:
            '“Mr Price, 74, admitted yesterday with a chest infection. At ten: breathing 24, sats 91% on air, pulse 112, BP 104 over 68, temperature 38.4. NEWS of 8, up from 3 last night. I’m worried he’s getting worse.”',
          score: 1,
          reply: [
            {
              who: 'haddad',
              text: 'That’s a clear handover. Thank you.',
              gesture: 'talk',
            },
          ],
          lesson:
            'A structured handover (situation, background, assessment, recommendation) gets the important facts across quickly.',
        },
        {
          id: 'story',
          label:
            'Tell her about his night, what he had for breakfast, and then the numbers.',
          score: 0.4,
          reply: [{ who: 'haddad', text: 'Okay… what were the observations?' }],
          lesson:
            'Lead with what matters: the numbers and your concern, then the background.',
        },
        {
          id: 'fine',
          label: '“He’s fine, I think.”',
          score: 0,
          reply: [
            { who: 'owen', text: 'His NEWS is 8. That isn’t fine.', gesture: 'talk' },
            { who: 'haddad', text: 'Let me see the chart.' },
          ],
          lesson:
            'Never reassure without the facts: a high score must be reported, not smoothed over.',
        },
      ],
    },
    {
      id: 'hello',
      kind: 'say',
      who: 'price',
      text: 'Who are all these people? And who are you, love?',
    },
    {
      id: 'introduce',
      kind: 'choose',
      prompt:
        'Mr Price asks who you are. You need to check him before the doctor examines him.',
      points: 10,
      options: [
        {
          id: 'hello-my-name',
          label:
            '“Hello Mr Price, I’m {name}, a healthcare support worker. Can I check your wristband and your date of birth, please?”',
          score: 1,
          reply: [
            { who: 'price', text: 'Derek Price, fourteenth of May, 1951.' },
            { who: 'narrator', text: 'The wristband matches the chart.' },
          ],
          lesson:
            'Introduce yourself, and check identity on every contact: the wristband against what the patient says.',
        },
        {
          id: 'skip',
          label: 'Smile and get on with it: it’s obviously him.',
          score: 0.2,
          reply: [
            { who: 'owen', text: 'Wristband first, always. Even when you know them.' },
          ],
          lesson: 'Wrong-patient errors happen precisely when we are sure.',
        },
      ],
    },
    {
      id: 'breathless',
      kind: 'say',
      who: 'price',
      text: 'I feel more breathless than yesterday. And I’m cold, then hot.',
    },
    {
      id: 'escalate',
      kind: 'choose',
      who: 'owen',
      prompt: 'His NEWS is 8 (it was 3 last night). What do you do?',
      points: 15,
      options: [
        {
          id: 'urgent',
          label:
            'Escalate now: tell Dr Haddad it is a NEWS of 8 and rising, and ask her to review him urgently.',
          score: 1,
          reply: [
            {
              who: 'haddad',
              text: 'A NEWS of 7 or more needs an urgent response. I’ll examine him now.',
              gesture: 'talk',
            },
          ],
          lesson:
            'A score of 7 or more is an emergency: escalate at once, to someone who can act.',
        },
        {
          id: 'repeat',
          label: 'Repeat the observations in four hours, as planned.',
          score: 0,
          reply: [
            {
              who: 'owen',
              text: 'Four hours? With a NEWS of 8? He needs a doctor now.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { senior: -2 } },
          lesson:
            'Routine timing does not apply to a rising score: escalation is the action.',
        },
        {
          id: 'paracetamol',
          label: 'Ask about paracetamol for the temperature and check again later.',
          score: 0.2,
          reply: [
            {
              who: 'haddad',
              text: 'Treating the number isn’t treating him. Let me look.',
            },
          ],
          lesson: 'Masking a fever does not address why the score is high.',
        },
      ],
    },
    {
      id: 'examine',
      kind: 'say',
      who: 'narrator',
      text: 'Dr Haddad listens to his chest and looks at the chart.',
    },
    {
      id: 'prescribe',
      kind: 'say',
      who: 'haddad',
      gesture: 'talk',
      text: 'I think this is sepsis from the chest. I’ll start intravenous co-amoxiclav straight away.',
    },
    {
      id: 'allergy',
      kind: 'choose',
      prompt: 'You remember something on his chart. Do you speak?',
      points: 20,
      options: [
        {
          id: 'speak-up',
          label:
            '“Sorry to interrupt, Dr Haddad: his chart and wristband say penicillin allergy. Co-amoxiclav contains penicillin.”',
          score: 1,
          reply: [
            {
              who: 'haddad',
              text: 'You’re right, thank you. Good catch. I’ll prescribe an alternative from the antibiotic guideline.',
              gesture: 'talk',
            },
          ],
          effects: { reputation: 2 },
          lesson:
            'Anyone on the team can and must speak up about a safety risk, whatever their grade.',
          goto: 'show-allergy',
        },
        {
          id: 'quiet',
          label: 'Say nothing: the doctor must know.',
          score: 0,
          reply: [
            {
              who: 'owen',
              text: 'Hold on: he’s allergic to penicillin. It’s on the chart!',
              gesture: 'talk',
            },
            {
              who: 'haddad',
              text: 'Thank you, Owen. That would have been a serious error.',
            },
          ],
          effects: { trust: { senior: -1 } },
          lesson: 'Assuming someone else has noticed is how errors reach patients.',
          goto: 'show-allergy',
        },
        {
          id: 'later',
          label: 'Mention it to Owen after the round.',
          score: 0.3,
          reply: [{ who: 'owen', text: 'After? It’ll be given by then. Say it now.' }],
          lesson: 'Safety concerns are raised at the moment they matter, not afterwards.',
          goto: 'show-allergy',
        },
      ],
    },
    {
      id: 'show-allergy',
      kind: 'exhibit',
      who: 'haddad',
      prompt: 'Dr Haddad asks where the allergy is recorded. Show her.',
      points: 5,
      items: ['obs', 'drug', 'fluid'],
      correct: 'drug',
      right: [
        {
          who: 'haddad',
          text: 'There it is: penicillin, rash, 2019. Thank you.',
          gesture: 'talk',
        },
      ],
      wrong: [
        {
          who: 'haddad',
          text: 'That’s not where allergies are recorded. The drug chart?',
        },
      ],
      lesson:
        'Allergies are recorded on the drug chart (and the wristband): check there before any medicine.',
    },
    {
      id: 'julie',
      kind: 'say',
      who: 'julie',
      gesture: 'talk',
      text: 'Excuse me. Is my dad going to be all right? Nobody has told me anything.',
    },
    {
      id: 'relative',
      kind: 'choose',
      prompt: 'Julie is frightened. What do you say?',
      points: 10,
      options: [
        {
          id: 'kind',
          label:
            'Acknowledge how worrying this is, check with Mr Price that he is happy for you to talk with Julie, and ask Dr Haddad to explain the plan to them both.',
          score: 1,
          reply: [
            { who: 'price', text: 'Of course, she’s my daughter.' },
            {
              who: 'haddad',
              text: 'I’ll talk to you both as soon as I’ve written up.',
              gesture: 'talk',
            },
            { who: 'julie', text: 'Thank you. That helps.' },
          ],
          lesson:
            'Be kind, respect confidentiality (ask the patient first), and get the right person to explain.',
        },
        {
          id: 'prognosis',
          label: '“He’ll be absolutely fine, don’t worry.”',
          score: 0,
          reply: [{ who: 'owen', text: 'We can’t promise that. Let Dr Haddad explain.' }],
          lesson: 'Never give a prognosis or false reassurance: it is not yours to give.',
        },
        {
          id: 'elsewhere',
          label: '“You’ll have to ask someone else.”',
          score: 0.2,
          reply: [{ who: 'julie', text: 'That’s what everyone says.' }],
          lesson:
            'Brushing people off leaves them frightened; help them reach the right person.',
        },
      ],
    },
    {
      id: 'alarm',
      kind: 'say',
      who: 'narrator',
      text: 'Ten minutes later the monitor alarms. Mr Price’s oxygen saturation is 86% and he looks grey and drowsy.',
    },
    {
      id: 'emergency',
      kind: 'choose',
      prompt: 'You are alone at the bedside. What do you do first?',
      points: 15,
      options: [
        {
          id: 'help',
          label:
            'Press the emergency buzzer and call for help, stay with him, sit him up, and follow the nurse in charge’s instructions (A–E).',
          score: 1,
          reply: [
            {
              who: 'owen',
              text: 'I’m here. Oxygen on. Dr Haddad is on her way.',
              gesture: 'talk',
            },
            { who: 'haddad', text: 'Well done for calling straight away.' },
          ],
          lesson:
            'Call for help first and stay with the patient: never leave someone who is deteriorating.',
        },
        {
          id: 'run',
          label: 'Run down the ward to find the doctor.',
          score: 0.2,
          reply: [{ who: 'owen', text: 'Never leave him alone! Use the buzzer.' }],
          lesson: 'Leaving the patient means nobody sees what happens next.',
        },
        {
          id: 'wait',
          label: 'Wait for the next observations: the monitor may be wrong.',
          score: 0,
          reply: [{ who: 'owen', text: 'Look at him, not the machine. Get help!' }],
          effects: { trust: { senior: -2 } },
          lesson:
            'Trust what you see: a grey, drowsy patient is an emergency whatever the monitor says.',
        },
      ],
    },
    {
      id: 'stable',
      kind: 'say',
      who: 'haddad',
      gesture: 'talk',
      text: 'Saturations back to 94% on oxygen. He’s on the sepsis pathway. Please document all of this.',
    },
    {
      id: 'meeting-decision',
      kind: 'choose',
      who: 'owen',
      prompt:
        'Owen: “At this morning’s safety huddle someone said ‘falls happen, there’s nothing we can do at night.’ What would you have said?”',
      points: 15,
      options: [
        {
          id: 'pattern',
          label:
            'Point out the pattern (night, toilet trips) and suggest offering help to the toilet on the night rounds',
          score: 1,
          reply: [
            {
              who: 'owen',
              text: 'Good answer. Evidence and a practical step: that is how huddles reduce harm.',
              gesture: 'talk',
            },
          ],
          lesson: 'Evidence and a practical step: that is how huddles reduce harm.',
        },
        {
          id: 'agree',
          label: 'Agree and move on',
          score: 0,
          reply: [
            {
              who: 'owen',
              text: 'Most falls have patterns that can be acted on.',
              gesture: 'talk',
            },
          ],
          lesson: 'Most falls have patterns that can be acted on.',
        },
        {
          id: 'blame',
          label: 'Say the night staff should watch patients more closely',
          score: 0.4,
          reply: [
            {
              who: 'owen',
              text: 'Closer to the point, but blaming a team rarely changes practice; a specific step does.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Closer to the point, but blaming a team rarely changes practice; a specific step does.',
        },
      ],
    },
    {
      id: 'document',
      kind: 'speak',
      who: 'owen',
      prompt:
        'Write your note for the record, in your own words: the time, the observations and score, who you told, what was done.',
      points: 10,
      minWords: 30,
      mentions: [
        ['NEWS', 'score'],
        ['sats', 'saturation', 'SpO2', 'oxygen'],
        ['Dr Haddad', 'doctor', 'escalat', 'registrar'],
        ['allergy', 'penicillin'],
      ],
      model:
        '10:00 observations: RR 24, SpO2 91% on air, HR 112, BP 104/68, temp 38.4, NEWS 8. Escalated to Dr Haddad on the ward round. Penicillin allergy pointed out before antibiotics were prescribed. 10:25 SpO2 86%, emergency buzzer pressed, oxygen started by Owen, Dr Haddad reviewed; SpO2 94% on oxygen.',
      good: [
        {
          who: 'owen',
          text: 'Clear, timed and complete. That’s a good note.',
          gesture: 'talk',
        },
      ],
      weak: [
        {
          who: 'owen',
          text: 'Add the times, the score and who you told. If it isn’t written, it didn’t happen.',
        },
      ],
      lesson: 'Good records are timed, factual and say who was told and what was done.',
    },
    { id: 'end', kind: 'end' },
  ],
  outcomes: {
    excellent: {
      verdict: 'Mr Price stabilised: early escalation and an allergy caught',
      feedback:
        'You escalated early, stopped a serious drug error and called for help at once. That is exactly how patients stay safe.',
      effects: { trust: { senior: 3, manager: 2 }, reputation: 3 },
    },
    good: {
      verdict: 'Mr Price stabilised',
      feedback:
        'Good work on the round. Some things took longer than they should; we’ll go through them.',
      effects: { trust: { senior: 2 }, reputation: 1 },
    },
    pass: {
      verdict: 'Mr Price stabilised, with delays',
      feedback:
        'He’s safe now, but there were delays in escalating. Let’s talk about the NEWS thresholds.',
      effects: { trust: { senior: 1 } },
    },
    poor: {
      verdict: 'Mr Price was transferred to high dependency after delays',
      feedback:
        'His deterioration wasn’t escalated in time. We’ll do a learning review together, no blame.',
      effects: { trust: { senior: -2 }, wellbeing: { stress: 6 } },
    },
  },
  xp: 120,
  skills: {
    'patient-safety': 30,
    'clinical-observation': 20,
    'clinical-documentation': 15,
  },
  caseLink: {
    caseId: 'hc-safety-huddle',
    answers: [
      {
        beat: 'meeting-decision',
        step: 'in-room',
        options: { pattern: 'pattern', agree: 'agree', blame: 'blame' },
      },
    ],
  },
}
