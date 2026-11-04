/**
 * Using AI at work: three cases every career gets, from the player's manager.
 * They practise what matters most when AI is part of the job: checking an AI
 * answer against the facts (it can be confidently wrong), keeping personal
 * and confidential data out of AI tools, and writing prompts that get useful
 * answers. Graded like every case.
 */
import type { CaseInput } from '../schema'

const FROM = {
  name: '{managerFull}',
  role: 'Manager',
  organisation: 'Cobalt Ridge Consulting',
  personId: 'manager',
}

function verify(careerId: string): CaseInput {
  return {
    id: `${careerId}-ai-verify`,
    version: 1,
    careerId,
    kind: 'internal',
    title: 'Check an AI summary before it goes to the board',
    summary: 'A colleague drafted a sales summary with an AI tool. Is it right?',
    from: FROM,
    trigger: { fromDay: 2 },
    deadlineHours: 6,
    email: {
      subject: 'Quick check before the board pack goes out',
      body: `Hi {name},

Jordan drafted this quarter's sales summary with an AI tool, and it reads well. Before it goes into the board pack, can you check it against the figures? AI tools can sound very sure of things that are not in the data.

Let me know what you find, and what you would change.

Thanks,
{manager}`,
    },
    whyItMatters:
      'AI tools write fluent, confident text, and sometimes include figures or claims that are not in the data (often called hallucinations). Whoever sends the work is responsible for it, so every figure and claim is checked against the source before it goes out.',
    objectives: [
      'Check AI-generated claims against the source data',
      'Spot invented and wrong statements',
      'Decide what to do before AI-assisted work is shared',
    ],
    evidence: [
      {
        id: 'sales',
        title: 'Q1 sales by region (from the sales system)',
        text: 'There is no figure for the previous quarter in this report.',
        table: {
          head: ['Region', 'Q1 sales'],
          rows: [
            ['North', '£42,000'],
            ['South', '£38,500'],
            ['East', '£51,200'],
            ['West', '£29,800'],
            ['Total', '£161,500'],
          ],
        },
      },
      {
        id: 'summary',
        title: 'The AI-drafted summary',
        text: '"Q1 sales totalled £161,500. East was the strongest region with £51,200, while South was the weakest. West grew 12% on the previous quarter. Average sales per region were £40,375."',
      },
    ],
    steps: [
      {
        id: 'claims',
        kind: 'review',
        title: 'Check each claim',
        prompt: 'Which statements in the AI summary are problems?',
        points: 30,
        findings: [
          {
            id: 'total',
            text: 'Q1 sales totalled £161,500.',
            issue: false,
            why: 'The total matches the sales system.',
          },
          {
            id: 'weakest',
            text: 'South was the weakest region.',
            issue: true,
            why: 'West (£29,800) is the weakest, not South (£38,500).',
          },
          {
            id: 'growth',
            text: 'West grew 12% on the previous quarter.',
            issue: true,
            why: 'The report has no previous-quarter figures: the AI made this up.',
          },
          {
            id: 'average',
            text: 'Average sales per region were £40,375.',
            issue: false,
            why: '£161,500 across 4 regions is £40,375.',
          },
        ],
      },
      {
        id: 'gap',
        kind: 'figure',
        title: 'Check a figure yourself',
        prompt:
          'How much higher were the strongest region’s sales than the weakest region’s?',
        points: 20,
        answer: 21400,
        tolerance: 0.5,
        unit: '£',
        why: 'East £51,200 minus West £29,800 is £21,400.',
      },
      {
        id: 'next',
        kind: 'decide',
        title: 'Before it goes out',
        prompt: 'What should happen to the summary now?',
        points: 25,
        options: [
          {
            id: 'correct',
            label:
              'Correct the two wrong claims, check every other figure against the data, and tell {manager} it was drafted with AI and checked',
            verdict: 'best',
            why: 'The work is right, the source is checked, and everyone knows how it was made.',
            effects: { indicators: { risk: -2 } },
          },
          {
            id: 'send',
            label: 'Send it as it is: it reads well and AI tools are usually right',
            verdict: 'poor',
            why: 'The board would get a wrong claim and an invented figure, and the company would rely on them.',
            effects: { indicators: { risk: 4 } },
          },
          {
            id: 'rewrite',
            label: 'Delete it and write the summary from scratch without AI',
            verdict: 'acceptable',
            why: 'Safe, but slower than correcting a mostly good draft: AI is useful when its output is checked.',
          },
        ],
      },
      {
        id: 'reply',
        kind: 'reply',
        to: '{managerFull}',
        title: 'Tell {manager} what you found',
        prompt: 'Explain what is wrong in the summary and what you have done about it.',
        points: 25,
        minWords: 40,
        model:
          'Hi {manager}, I checked the summary against the sales figures. The total and the average are right, but West, not South, was the weakest region, and the 12% growth for West is not in the data at all, so the AI invented it. I have corrected both and checked every other figure against the report. Thanks, {name}',
        mentions: [
          ['West', 'weakest'],
          ['12%', 'growth', 'not in the data', 'no data', 'invented', 'made up'],
          ['checked', 'verified', 'against the'],
        ],
        avoid: [
          {
            terms: ['jordan is careless', 'jordan’s fault', "jordan's fault"],
            why: 'Focus on the work, not the person: checking AI output is the whole team’s job.',
          },
        ],
      },
    ],
    outcomes: {
      pass: { trust: { manager: 2 }, reputation: 1, indicators: { risk: -1 } },
      fail: { indicators: { risk: 2 } },
      lapse: { indicators: { risk: 2 }, reputation: -1 },
    },
    replies: {
      excellent: `Thanks, {name}. Exactly what I hoped you would catch: the invented growth figure would have been embarrassing in front of the board. I have asked the team to check AI drafts the same way.

{manager}`,
      good: `Thanks, {name}. Good catch on the figures; I will make sure the corrected version goes in.

{manager}`,
      pass: `Thanks, {name}. I will look over the rest before it goes out.

{manager}`,
      fail: `Thanks, {name}. I went through it again and there are still problems in it. Let's look at how to check AI drafts together.

{manager}`,
    },
    lapseLog: 'The AI-drafted sales summary went out unchecked.',
    skills: { 'ai-use': 40 },
    xp: 60,
  }
}

function privacy(careerId: string): CaseInput {
  return {
    id: `${careerId}-ai-privacy`,
    version: 1,
    careerId,
    kind: 'internal',
    title: 'What can go into an AI tool?',
    summary: 'A colleague wants to paste work data into a free chatbot.',
    from: FROM,
    trigger: { afterCase: `${careerId}-ai-verify`, fromDay: 3 },
    deadlineHours: 6,
    email: {
      subject: 'Using AI tools with our data',
      body: `Hi {name},

Jordan asked whether they can paste some of our files into a free online chatbot to save time. You have been using WorkSim AI well, so could you help them with what is and is not OK? Our policy is attached.

Thanks,
{manager}`,
    },
    whyItMatters:
      'What you type into an AI tool may be stored, reviewed or used to train it, depending on the tool. Personal data about customers and colleagues, passwords and confidential client information must stay out of tools the company has not approved, and should be removed or anonymised even in approved ones whenever it is not needed.',
    objectives: [
      'Recognise personal and confidential information',
      'Apply a company AI policy',
      'Use AI safely by anonymising data',
    ],
    evidence: [
      {
        id: 'policy',
        title: 'Cobalt Ridge AI policy (extract)',
        text: 'Use only the approved assistant (WorkSim AI) for company work. Never enter into any AI tool: personal data about customers or colleagues (names with contact details, salaries, health), passwords, or confidential client information. Remove or anonymise personal details before asking for help. You are responsible for checking AI output before using it.',
      },
      {
        id: 'files',
        title: 'What Jordan wants to paste into the chatbot',
        text: 'The files are listed in the step below.',
      },
    ],
    steps: [
      {
        id: 'files',
        kind: 'review',
        title: 'Which of these must not go into the free chatbot?',
        prompt: 'Tick everything that must not be pasted into an unapproved AI tool.',
        points: 35,
        findings: [
          {
            id: 'customers',
            text: 'The customer list, with names, email addresses and phone numbers',
            issue: true,
            why: 'Personal data about customers: never into an AI tool, and certainly not an unapproved one.',
          },
          {
            id: 'salaries',
            text: 'The team’s salary spreadsheet',
            issue: true,
            why: 'Colleagues’ pay is personal and confidential.',
          },
          {
            id: 'merger',
            text: 'Notes on a client’s merger that has not been announced',
            issue: true,
            why: 'Confidential client information: a leak could harm the client and break our contract.',
          },
          {
            id: 'prices',
            text: 'Our published price list',
            issue: false,
            why: 'It is already public.',
          },
          {
            id: 'totals',
            text: 'Sales totals by region, with no names',
            issue: false,
            why: 'Aggregated figures with no personal data are fine in the approved tool.',
          },
        ],
      },
      {
        id: 'complaint',
        kind: 'decide',
        title: 'A complaint reply',
        prompt:
          'Jordan wants AI help replying to a customer complaint that includes the customer’s name, address and order number. What should they do?',
        points: 30,
        options: [
          {
            id: 'anonymise',
            label:
              'Use WorkSim AI, the approved tool, with the name, address and order number removed, then add the details back in the final reply',
            verdict: 'best',
            why: 'They get the help without sharing anything personal.',
          },
          {
            id: 'paste',
            label: 'Paste the complaint as it is into the free chatbot: it is quicker',
            verdict: 'poor',
            why: 'The customer’s personal data would go to a tool the company has not approved.',
            effects: { indicators: { risk: 4 } },
          },
          {
            id: 'never',
            label: 'Never use AI for anything involving customers',
            verdict: 'acceptable',
            why: 'Safe, but unnecessary: anonymised, in the approved tool, AI can help.',
          },
        ],
      },
      {
        id: 'reply',
        kind: 'reply',
        to: 'Jordan Lee',
        title: 'Reply to Jordan',
        prompt:
          'Explain to Jordan what they can and cannot put into AI tools, and how to do it safely.',
        points: 35,
        minWords: 40,
        model:
          'Hi Jordan, please do not paste the customer list, the salary spreadsheet or the client merger notes into any AI tool: they contain personal and confidential data. Use WorkSim AI, the approved tool, and remove names, contact details and order numbers first; public information like the price list is fine. Thanks, {name}',
        mentions: [
          ['personal', 'confidential', 'customer details', 'salaries', 'salary'],
          ['approved', 'WorkSim AI', 'policy'],
          ['remove', 'anonymis', 'without names', 'take out'],
        ],
      },
    ],
    outcomes: {
      pass: { trust: { manager: 2 }, reputation: 1, indicators: { risk: -2 } },
      fail: { indicators: { risk: 3 } },
      lapse: { indicators: { risk: 3 } },
    },
    replies: {
      excellent: `Thanks, {name}. Jordan forwarded me your note: clear and practical. I will share it with the team.

{manager}`,
      good: `Thanks, {name}. That is the right advice.

{manager}`,
      pass: `Thanks, {name}. I will add a few points when I next talk to Jordan.

{manager}`,
      fail: `Thanks, {name}. Some of that would still put personal data at risk. Please read the policy again and let's talk.

{manager}`,
    },
    lapseLog: 'Nobody answered Jordan about AI tools and company data.',
    skills: { 'ai-use': 40 },
    xp: 60,
  }
}

function prompting(careerId: string): CaseInput {
  return {
    id: `${careerId}-ai-prompt`,
    version: 1,
    careerId,
    kind: 'internal',
    title: 'Write a prompt that works',
    summary: 'Help the team get better answers from WorkSim AI.',
    from: FROM,
    trigger: { afterCase: `${careerId}-ai-privacy`, fromDay: 4 },
    deadlineHours: 6,
    email: {
      subject: 'Getting better answers from WorkSim AI',
      body: `Hi {name},

Some of the team say WorkSim AI gives them vague answers. I suspect it is how they ask. Could you look at a few prompts and suggest better ones? A short example we can all copy would help.

Thanks,
{manager}`,
    },
    whyItMatters:
      'An AI model only knows what it is told. Good prompts say what is wanted (the task), give the facts it depends on (the context), and say what a good answer looks like (format, length, tone, audience). The difference in quality is large, and it saves rounds of follow-up questions.',
    objectives: [
      'Recognise what makes a prompt work',
      'Give an AI tool the context it needs',
      'Write a clear, specific prompt',
    ],
    evidence: [
      {
        id: 'need',
        title: 'What {manager} needs',
        text: 'A summary of a supplier’s email for the board: three bullet points, formal tone, covering the price change and the new delivery date.',
      },
    ],
    steps: [
      {
        id: 'best',
        kind: 'decide',
        title: 'Choose the best prompt',
        prompt: 'Which prompt is most likely to get what {manager} needs first time?',
        points: 30,
        options: [
          {
            id: 'specific',
            label:
              'Summarise the attached supplier email for the board in three bullet points, in a formal tone, covering the price change and the new delivery date.',
            verdict: 'best',
            why: 'It has the task, the context, the audience, the format and what to cover.',
          },
          {
            id: 'short',
            label: 'Summarise this.',
            verdict: 'poor',
            why: 'No audience, format or focus: the answer will be generic.',
          },
          {
            id: 'vague',
            label: 'Write something good about the supplier for the board.',
            verdict: 'poor',
            why: '"Something good" is not a task, and the email is not given as context.',
          },
        ],
      },
      {
        id: 'missing',
        kind: 'review',
        title: 'What is missing?',
        prompt:
          'A colleague asked: "Tell me about delivery problems." Which of these are problems with that prompt?',
        points: 30,
        findings: [
          {
            id: 'context',
            text: 'It gives no context: which deliveries, which customer, what data',
            issue: true,
            why: 'Without the facts, the AI can only guess or invent.',
          },
          {
            id: 'format',
            text: 'It does not say what form the answer should take',
            issue: true,
            why: 'A list of causes, a reply to a customer and a report need different answers.',
          },
          {
            id: 'audience',
            text: 'It does not say who the answer is for',
            issue: true,
            why: 'An answer for a customer and one for the operations team differ.',
          },
          {
            id: 'question',
            text: 'It is phrased as a request rather than a question',
            issue: false,
            why: 'Requests and questions both work; what matters is what they contain.',
          },
        ],
      },
      {
        id: 'own',
        kind: 'reply',
        to: '{managerFull}',
        title: 'Write an example prompt',
        prompt:
          'Write a prompt the team could use to ask WorkSim AI to draft a polite reply to a customer whose delivery is late.',
        points: 40,
        minWords: 25,
        model:
          'Draft a short, polite reply to the customer email shared below, whose delivery is two days late. Apologise, give the new delivery date, and offer free delivery on their next order. Professional tone, under 120 words, for a customer we want to keep.',
        mentions: [
          ['draft', 'write', 'reply'],
          ['polite', 'apolog', 'professional', 'tone'],
          ['late', 'delay', 'delivery date', 'new date'],
          ['words', 'short', 'brief', 'paragraph', 'sentences', 'bullet'],
        ],
      },
    ],
    outcomes: {
      pass: { trust: { manager: 2 }, reputation: 1 },
      fail: {},
      lapse: { reputation: -1 },
    },
    replies: {
      excellent: `Thanks, {name}. That example is going on the team wiki. Clear and easy to copy.

{manager}`,
      good: `Thanks, {name}. Useful: I will share it.

{manager}`,
      pass: `Thanks, {name}. That helps a bit; I will add some detail before I share it.

{manager}`,
      fail: `Thanks, {name}. The team would still get vague answers with that. Have another look at what the best prompt included.

{manager}`,
    },
    lapseLog: 'The team’s prompting tips never arrived.',
    skills: { 'ai-use': 40 },
    xp: 60,
  }
}

/** The AI cases for one career. */
export function aiCases(careerId: string): CaseInput[] {
  return [verify(careerId), privacy(careerId), prompting(careerId)]
}
