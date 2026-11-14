/**
 * Law: a first interview with a new client in the client meeting room off
 * reception. Conflict check before hearing the story, identity checks and an
 * engagement letter before advice, open questions, the document that proves
 * the deal, honest expectations, the right next step and clear fees, then
 * the attendance note. Fictional client, supplier and jurisdiction.
 */
import { SMART, SUIT } from './looks'
import type { Scenario } from './types'

const TABLE = { x: -10.25, z: 0.1 }

export const CLIENT_INTERVIEW: Scenario = {
  id: 'law-client-interview',
  careerId: 'legal',
  title: 'First interview with a new client',
  summary:
    'Meet a florist whose wedding roses arrived wilting: conflict check, identity, the facts, honest advice and the next step.',
  workplace: 'courtroom',
  room: 'The client meeting room',
  minLevel: 1,
  player: { at: { x: -9.4, z: 1.1 }, faces: TABLE },
  camera: { from: [-7.3, 3.4, -1.4], looks: [-10.6, 0.8, 0.6] },
  cast: [
    {
      id: 'asha',
      name: 'Asha Verma',
      role: 'Client: owner, Verma Florists',
      look: SMART(4, 'long', 0, '#be185d'),
      at: { x: -11.2, z: 0.1 },
      faces: TABLE,
      seated: true,
    },
    {
      id: 'tobias',
      name: 'Tobias Kestrel',
      role: 'Senior Associate (supervising)',
      look: SUIT(1, 'side', 2, '#1f2937'),
      at: { x: -10.25, z: -0.85 },
      faces: TABLE,
      seated: true,
      personId: 'senior',
    },
    {
      id: 'sunita',
      name: 'Sunita Bhatt',
      role: 'Legal Secretary',
      look: SMART(4, 'bun', 0, '#0f766e'),
      at: { x: -7.6, z: 0.2 },
      faces: { x: -9, z: 0.2 },
      moves: [
        { from: 'conflict-clear', at: { x: -9.0, z: 0.25 }, faces: TABLE },
        { from: 'listen', at: { x: -7.6, z: 0.2 }, faces: { x: -6, z: 0.2 } },
      ],
    },
  ],
  exhibits: [
    {
      id: 'order',
      title: 'Order confirmation BW-7731',
      text: '300 roses, Grade A, 50 cm stems, delivered fresh within 48 hours of cutting, for 14 June. Complaints in writing within 7 days.',
    },
    {
      id: 'invoice',
      title: 'Bloom Wholesale invoice',
      text: '300 × roses, £8 each: £2,400. Paid in full 10 June.',
    },
    {
      id: 'post',
      title: 'Asha’s social media post (draft)',
      text: '“Never use Bloom Wholesale, they’re crooks!!” (not yet posted)',
    },
  ],
  beats: [
    {
      id: 'hello',
      kind: 'say',
      who: 'asha',
      gesture: 'talk',
      text: 'Thank you for seeing me. A wholesaler, Bloom Wholesale, sold me 300 roses for a wedding and they arrived wilting. They won’t refund the £2,400.',
    },
    {
      id: 'conflict',
      kind: 'choose',
      prompt: 'Before Asha tells you more, what must happen?',
      points: 15,
      options: [
        {
          id: 'check',
          label:
            '“Before you tell me any details, I need to check we haven’t acted for Bloom Wholesale. It only takes a minute.” Ask Sunita to run the conflict check.',
          score: 1,
          reply: [
            {
              who: 'tobias',
              text: 'Exactly right. Conflict check first, always.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Run the conflict check before hearing confidential details: if we act for the other side, we must not hear them.',
        },
        {
          id: 'dive',
          label: '“Tell me everything that happened.”',
          score: 0.2,
          reply: [
            { who: 'tobias', text: 'Hold on. Have we checked we don’t act for Bloom?' },
          ],
          lesson:
            'Hearing confidential facts before a conflict check can stop the firm acting at all.',
        },
      ],
    },
    {
      id: 'conflict-clear',
      kind: 'say',
      who: 'sunita',
      gesture: 'talk',
      text: 'Conflict check is clear: we have never acted for Bloom Wholesale or anyone connected to them.',
    },
    {
      id: 'identity',
      kind: 'choose',
      prompt: 'Asha is a new client. What comes before advice?',
      points: 10,
      options: [
        {
          id: 'id-letter',
          label:
            'Check her identity and her business’s details, and explain that we will send an engagement letter setting out our terms and fees before we advise.',
          score: 1,
          reply: [
            {
              who: 'asha',
              text: 'Of course. I brought my passport and the company papers.',
              gesture: 'reach',
            },
          ],
          lesson:
            'Identity checks and an engagement letter come before advice: the rules and the client both expect it.',
        },
        {
          id: 'skip',
          label: 'Skip the paperwork: she’s clearly genuine.',
          score: 0.1,
          reply: [{ who: 'tobias', text: 'We verify every new client. No exceptions.' }],
          lesson:
            'Client identity checks are a legal requirement, however genuine someone seems.',
        },
      ],
    },
    {
      id: 'listen',
      kind: 'choose',
      prompt: 'Now hear the facts.',
      points: 10,
      options: [
        {
          id: 'open',
          label: '“Please take me through what happened, from the order to the wedding.”',
          score: 1,
          reply: [
            {
              who: 'asha',
              text: 'I ordered Grade A roses for the fourteenth. They came on the twelfth, already drooping. I emailed Bloom that evening with photos. They said roses are “natural products”.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Open questions let the client tell the story; you will hear facts you did not think to ask about.',
        },
        {
          id: 'leading',
          label: '“They were obviously faulty, weren’t they?”',
          score: 0.3,
          reply: [{ who: 'asha', text: 'Yes… I mean, I think so.' }],
          lesson:
            'Leading questions put your words in the client’s mouth and miss the detail.',
        },
      ],
    },
    {
      id: 'document',
      kind: 'exhibit',
      who: 'tobias',
      prompt: 'Tobias: “Which document shows what quality was agreed?”',
      points: 15,
      items: ['invoice', 'order', 'post'],
      correct: 'order',
      right: [
        {
          who: 'tobias',
          text: 'Grade A, 50 cm, fresh within 48 hours, and she complained in writing within 7 days. That’s our case.',
          gesture: 'talk',
        },
      ],
      wrong: [
        { who: 'tobias', text: 'That shows what was paid, not what was promised.' },
      ],
      lesson:
        'The contract terms (here the order confirmation) define what was promised.',
    },
    {
      id: 'win',
      kind: 'choose',
      who: 'asha',
      prompt: 'Asha: “Will I definitely win?”',
      points: 15,
      options: [
        {
          id: 'honest',
          label:
            '“You have a good case: the order promised Grade A fresh roses and you complained in time. But nothing is certain, and court has costs and risks. Let’s try to settle it first.”',
          score: 1,
          reply: [
            {
              who: 'asha',
              text: 'That’s fair. I’d rather not go to court if I can help it.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Give an honest view of strength, risk and cost; never promise an outcome.',
        },
        {
          id: 'promise',
          label: '“Definitely. This is an easy win.”',
          score: 0,
          reply: [
            {
              who: 'tobias',
              text: 'We never promise outcomes, Asha. Let me be clear about the risks.',
            },
          ],
          effects: { trust: { senior: -2 } },
          lesson:
            'Promising a result is unprofessional and sets the client up for disappointment.',
        },
        {
          id: 'refuse',
          label: '“I can’t say anything about that.”',
          score: 0.3,
          reply: [{ who: 'asha', text: 'Then why am I here?' }],
          lesson: 'Clients need a view; give one honestly, with its uncertainty.',
        },
      ],
    },
    {
      id: 'next',
      kind: 'choose',
      prompt: 'What is the right next step?',
      points: 15,
      options: [
        {
          id: 'letter',
          label:
            'Send Bloom a letter before claim: the facts, the terms broken, a refund of £2,400, and 14 days to respond. Keep the photos and emails safe, and don’t post about it online.',
          score: 1,
          reply: [
            {
              who: 'tobias',
              text: 'Good. The court expects a letter before claim first.',
              gesture: 'talk',
            },
            { who: 'asha', text: 'I’ll delete that post I drafted, then.' },
          ],
          lesson:
            'A letter before claim gives the other side a chance to settle, as the court expects.',
        },
        {
          id: 'issue',
          label: 'Issue a court claim tomorrow.',
          score: 0.3,
          reply: [
            {
              who: 'tobias',
              text: 'Not before a letter before claim: the court would penalise us on costs.',
            },
          ],
          lesson:
            'Going straight to court without a letter before claim can cost the client.',
        },
        {
          id: 'post',
          label: 'Tell her to post her review online to put pressure on them.',
          score: 0,
          reply: [{ who: 'tobias', text: 'That could be defamatory. Absolutely not.' }],
          effects: { trust: { senior: -2 } },
          lesson: 'Public accusations can expose the client to a defamation claim.',
        },
      ],
    },
    {
      id: 'fees',
      kind: 'choose',
      who: 'asha',
      prompt: 'Asha: “And what will this cost me?”',
      points: 5,
      options: [
        {
          id: 'clear',
          label:
            'Explain the fixed fee for the letter, and that we will give a written estimate before any court step.',
          score: 1,
          reply: [{ who: 'asha', text: 'Clear. Thank you.', gesture: 'talk' }],
          lesson: 'Clients are entitled to clear information about costs, in advance.',
        },
        {
          id: 'vague',
          label: '“We’ll see how it goes.”',
          score: 0.2,
          reply: [{ who: 'asha', text: 'I need to know roughly…' }],
          lesson: 'Vague costs information breeds complaints.',
        },
      ],
    },
    {
      id: 'note',
      kind: 'speak',
      who: 'tobias',
      prompt:
        'Write the attendance note in your own words: checks done, the key facts, the document, the advice and the next step.',
      points: 15,
      minWords: 35,
      mentions: [
        ['conflict'],
        ['identity', 'ID', 'passport'],
        ['order confirmation', 'Grade A', '48 hours'],
        ['letter before claim', '14 days'],
      ],
      model:
        'Attendance: Asha Verma, Verma Florists. Conflict check clear; identity checked (passport, company papers). Bloom Wholesale supplied 300 roses (order BW-7731: Grade A, fresh within 48 hours) that arrived wilting; she complained in writing the same day. Advised a good case, not certain. Next step: letter before claim seeking £2,400 within 14 days; fixed fee explained.',
      good: [
        {
          who: 'tobias',
          text: 'A note anyone could pick up the file from. Well done.',
          gesture: 'talk',
        },
      ],
      weak: [
        {
          who: 'tobias',
          text: 'Record the checks and the advice: the file must show both.',
        },
      ],
      lesson:
        'Attendance notes record what was checked, said and agreed: the file’s memory.',
    },
    { id: 'end', kind: 'end' },
  ],
  outcomes: {
    excellent: {
      verdict: 'Instructed: a new client who trusts the firm',
      feedback:
        'Checks first, a clear story, honest advice and the right step. Asha has instructed us.',
      effects: { trust: { senior: 3, manager: 1 }, reputation: 3 },
    },
    good: {
      verdict: 'Instructed',
      feedback: 'A good first interview. Tighten up the checks and the note.',
      effects: { trust: { senior: 2 }, reputation: 1 },
    },
    pass: {
      verdict: 'Instructed, with corrections',
      feedback: 'I had to step in a few times. Let’s go through client care together.',
      effects: { trust: { senior: 1 } },
    },
    poor: {
      verdict: 'Interview taken over by the senior associate',
      feedback:
        'Several steps put the firm or the client at risk. Let’s review the interview checklist.',
      effects: { trust: { senior: -2 }, reputation: -1, wellbeing: { stress: 5 } },
    },
  },
  xp: 100,
  skills: { 'case-management': 25, 'customer-service': 20, 'professional-ethics': 15 },
}
