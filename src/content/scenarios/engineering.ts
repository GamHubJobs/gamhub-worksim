/**
 * Engineering: a safety walk in the workshop with a contractor's crew, then
 * the project meeting. The player challenges missing PPE, stops work on a
 * pump that has not been isolated, takes a damaged test beam out of use,
 * reports a near miss, gives the client an honest schedule, and gives the
 * toolbox talk. Standard practice (permit to work, lockout-tagout, test
 * before touch), simplified for learning.
 */
import { HI_VIS, SMART, SUIT } from './looks'
import type { Scenario } from './types'

const PUMP = { x: 7.2, z: 2.2 }

export const SAFETY_WALK: Scenario = {
  id: 'eng-safety-walk',
  careerId: 'engineering-services',
  title: 'Safety walk and project meeting',
  summary:
    'Walk the workshop with a contractor’s crew: PPE, a pump not isolated, a damaged beam, then an honest schedule for the client.',
  workplace: 'workshop',
  room: 'The workshop',
  minLevel: 1,
  player: { at: { x: 8.75, z: 4.45 }, faces: PUMP },
  camera: { from: [6.0, 3.2, 7.8], looks: [9.0, 0.9, 2.8] },
  cast: [
    {
      id: 'kev',
      name: 'Kev Doyle',
      role: 'Contractor electrician',
      look: HI_VIS(1, 'short', 2, { beard: true }),
      at: { x: 7.4, z: 3.15 },
      faces: PUMP,
    },
    {
      id: 'tia',
      name: 'Tia Morgan',
      role: 'Apprentice technician',
      look: HI_VIS(5, 'ponytail', 0),
      at: { x: 9.5, z: 2.9 },
      faces: { x: 8.5, z: 4 },
    },
    {
      id: 'dmitri',
      name: 'Dmitri Volkov',
      role: 'Senior engineer',
      look: SMART(0, 'side', 1, '#334155', { glasses: true }),
      at: { x: 10.15, z: 4.35 },
      faces: { x: 8.5, z: 4.2 },
      personId: 'senior',
    },
    {
      id: 'client',
      name: 'Laura Bennett',
      role: 'Client project manager, Mill Lane footbridge',
      look: SUIT(2, 'bob', 4, '#475569', { tie: undefined }),
      at: { x: 10.0, z: 6.15 },
      faces: { x: 8.7, z: 4.4 },
      moves: [{ from: 'meeting', at: { x: 9.45, z: 5.35 }, faces: { x: 8.7, z: 4.4 } }],
    },
  ],
  exhibits: [
    {
      id: 'calc',
      title: 'Beam check: span 3 m, load 12 kN',
      text: 'Bending stress 172 N/mm² against an allowable 165 N/mm². Measured deflection 14 mm (limit span/360 = 8.3 mm).',
    },
    {
      id: 'permit',
      title: 'Permit to work PTW-0412',
      text: 'Pump P-2 motor replacement. Isolation: MCB 14, locked off by K. Doyle. Status: NOT YET ISSUED.',
    },
    {
      id: 'programme',
      title: 'Programme, rev D',
      text: 'Steel delivery slipped 2 weeks (supplier letter 3 May). Critical path: steel → erection → deck. New completion: 14 July (was 30 June).',
    },
  ],
  beats: [
    {
      id: 'start',
      kind: 'say',
      who: 'dmitri',
      gesture: 'talk',
      text: 'Right, safety walk before the client arrives. Kev’s crew are changing the motor on pump P-2 today.',
    },
    {
      id: 'ppe',
      kind: 'choose',
      prompt:
        'Tia, the apprentice, is at the test bench without safety glasses. What do you do?',
      points: 10,
      options: [
        {
          id: 'challenge',
          label:
            'Stop and ask her, politely, to put her glasses on before carrying on: the sign at the door says why.',
          score: 1,
          reply: [
            {
              who: 'tia',
              text: 'Sorry, I took them off to read the meter. Back on.',
              gesture: 'reach',
            },
            {
              who: 'dmitri',
              text: 'Good. Everyone challenges, everyone accepts a challenge.',
            },
          ],
          lesson:
            'A good safety culture means anyone can challenge unsafe behaviour, kindly and at once.',
        },
        {
          id: 'ignore',
          label: 'Leave it: she is only reading a meter.',
          score: 0,
          reply: [
            { who: 'dmitri', text: 'Every eye injury starts with “only for a second”.' },
          ],
          lesson: 'Walking past an unsafe act tells everyone it is acceptable.',
        },
      ],
    },
    {
      id: 'kev',
      kind: 'say',
      who: 'kev',
      gesture: 'talk',
      text: 'We’ll crack on with the motor now. It’s only four hundred volts, five minutes. No need to wait for the permit.',
    },
    {
      id: 'isolate',
      kind: 'choose',
      prompt:
        'The permit has not been issued and the motor has not been isolated. Your decision?',
      points: 20,
      options: [
        {
          id: 'stop',
          label:
            'Stop the job: isolate at MCB 14, lock and tag it off, prove it dead with a tester, and issue the permit before anyone touches it.',
          score: 1,
          reply: [
            { who: 'kev', text: 'Fair enough. I’ll get my lock on.', gesture: 'reach' },
            {
              who: 'narrator',
              text: 'Kev locks off MCB 14 and proves the motor dead with his tester.',
            },
          ],
          lesson: 'Isolate, lock off, prove dead, then work: every time, under a permit.',
        },
        {
          id: 'allow',
          label: 'Let him, he’s experienced, but tell him to be careful.',
          score: 0,
          reply: [
            {
              who: 'dmitri',
              text: 'No. Nobody works on live equipment here. Stop the job.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { senior: -2 }, reputation: -1 },
          lesson: 'Experience does not make live work safe; 400 V kills.',
        },
        {
          id: 'switch',
          label: 'Switch it off at the panel and let him start.',
          score: 0.3,
          reply: [
            {
              who: 'dmitri',
              text: 'Off isn’t isolated. Lock it, tag it, prove it dead.',
            },
          ],
          lesson:
            'A switch can be turned back on by someone else; a personal lock cannot.',
        },
      ],
    },
    {
      id: 'show-permit',
      kind: 'exhibit',
      who: 'kev',
      prompt: 'Kev asks what still has to happen before he starts. Show him.',
      points: 5,
      items: ['calc', 'permit', 'programme'],
      correct: 'permit',
      right: [
        {
          who: 'kev',
          text: 'Permit not issued yet. Right, I’ll wait for it.',
          gesture: 'talk',
        },
      ],
      wrong: [{ who: 'kev', text: 'What’s that got to do with my pump?' }],
      lesson: 'The permit to work is the record that the job is safe to start.',
    },
    {
      id: 'beam',
      kind: 'say',
      who: 'tia',
      gesture: 'talk',
      text: 'Can I ask about the test beam? It looks bent in the middle, and there’s a crack by the load point.',
    },
    {
      id: 'beam-decision',
      kind: 'choose',
      prompt:
        'The check shows 172 N/mm² against 165 allowed, and 14 mm deflection against an 8.3 mm limit.',
      points: 15,
      options: [
        {
          id: 'out-of-use',
          label:
            'Take the load off and tag the beam out of use, record the defect, and have it replaced before any more tests.',
          score: 1,
          reply: [
            {
              who: 'dmitri',
              text: 'Right call. Overstressed and over the deflection limit.',
              gesture: 'talk',
            },
          ],
          lesson:
            'A member over its stress and deflection limits comes out of use until it is fixed.',
        },
        {
          id: 'monitor',
          label: 'Keep testing but check the crack every day.',
          score: 0.2,
          reply: [
            {
              who: 'dmitri',
              text: 'Monitoring is for things within limits. This isn’t.',
            },
          ],
          lesson: 'Monitoring cannot make an overstressed member safe.',
        },
        {
          id: 'ignore',
          label: 'It has held so far: carry on.',
          score: 0,
          reply: [{ who: 'tia', text: 'But it’s cracked…' }],
          lesson: '“It has held so far” is how failures happen.',
        },
      ],
    },
    {
      id: 'near-miss',
      kind: 'choose',
      prompt: 'Kev nearly worked on a live motor. What happens to that?',
      points: 10,
      options: [
        {
          id: 'report',
          label:
            'Report it as a near miss, with no blame, so the team learns why it nearly happened.',
          score: 1,
          reply: [
            {
              who: 'kev',
              text: 'Fair. The permit desk was shut this morning, that’s why I was rushing.',
              gesture: 'talk',
            },
            {
              who: 'dmitri',
              text: 'That’s exactly what a report finds. We’ll fix the permit desk hours.',
            },
          ],
          lesson: 'Near-miss reports find the causes of accidents before anyone is hurt.',
        },
        {
          id: 'quiet',
          label: 'No harm done: keep it between us.',
          score: 0,
          reply: [
            {
              who: 'dmitri',
              text: 'Then nobody learns, and next time someone gets hurt.',
            },
          ],
          lesson: 'Unreported near misses repeat.',
        },
      ],
    },
    {
      id: 'meeting',
      kind: 'say',
      who: 'client',
      gesture: 'talk',
      text: 'Morning. My board wants the footbridge open on the thirtieth of June. Can you confirm that?',
    },
    {
      id: 'schedule',
      kind: 'choose',
      prompt: 'Steel delivery slipped two weeks and it is on the critical path.',
      points: 15,
      options: [
        {
          id: 'honest',
          label:
            'Tell her honestly: the steel slipped two weeks on the critical path, so completion is now 14 July; explain the recovery options and their cost.',
          score: 1,
          reply: [
            {
              who: 'client',
              text: 'Not what I hoped, but I’d rather know now. Send me the options.',
              gesture: 'talk',
            },
          ],
          effects: { reputation: 2 },
          lesson:
            'Bad news early, with options, keeps trust; surprises later destroy it.',
        },
        {
          id: 'promise',
          label: '“Yes, the thirtieth is fine.”',
          score: 0,
          reply: [
            {
              who: 'dmitri',
              text: 'Laura, we need to correct that: the steel is two weeks late.',
            },
          ],
          effects: { reputation: -2 },
          lesson:
            'Promising a date you know you will miss is the fastest way to lose a client.',
        },
        {
          id: 'vague',
          label: '“We’ll do our best.”',
          score: 0.3,
          reply: [
            { who: 'client', text: 'That isn’t a date. What do I tell the board?' },
          ],
          lesson: 'Clients need a date and a reason, not reassurance.',
        },
      ],
    },
    {
      id: 'show-programme',
      kind: 'exhibit',
      who: 'client',
      prompt: 'Laura asks to see why. Show her.',
      points: 5,
      items: ['programme', 'calc', 'permit'],
      correct: 'programme',
      right: [
        {
          who: 'client',
          text: 'The steel supplier’s letter. I see. Thank you.',
          gesture: 'talk',
        },
      ],
      wrong: [{ who: 'client', text: 'I don’t follow how that explains the date.' }],
      lesson: 'Back a schedule change with the programme and its evidence.',
    },
    {
      id: 'meeting-decision',
      kind: 'choose',
      who: 'client',
      prompt:
        'Laura: “On the design review: can we use the NB-150 section to save money? It’s only a bit over.”',
      points: 15,
      options: [
        {
          id: 'no',
          label:
            'Explain that NB-150 would be overstressed, so it cannot be used; offer to look at other savings',
          score: 1,
          reply: [
            {
              who: 'dmitri',
              text: 'Good answer. Safety is not negotiable, but the client’s goal still gets your help.',
              gesture: 'talk',
            },
          ],
          lesson: 'Safety is not negotiable, but the client’s goal still gets your help.',
        },
        {
          id: 'yes',
          label: 'Agree: it is only a bit over',
          score: 0,
          reply: [
            {
              who: 'dmitri',
              text: 'Overstressed means the design does not meet its safety factor.',
              gesture: 'talk',
            },
          ],
          lesson: 'Overstressed means the design does not meet its safety factor.',
        },
        {
          id: 'later',
          label: 'Say you will think about it',
          score: 0.4,
          reply: [
            {
              who: 'dmitri',
              text: 'Not wrong, but the answer is already clear.',
              gesture: 'talk',
            },
          ],
          lesson: 'Not wrong, but the answer is already clear.',
        },
      ],
    },
    {
      id: 'toolbox',
      kind: 'speak',
      who: 'dmitri',
      prompt:
        'Give the crew a short toolbox talk in your own words: what nearly happened today and what everyone does from now on.',
      points: 15,
      minWords: 35,
      mentions: [
        ['isolate', 'lock', 'locked off', 'lockout'],
        ['prove dead', 'test', 'tester', 'proved'],
        ['permit'],
        ['glasses', 'PPE'],
      ],
      model:
        'This morning someone nearly worked on the pump motor before it was isolated. From now on: no work without a permit; isolate, lock off and tag, then prove it dead with a tester before you touch it. Safety glasses on beyond the sign, always. If you see something unsafe, stop it and report it.',
      good: [
        { who: 'kev', text: 'Clear. Sorry about this morning, lads.', gesture: 'talk' },
      ],
      weak: [
        { who: 'dmitri', text: 'Be specific: permit, isolate, lock off, prove dead.' },
      ],
      lesson:
        'A toolbox talk is short and specific: what happened and exactly what to do.',
    },
    { id: 'end', kind: 'end' },
  ],
  outcomes: {
    excellent: {
      verdict:
        'A safe day: live work stopped, the beam out of use, the client kept informed',
      feedback:
        'You stopped live work, took the beam out of use and told the client the truth. That’s the job.',
      effects: { trust: { senior: 3, manager: 2 }, reputation: 3 },
    },
    good: {
      verdict: 'A safe day, mostly',
      feedback: 'Good calls on the big things. A few could have been firmer.',
      effects: { trust: { senior: 2 }, reputation: 1 },
    },
    pass: {
      verdict: 'No one hurt, but standards slipped',
      feedback:
        'Nobody was hurt, but that was partly luck. We’ll go through the safe system of work again.',
      effects: { trust: { senior: 1 } },
    },
    poor: {
      verdict: 'Work stopped by the senior engineer',
      feedback:
        'I had to step in more than once. Safety is not negotiable here; let’s retrain on permits and isolation.',
      effects: { trust: { senior: -2 }, reputation: -1, wellbeing: { stress: 5 } },
    },
  },
  xp: 120,
  skills: {
    'safe-systems-of-work': 30,
    'engineering-analysis': 15,
    'design-judgement': 15,
  },
  caseLink: {
    caseId: 'eng-design-review',
    answers: [
      {
        beat: 'meeting-decision',
        step: 'pressure',
        options: { no: 'no', yes: 'yes', later: 'later' },
      },
    ],
  },
}
