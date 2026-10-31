import type { AssignmentInput } from '../../schemas'

/**
 * Marketing 2 (Marketing Assistant): check the spring content calendar
 * against each channel's length limit, and write the launch email. Teaches:
 * LEN, VLOOKUP for rules, COUNTIF, and writing copy with one clear call to
 * action.
 */
const posts: Array<[string, string, string]> = [
  [
    '03 Mar',
    'X',
    'Spring is here, and so is our new advisory package. Book a free 30-minute review: cobaltridge.example/spring',
  ],
  [
    '04 Mar',
    'LinkedIn',
    'Is your finance team ready for the new reporting rules? Our spring advisory package gives growing businesses a clear plan, a dedicated adviser and a quarterly health check. Book a free 30-minute review this month and use code SPRING20 for 20% off your first quarter.',
  ],
  [
    '05 Mar',
    'Instagram',
    'Behind the scenes at Cobalt Ridge: coffee, spreadsheets and a lot of planning for spring. Meet the team that helps businesses grow.',
  ],
  [
    '06 Mar',
    'X',
    'Twenty years of helping businesses grow, and we are only getting started. This spring we are offering every new client a free 30-minute review with one of our senior advisers, a tailored plan for the year ahead and 20% off the first quarter with code SPRING20.',
  ],
  ['07 Mar', 'Email subject', 'Your free spring business review'],
  [
    '10 Mar',
    'LinkedIn',
    'Three signs your business has outgrown its spreadsheets: month-end takes a week, nobody trusts the numbers, and every report is a fire drill. Sound familiar? Talk to us.',
  ],
  [
    '11 Mar',
    'Email subject',
    'Last chance: book your free 30-minute spring review with a senior adviser before the end of March',
  ],
  [
    '12 Mar',
    'Instagram',
    'Spring offer: a free 30-minute business review with one of our advisers, a written action plan you can use straight away, and 20% off your first quarter with code SPRING20. Book through the link in our bio before the end of March. We would love to help your business grow this year.',
  ],
]

const limits: Array<[string, string]> = [
  ['X', '200'],
  ['LinkedIn', '700'],
  ['Instagram', '220'],
  ['Email subject', '60'],
]

const header = { bold: true, fill: 'gray' } as const
const last = posts.length + 1 // 9

export const contentCalendar: AssignmentInput = {
  id: 'content-calendar',
  version: 1,
  careerId: 'digital-marketing',
  levelId: 'marketing-assistant',
  order: 2,
  title: 'Content calendar and launch email',
  summary:
    'Check every planned post against its channel’s limit, then write the launch email.',
  estimatedMinutes: 35,
  from: 'manager',
  briefing: {
    subject: 'Spring launch: calendar check and the launch email',
    body: `Hi {name},

The spring campaign launches next week. {senior} has drafted the posts in the content calendar, but some may be too long for their channel. Our house-style limits are on the Limits sheet: shorter than the platforms allow, so posts stay readable and leave room for links.

Please:
• count the characters in each post, look up its channel’s limit, and flag anything too long,
• count the posts per channel and how many need shortening,
• write the **launch email** in Docs: a short, friendly email to existing clients announcing the spring offer: a free 30-minute review, 20% off the first quarter with code **SPRING20**, booked at **cobaltridge.example/spring**. One clear call to action.

Reply with both files when you’re done.

Sofia`,
  },
  whyItMatters:
    'Every channel has its limits, and a post that is cut off or rejected looks careless. Checking content systematically before launch, and writing copy with one clear call to action, are everyday skills in any marketing role.',
  objectives: [
    'Measure text with LEN and look up rules with VLOOKUP',
    'Flag content that breaks the rules',
    'Write short, persuasive copy with one call to action',
  ],
  steps: [
    {
      id: 'length',
      title: 'Check the lengths',
      instructions: `On **Calendar**, for rows 2 to ${last}:
- **D** characters: \`=LEN(C2)\`
- **E** limit: \`=VLOOKUP(B2, Limits!$A$2:$B$5, 2, FALSE)\`
- **F** check: \`=IF(D2<=E2, "OK", "Too long")\``,
    },
    {
      id: 'summary',
      title: 'Summarise',
      instructions: `On **Summary**, in B2 to B5: the number of posts for each channel, \`=COUNTIF(Calendar!$B$2:$B$${last}, A2)\`. In **B7**: how many are too long, \`=COUNTIF(Calendar!F2:F${last}, "Too long")\`.`,
    },
    {
      id: 'email',
      title: 'Write the launch email',
      instructions:
        'In **Docs**, open **Spring launch email**. Write a subject line, a greeting, two or three short paragraphs about the offer with the code SPRING20, and one call to action: book at cobaltridge.example/spring. 80 to 250 words.',
      hint: 'One reader, one message, one action. Say what they get, what it costs (nothing), and what to do next.',
    },
    {
      id: 'send',
      title: 'Hand it in',
      instructions:
        'Reply to {manager}’s email with the workbook and the email attached.',
    },
  ],
  workbook: {
    title: 'Spring content calendar',
    sheets: [
      {
        name: 'Calendar',
        columnWidths: { A: 70, B: 110, C: 420, D: 90, E: 70, F: 90 },
        cells: {
          A1: { input: 'Date', format: header },
          B1: { input: 'Channel', format: header },
          C1: { input: 'Post', format: header },
          D1: { input: 'Characters', format: { ...header, align: 'right' } },
          E1: { input: 'Limit', format: { ...header, align: 'right' } },
          F1: { input: 'Check', format: header },
          ...Object.fromEntries(
            posts.flatMap(([date, channel, text], i) => [
              [`A${i + 2}`, date],
              [`B${i + 2}`, channel],
              [`C${i + 2}`, text],
            ]),
          ),
        },
      },
      {
        name: 'Limits',
        columnWidths: { A: 130, B: 120 },
        cells: {
          A1: { input: 'Channel', format: header },
          B1: { input: 'Max characters', format: { ...header, align: 'right' } },
          ...Object.fromEntries(
            limits.flatMap(([channel, max], i) => [
              [`A${i + 2}`, channel],
              [`B${i + 2}`, max],
            ]),
          ),
        },
      },
      {
        name: 'Summary',
        columnWidths: { A: 200, B: 90 },
        cells: {
          A1: { input: 'Posts per channel', format: header },
          ...Object.fromEntries(limits.map(([channel], i) => [`A${i + 2}`, channel])),
          A7: { input: 'Posts too long', format: { bold: true } },
        },
      },
    ],
  },
  solution: {
    Calendar: Object.fromEntries(
      posts.flatMap((_, i) => {
        const r = i + 2
        return [
          [`D${r}`, `=LEN(C${r})`],
          [`E${r}`, `=VLOOKUP(B${r}, Limits!$A$2:$B$5, 2, FALSE)`],
          [`F${r}`, `=IF(D${r}<=E${r}, "OK", "Too long")`],
        ]
      }),
    ),
    Summary: {
      ...Object.fromEntries(
        limits.map((_, i) => [
          `B${i + 2}`,
          `=COUNTIF(Calendar!$B$2:$B$${last}, A${i + 2})`,
        ]),
      ),
      B7: `=COUNTIF(Calendar!F2:F${last}, "Too long")`,
    },
  },
  scenarios: [
    {
      description: 'Instagram allows longer captions this month',
      changes: { 'Limits!B4': '500' },
    },
  ],
  checks: [
    {
      id: 'lengths',
      type: 'values',
      title: 'Characters and limits',
      cells: [`Calendar!D2:E${last}`],
      requireFormula: true,
      points: 25,
      why: 'Every channel cuts off or rejects text over its limit.',
      hint: 'D2 =LEN(C2), E2 =VLOOKUP(B2, Limits!$A$2:$B$5, 2, FALSE), filled down.',
    },
    {
      id: 'checks',
      type: 'values',
      title: 'Posts flagged',
      cells: [`Calendar!F2:F${last}`],
      requireFormula: true,
      functions: ['IF'],
      points: 20,
      why: 'Flags tell the copywriter exactly which posts to shorten.',
      hint: 'F2 =IF(D2<=E2, "OK", "Too long"), filled down.',
    },
    {
      id: 'summary',
      type: 'values',
      title: 'Summary counts',
      cells: ['Summary!B2:B5', 'Summary!B7'],
      requireFormula: true,
      functions: ['COUNTIF', 'COUNTIFS'],
      points: 15,
      why: 'A quick summary shows the size of the fix before launch.',
      hint: 'B2 =COUNTIF(Calendar!$B$2:$B$9, A2) down to B5; B7 =COUNTIF(Calendar!F2:F9, "Too long").',
    },
    {
      id: 'data-unchanged',
      type: 'unchanged',
      title: 'Drafts left unchanged',
      cells: [`Calendar!A1:C${last}`, 'Limits!A1:B5'],
      points: 5,
      why: 'Flag the drafts for the copywriter; don’t rewrite them in the calendar.',
      hint: 'Use Undo or Version history to get the original values back.',
    },
  ],
  deliverables: [
    {
      kind: 'doc',
      title: 'Spring launch email',
      template: 'blank',
      checks: [
        {
          id: 'email-offer',
          type: 'mentions',
          title: 'The offer, the code and the link',
          terms: [
            ['SPRING20'],
            ['cobaltridge.example/spring'],
            ['free'],
            ['20%', '20 per cent', '20 percent'],
          ],
          points: 20,
          why: 'Every detail the reader needs to act must be there, exactly right.',
          hint: 'Mention the free review, 20% off with SPRING20, and the booking link.',
        },
        {
          id: 'email-action',
          type: 'mentions',
          title: 'A clear call to action',
          terms: [['book']],
          points: 10,
          why: 'An email without a clear next step does not convert.',
          hint: 'Ask the reader to book their review.',
        },
        {
          id: 'email-length',
          type: 'length',
          min: 80,
          max: 250,
          title: 'Short enough to read',
          points: 5,
          why: 'Most people read an email for a few seconds. Keep it short.',
          hint: 'Aim for 80 to 250 words.',
        },
      ],
    },
  ],
  passScore: 70,
  xp: 120,
  skills: { copywriting: 40, 'content-strategy': 25, formulas: 20, accuracy: 15 },
  feedback: {
    excellent: `Hi {name},

Calendar checked and the email is ready to send: clear, friendly and one call to action. I’m sending it on Monday.

Sofia`,
    good: `Hi {name},

Nearly there. A couple of details to fix; see the notes.

Sofia`,
    pass: `Hi {name},

Some checks or the email need more work before launch. The notes explain.

Sofia`,
    fail: `Hi {name},

Not ready yet. Start with the character counts, then write the email.

Sofia`,
  },
}
