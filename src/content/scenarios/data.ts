/**
 * Data Analysis: presenting findings at the insights wall to the sales
 * director and the marketing lead. Lead with the insight, resist reading
 * causation into a correlation, refuse to drop inconvenient data, answer on
 * sample size, pick the right chart, and make a recommendation the business
 * can act on. Fictional company data.
 */
import { SMART, SUIT } from './looks'
import type { Scenario } from './types'

const SCREENS = { x: 11.9, z: 4.0 }

export const FINDINGS: Scenario = {
  id: 'data-findings',
  careerId: 'data-analytics',
  title: 'Presenting findings to the sales director',
  summary:
    'Present the Q1 analysis at the insights wall: handle a causation question, a request to drop data, and land a recommendation.',
  workplace: 'insights',
  room: 'The insights wall',
  minLevel: 1,
  player: { at: { x: 9.9, z: 5.5 }, faces: SCREENS },
  camera: { from: [7.0, 3.0, 7.6], looks: [10.8, 1.3, 3.6] },
  cast: [
    {
      id: 'rachel',
      name: 'Rachel Stone',
      role: 'Sales Director',
      look: SUIT(2, 'bob', 1, '#7f1d1d', { tie: undefined }),
      at: { x: 9.55, z: 2.55 },
      faces: { x: 10.6, z: 4.2 },
    },
    {
      id: 'jay',
      name: 'Jay Patel',
      role: 'Marketing Lead',
      look: SMART(4, 'short', 0, '#0369a1'),
      at: { x: 10.75, z: 2.45 },
      faces: { x: 10.2, z: 4.6 },
    },
    {
      id: 'amara',
      name: 'Amara Nwosu',
      role: 'Head of Data & Insights',
      look: SMART(6, 'curly', 0, '#4d7c0f'),
      at: { x: 10.95, z: 6.4 },
      faces: { x: 10.2, z: 4.6 },
      personId: 'manager',
    },
  ],
  exhibits: [
    {
      id: 'line',
      title: 'Line chart: weekly sales, Jan–Mar',
      text: 'Sales flat at about £82k a week until week 8, then about £97k a week. The email campaign started in week 8; a competitor closed in week 7.',
    },
    {
      id: 'pie',
      title: 'Pie chart: sales by region',
      text: 'North 31%, South 27%, East 22%, West 20%.',
    },
    {
      id: 'table',
      title: 'Table: test vs control regions (pilot)',
      text: 'Pilot in 2 regions only (n = 2 vs 2). Uplift 18% vs 12%.',
    },
  ],
  beats: [
    {
      id: 'open',
      kind: 'say',
      who: 'rachel',
      gesture: 'talk',
      text: 'I’ve got fifteen minutes. What did you find?',
    },
    {
      id: 'lead',
      kind: 'choose',
      prompt: 'How do you open?',
      points: 10,
      options: [
        {
          id: 'insight',
          label:
            'Lead with the answer: “Sales rose 18% from week 8 and stayed there. Two things changed that week, so we can’t yet say which caused it. I’ll recommend how to find out.”',
          score: 1,
          reply: [
            { who: 'rachel', text: 'Good, straight to it. Go on.', gesture: 'talk' },
          ],
          lesson: 'Busy decision-makers want the answer first, then the evidence.',
        },
        {
          id: 'method',
          label: 'Walk through the data cleaning steps first, then the results.',
          score: 0.3,
          reply: [{ who: 'rachel', text: 'Can we skip to what it means?' }],
          lesson: 'Method matters, but it supports the finding; it does not lead.',
        },
      ],
    },
    {
      id: 'show',
      kind: 'exhibit',
      who: 'rachel',
      prompt: 'Show the chart that tells the story over time.',
      points: 10,
      items: ['pie', 'line', 'table'],
      correct: 'line',
      right: [
        { who: 'rachel', text: 'Clear step up at week 8. I see it.', gesture: 'talk' },
      ],
      wrong: [{ who: 'rachel', text: 'That doesn’t show change over time.' }],
      lesson:
        'Change over time needs a line chart; a pie only shows shares at one moment.',
    },
    {
      id: 'claim',
      kind: 'say',
      who: 'jay',
      gesture: 'present',
      text: 'So the email campaign caused the increase. That’s what I’ll tell the board.',
    },
    {
      id: 'causation',
      kind: 'choose',
      prompt: 'The campaign and a competitor closing both happened around week 8.',
      points: 20,
      options: [
        {
          id: 'careful',
          label:
            '“The timing fits, but a competitor also closed in week 7. The data shows they happened together, not that the campaign caused it. A test in some regions and not others would tell us.”',
          score: 1,
          reply: [
            {
              who: 'jay',
              text: 'Fair. I’d rather not overclaim to the board.',
              gesture: 'talk',
            },
            { who: 'amara', text: 'Exactly the right caution.' },
          ],
          lesson:
            'Correlation is not causation: name the other explanation, and suggest how to test.',
        },
        {
          id: 'agree',
          label: '“Yes, the campaign drove it.”',
          score: 0,
          reply: [
            {
              who: 'amara',
              text: 'We can’t say that. The competitor closed the same week.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { manager: -2 } },
          lesson: 'Agreeing to please a stakeholder turns analysis into opinion.',
        },
      ],
    },
    {
      id: 'outliers-ask',
      kind: 'say',
      who: 'rachel',
      gesture: 'talk',
      text: 'The West numbers drag the average down. Can you take them out so the growth looks stronger?',
    },
    {
      id: 'outliers',
      kind: 'choose',
      prompt: 'West is real data: one large customer left in February.',
      points: 20,
      options: [
        {
          id: 'keep',
          label:
            'Keep West in: it’s real, and removing it would mislead. Show West separately with the reason (one large customer left), so the picture is honest and complete.',
          score: 1,
          reply: [
            { who: 'rachel', text: 'Fine. Show it separately, then.', gesture: 'talk' },
          ],
          effects: { reputation: 2 },
          lesson:
            'Only remove data that is wrong, never data that is inconvenient; explain it instead.',
        },
        {
          id: 'remove',
          label: 'Take West out quietly.',
          score: 0,
          reply: [
            {
              who: 'amara',
              text: 'We don’t remove real data to flatter the result.',
              gesture: 'talk',
            },
          ],
          effects: { trust: { manager: -3 }, reputation: -2 },
          lesson: 'Cherry-picking data destroys trust in every number you produce.',
        },
      ],
    },
    {
      id: 'pilot',
      kind: 'say',
      who: 'jay',
      gesture: 'talk',
      text: 'The pilot showed 18% against 12%. That proves it, surely?',
    },
    {
      id: 'sample',
      kind: 'choose',
      prompt: 'The pilot compared two regions with two.',
      points: 15,
      options: [
        {
          id: 'small',
          label:
            '“It’s encouraging, but two regions against two is too few to rule out chance. A larger test, with regions chosen at random, would give a reliable answer.”',
          score: 1,
          reply: [{ who: 'jay', text: 'Okay. How many would we need?', gesture: 'talk' }],
          lesson:
            'Small samples can show big differences by chance: be clear about uncertainty.',
        },
        {
          id: 'proves',
          label: '“Yes, a six-point gap is big.”',
          score: 0.2,
          reply: [
            { who: 'amara', text: 'With four regions, that gap could easily be chance.' },
          ],
          lesson: 'The size of a gap means little without enough data behind it.',
        },
      ],
    },
    {
      id: 'meeting-decision',
      kind: 'choose',
      who: 'rachel',
      prompt:
        'Rachel points at your client-concentration slide: “Those three are our best clients; there’s no risk, take that slide out.”',
      points: 15,
      options: [
        {
          id: 'evidence',
          label:
            'Keep it, calmly: agree they are valuable, and show that losing one would cut revenue by at least 14%',
          score: 1,
          reply: [
            {
              who: 'amara',
              text: 'Good answer. You respect the point and stand by the evidence: that is what leaders need from an analyst.',
              gesture: 'talk',
            },
          ],
          lesson:
            'You respect the point and stand by the evidence: that is what leaders need from an analyst.',
        },
        {
          id: 'remove',
          label: 'Take the slide out to avoid conflict',
          score: 0,
          reply: [
            {
              who: 'amara',
              text: 'Hiding a real risk to please someone is how organisations get surprised.',
              gesture: 'talk',
            },
          ],
          lesson:
            'Hiding a real risk to please someone is how organisations get surprised.',
        },
        {
          id: 'argue',
          label: 'Tell the director they are wrong',
          score: 0.4,
          reply: [
            {
              who: 'amara',
              text: 'The evidence is on your side, but winning the argument matters less than being heard.',
              gesture: 'talk',
            },
          ],
          lesson:
            'The evidence is on your side, but winning the argument matters less than being heard.',
        },
      ],
    },
    {
      id: 'recommend',
      kind: 'speak',
      who: 'rachel',
      prompt: 'Rachel: “So what do you recommend?” Say it in your own words.',
      points: 25,
      minWords: 30,
      mentions: [
        ['test', 'trial', 'experiment'],
        ['random', 'control', 'compare'],
        ['competitor', 'cause', 'caus'],
        ['West'],
      ],
      model:
        'I recommend an eight-week test: run the campaign in half the regions, chosen at random, with the others as a control. That separates the campaign’s effect from the competitor closing. Meanwhile, report growth with West shown separately, because one customer leaving explains its fall.',
      good: [
        {
          who: 'rachel',
          text: 'That I can take to the board. Let’s fund the test.',
          gesture: 'talk',
        },
      ],
      weak: [{ who: 'rachel', text: 'I need something specific to decide on.' }],
      lesson: 'A recommendation says what to do, why, and how you will know it worked.',
    },
    { id: 'end', kind: 'end' },
  ],
  outcomes: {
    excellent: {
      verdict: 'Recommendation accepted: the director funds a proper test',
      feedback: 'Clear, honest and useful. That’s how analysis earns trust.',
      effects: { trust: { manager: 3 }, reputation: 3 },
    },
    good: {
      verdict: 'Findings accepted',
      feedback: 'Good presentation. Be firmer on what the data can’t tell us.',
      effects: { trust: { manager: 2 }, reputation: 1 },
    },
    pass: {
      verdict: 'Findings accepted with reservations',
      feedback:
        'Some claims went beyond the data. Let’s practise presenting uncertainty.',
      effects: { trust: { manager: 1 } },
    },
    poor: {
      verdict: 'Presentation taken over by the head of data',
      feedback:
        'We overclaimed and dropped data. Let’s go through the principles together.',
      effects: { trust: { manager: -2 }, reputation: -1, wellbeing: { stress: 5 } },
    },
  },
  xp: 110,
  skills: { 'insight-communication': 30, 'data-analysis': 20, 'data-visualisation': 10 },
  caseLink: {
    caseId: 'mtg-data-review',
    answers: [
      {
        beat: 'meeting-decision',
        step: 'pressure',
        options: { evidence: 'evidence', remove: 'remove', argue: 'argue' },
      },
    ],
  },
}
