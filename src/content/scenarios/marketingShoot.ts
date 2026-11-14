/**
 * Digital Marketing: a product shoot on the studio's photo set with a
 * customer featuring in the post. Consent to use her photo, a stock image's
 * licence, labelling a paid post, alt text for accessibility, and replying
 * to an angry public comment. Fictional brand and people.
 */
import { SMART } from './looks'
import type { Scenario } from './types'

const SET = { x: 10.6, z: 3.0 }

export const PHOTO_SHOOT: Scenario = {
  id: 'mkt-photo-shoot',
  careerId: 'digital-marketing',
  title: 'The photo shoot and the post',
  summary:
    'Shoot and publish a post with a customer in it: consent, image rights, an ad label, alt text, and an angry comment.',
  workplace: 'studio',
  room: 'The content studio',
  minLevel: 1,
  player: { at: { x: 8.3, z: 3.0 }, faces: SET },
  camera: { from: [6.6, 3.4, 5.6], looks: [10.6, 1.2, 2.6] },
  cast: [
    {
      id: 'maya',
      name: 'Maya Chen',
      role: 'Customer, featuring in the post',
      look: SMART(2, 'bob', 0, '#f59e0b'),
      at: { x: 10.1, z: 4.15 },
      faces: { x: 8.6, z: 3.2 },
    },
    {
      id: 'leo',
      name: 'Leo Brennan',
      role: 'Senior Digital Marketer',
      look: SMART(3, 'side', 1, '#c2410c'),
      at: { x: 9.2, z: 5.2 },
      faces: { x: 8.6, z: 3.2 },
      personId: 'senior',
    },
    {
      id: 'sofia',
      name: 'Sofia Alvarez',
      role: 'Marketing Manager',
      look: SMART(4, 'bun', 0, '#be123c'),
      at: { x: 8.4, z: 1.35 },
      faces: { x: 8.6, z: 3.0 },
      personId: 'manager',
    },
  ],
  exhibits: [
    {
      id: 'release',
      title: 'Photo consent form',
      text: 'I agree to Cobalt Ridge using photographs of me on its website and social media for 2 years. I can withdraw consent at any time. Signed: ______',
    },
    {
      id: 'stock',
      title: 'Background image found online',
      text: 'City skyline, from a photographer’s portfolio site. “All rights reserved.”',
    },
    {
      id: 'brief',
      title: 'Post brief',
      text: 'Maya received a free consultation in return for featuring. Platforms: Instagram, LinkedIn.',
    },
  ],
  beats: [
    {
      id: 'hello',
      kind: 'say',
      who: 'maya',
      gesture: 'wave',
      text: 'Hi! I’m excited. Where do you want me?',
    },
    {
      id: 'consent',
      kind: 'choose',
      prompt: 'Before you take any photos of Maya…',
      points: 20,
      options: [
        {
          id: 'form',
          label:
            'Explain how the photos will be used and for how long, and ask her to read and sign the consent form, which says she can withdraw.',
          score: 1,
          reply: [
            {
              who: 'maya',
              text: 'Two years, website and social. That’s fine. Signed.',
              gesture: 'reach',
            },
          ],
          lesson:
            'Get informed, written consent before using someone’s image, and tell them how to withdraw.',
        },
        {
          id: 'assume',
          label: 'She came to the shoot, so she’s agreed: start shooting.',
          score: 0.1,
          reply: [
            {
              who: 'leo',
              text: 'We need her signed consent first. Turning up isn’t consent to every use.',
              gesture: 'talk',
            },
          ],
          lesson: 'Being present is not consent to publish someone’s image everywhere.',
        },
      ],
    },
    {
      id: 'background',
      kind: 'exhibit',
      who: 'leo',
      prompt:
        'Leo wants a city skyline behind Maya in the edit. Which image can’t we use?',
      points: 15,
      items: ['release', 'stock', 'brief'],
      correct: 'stock',
      right: [
        {
          who: 'leo',
          text: '“All rights reserved.” We’d need a licence. Let’s use one of our own shots.',
          gesture: 'talk',
        },
      ],
      wrong: [
        { who: 'leo', text: 'That’s fine. What about the skyline we found online?' },
      ],
      lesson:
        'Images found online are usually copyrighted: use your own, licensed or properly free images.',
    },
    {
      id: 'label',
      kind: 'choose',
      prompt: 'Maya got a free consultation for featuring. How is the post labelled?',
      points: 20,
      options: [
        {
          id: 'ad',
          label:
            'Label it clearly as an ad (#ad, at the start), because Maya received something in return.',
          score: 1,
          reply: [
            {
              who: 'sofia',
              text: 'Right: anything given in return makes it an advert. Clear labelling.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Posts where someone received payment or gifts must be clearly labelled as advertising.',
        },
        {
          id: 'none',
          label: 'No label: it looks more genuine without one.',
          score: 0,
          reply: [
            {
              who: 'sofia',
              text: 'That would mislead followers and break the advertising rules.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { manager: -2 } },
          lesson:
            'Hiding that a post is paid-for misleads people and breaks advertising rules.',
        },
      ],
    },
    {
      id: 'alt',
      kind: 'choose',
      who: 'leo',
      prompt: 'Leo: “What alt text should the photo have?”',
      points: 10,
      options: [
        {
          id: 'describe',
          label:
            '“Maya, smiling, holds a Cobalt Ridge budget planner at a bright studio table.”',
          score: 1,
          reply: [
            {
              who: 'leo',
              text: 'Describes what matters. Screen reader users get the post too.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Alt text describes what the image shows and why it matters, for people who can’t see it.',
        },
        {
          id: 'keywords',
          label: '“budget, finance, planner, best, buy now”',
          score: 0.1,
          reply: [{ who: 'leo', text: 'That’s keyword stuffing, not a description.' }],
          lesson: 'Alt text is for people, not for stuffing keywords.',
        },
      ],
    },
    {
      id: 'comment',
      kind: 'say',
      who: 'sofia',
      gesture: 'phone',
      text: 'The post’s live, and someone has commented: “Your consultant never called me back. Useless company.”',
    },
    {
      id: 'reply',
      kind: 'choose',
      prompt: 'An angry public comment on the post.',
      points: 15,
      options: [
        {
          id: 'help',
          label:
            'Reply publicly, briefly and politely: apologise, and invite them to send a private message so you can sort it out today. Then follow it up.',
          score: 1,
          reply: [
            {
              who: 'sofia',
              text: 'Good: calm in public, solved in private.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Answer complaints publicly with empathy, then solve them privately and follow up.',
        },
        {
          id: 'delete',
          label: 'Delete the comment.',
          score: 0.2,
          reply: [
            {
              who: 'leo',
              text: 'Deleting it usually makes people angrier, and others notice.',
            },
          ],
          lesson: 'Deleting genuine complaints tends to escalate them.',
        },
        {
          id: 'argue',
          label: 'Reply that they must have given the wrong number.',
          score: 0,
          reply: [
            {
              who: 'sofia',
              text: 'Never argue with a customer in public.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Public arguments damage the brand far more than the original complaint.',
        },
      ],
    },
    {
      id: 'caption',
      kind: 'speak',
      who: 'sofia',
      prompt: 'Write the post’s caption in your own words, with the ad label.',
      points: 20,
      minWords: 15,
      mentions: [['#ad', 'ad', 'advert']],
      model:
        '#ad Maya tried our free budget consultation and now plans her month in ten minutes. Want the same? Book yours via the link in our bio.',
      good: [
        { who: 'sofia', text: 'Clear, honest and labelled. Post it.', gesture: 'talk' },
      ],
      weak: [{ who: 'sofia', text: 'It needs the ad label up front.' }],
      lesson: 'A good caption is short, honest and clearly labelled when it is an ad.',
    },
    { id: 'end', kind: 'end' },
  ],
  outcomes: {
    excellent: {
      verdict: 'A legal, accessible post with happy customers',
      feedback:
        'Consent, image rights, labelling and a calm reply: a model campaign post.',
      effects: { trust: { manager: 3, senior: 2 }, reputation: 3 },
    },
    good: {
      verdict: 'Post published',
      feedback: 'Good shoot. A couple of details needed prompting.',
      effects: { trust: { manager: 2 }, reputation: 1 },
    },
    pass: {
      verdict: 'Post published, after corrections',
      feedback:
        'We got there, but some of it could have caused complaints. Let’s review.',
      effects: { trust: { manager: 1 } },
    },
    poor: {
      verdict: 'Post taken down',
      feedback: 'The post broke the rules we work to. Let’s go through them together.',
      effects: { trust: { manager: -2 }, reputation: -1, wellbeing: { stress: 5 } },
    },
  },
  xp: 100,
  skills: { copywriting: 20, 'content-strategy': 25, presentation: 15 },
}
