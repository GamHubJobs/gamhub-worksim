/**
 * Interdepartmental workflows: information arrives from one department, the
 * player does their part, and hands it on to the next in the form that
 * department needs. If the hand-off was wrong, the next department comes back
 * later with the problem it caused (a follow-up case to put right). A correct
 * hand-off simply works.
 */
import type { CaseInput } from './schema'

const replies = (sender: string, done: string, wrong: string) => ({
  excellent: `Hi {name},

${done}

${sender}`,
  good: `Hi {name},

Thanks, nearly all of it was right.

${sender}`,
  pass: `Hi {name},

Thanks. ${wrong}

${sender}`,
  fail: `Hi {name},

${wrong} Can you look at it again?

${sender}`,
})

const followUpReplies = (sender: string) => ({
  excellent: `Hi {name},

Thank you for sorting it out so quickly, and for being straight about what happened.

${sender}`,
  good: `Hi {name},

Thanks, that’s fixed.

${sender}`,
  pass: `Hi {name},

OK. Let’s make sure it doesn’t happen again.

${sender}`,
  fail: `Hi {name},

This still isn’t resolved.

${sender}`,
})

// ---------------------------------------------------------------------------
// IT Help Desk: onboarding from People & Culture
// ---------------------------------------------------------------------------

const itOnboarding: CaseInput = {
  id: 'wf-it-onboarding',
  version: 1,
  careerId: 'it-support',
  kind: 'workflow',
  minLevel: 2,
  title: 'A new starter from People & Culture',
  summary: 'HR has sent a new starter’s details. Set up what IT and Facilities need.',
  from: {
    name: 'Grace Okafor',
    role: 'People & Culture Partner',
    organisation: 'People & Culture',
    personId: 'hr',
  },
  trigger: { afterAssignment: 'recurring-problem' },
  deadlineHours: 7,
  email: {
    subject: 'New starter: Priyanka Shah, Monday',
    body: `Hi,

Priyanka Shah joins **Data & Insight** on **Monday** as a Data Analyst. Her form is attached. Can IT get her account, equipment and access ready, and pass the hardware order to Facilities?

Grace`,
  },
  whyItMatters:
    'A new starter’s first day depends on several departments passing the right details to each other. One wrong field on a hand-off (a wrong team, a missing access group, the wrong laptop) means a lost first week.',
  objectives: [
    'Read a hand-off from another department carefully',
    'Spot a conflict between two sources',
    'Pass on exactly what the next department needs',
  ],
  evidence: [
    {
      id: 'form',
      title: 'New starter form (People & Culture)',
      table: {
        head: ['Field', 'Value'],
        rows: [
          ['Name', 'Priyanka Shah'],
          ['Job title', 'Data Analyst'],
          ['Team', 'Data & Insight'],
          ['Manager', 'Amara Nwosu'],
          ['Start date', 'Monday 7 April'],
          ['Equipment', 'Standard laptop'],
          ['Access', 'Data & Insight shared drive, BI tool'],
        ],
      },
    },
    {
      id: 'standards',
      title: 'IT equipment standards',
      text: 'Standard laptop: office work. **Analyst laptop** (more memory): anyone in Data & Insight or Engineering, because of the size of the datasets. Every new account goes in the **All staff** group as well as the team group.',
    },
    {
      id: 'manager',
      title: 'Note from Amara Nwosu (manager)',
      text: 'Priyanka will also need **Data Studio**, like the rest of the team.',
    },
  ],
  steps: [
    {
      id: 'handoff',
      kind: 'handoff',
      title: 'The set-up and the hardware order',
      prompt:
        'Complete the set-up record that goes to Facilities and the directory team.',
      to: 'Facilities (hardware) and Directory administration',
      points: 70,
      fields: [
        {
          id: 'username',
          label: 'Username (first initial and surname, lower case)',
          kind: 'text',
          accept: ['pshah'],
          why: 'The naming standard is first initial and surname: pshah.',
        },
        {
          id: 'laptop',
          label: 'Laptop',
          kind: 'choice',
          options: ['Standard laptop', 'Analyst laptop'],
          answer: 'Analyst laptop',
          why: 'Everyone in Data & Insight gets the analyst laptop, whatever the form says.',
        },
        {
          id: 'groups',
          label: 'Groups',
          kind: 'choice',
          options: ['Data & Insight', 'All staff and Data & Insight', 'All staff'],
          answer: 'All staff and Data & Insight',
          why: 'Every account is in All staff as well as the team group.',
        },
        {
          id: 'apps',
          label: 'Apps',
          kind: 'choice',
          options: ['BI tool', 'BI tool and Data Studio', 'Data Studio'],
          answer: 'BI tool and Data Studio',
          why: 'The manager asked for Data Studio as well as the BI tool on the form.',
        },
        {
          id: 'ready',
          label: 'Ready by (date)',
          kind: 'text',
          accept: ['7 april', 'monday 7 april', '07/04', '7/4'],
          why: 'Everything must be ready for her first day, Monday 7 April.',
        },
      ],
    },
    {
      id: 'conflict',
      kind: 'decide',
      title: 'The form and the standard disagree',
      prompt: 'The form says “standard laptop”. What do you do?',
      points: 30,
      options: [
        {
          id: 'standard-rule',
          label:
            'Order the analyst laptop, as the standard requires, and tell Grace so the form template can be fixed',
          verdict: 'best',
          why: 'The standard exists for a reason, and fixing the template stops it happening again.',
          effects: { trust: { hr: 2 }, indicators: { risk: -2 } },
        },
        {
          id: 'as-form',
          label: 'Order what the form says',
          verdict: 'poor',
          why: 'She would get a laptop too small for her work, and someone would have to swap it later.',
          effects: { indicators: { satisfaction: -2 } },
        },
        {
          id: 'ask',
          label: 'Ask Grace which laptop to order and wait for her answer',
          verdict: 'acceptable',
          why: 'Safe, but the standard already answers it, and Monday is close.',
        },
      ],
    },
  ],
  outcomes: {
    pass: {
      trust: { hr: 3, manager: 2 },
      reputation: 2,
      indicators: { satisfaction: 2 },
    },
    fail: { indicators: { satisfaction: -2 } },
    lapse: { indicators: { satisfaction: -4 }, reputation: -2 },
  },
  replies: replies(
    'Grace',
    'Perfect, thank you. I’ve updated our form template too.',
    'Facilities and the directory team have queries about some of the details.',
  ),
  lapseLog: 'Priyanka Shah’s set-up was not ready for her first day.',
  skills: { 'customer-service': 15, troubleshooting: 15, accuracy: 15 },
  xp: 90,
}

const itOnboardingFix: CaseInput = {
  id: 'wf-it-onboarding-fix',
  version: 1,
  careerId: 'it-support',
  kind: 'workflow',
  minLevel: 2,
  title: 'The new starter’s first day went wrong',
  summary: 'Priyanka can’t do her work: something in the set-up hand-off was wrong.',
  from: {
    name: 'Amara Nwosu',
    role: 'Head of Data & Insights',
    organisation: 'Data & Insight',
  },
  trigger: {
    afterCase: 'wf-it-onboarding',
    onlyIf: { step: 'handoff', outcome: 'wrong' },
  },
  deadlineHours: 3,
  email: {
    subject: 'Priyanka’s first day',
    body: `Hi,

Priyanka started today but she can’t do her work: her set-up doesn’t match what we asked for. Can you put it right today please?

Amara`,
  },
  whyItMatters:
    'When a hand-off goes wrong, owning it and fixing it fast matters more than whose mistake it was.',
  objectives: [
    'Own a mistake in a hand-off',
    'Put it right quickly',
    'Stop it happening again',
  ],
  steps: [
    {
      id: 'action',
      kind: 'decide',
      title: 'Put it right',
      prompt: 'What do you do?',
      points: 50,
      options: [
        {
          id: 'fix-now',
          label:
            'Correct the set-up today (laptop, groups and apps as the standard and her manager need), and add a check against the standards before hand-offs',
          verdict: 'best',
          why: 'She can work today, and the check stops the next one going wrong.',
          effects: { indicators: { satisfaction: 3, risk: -2 } },
        },
        {
          id: 'fix-only',
          label: 'Correct the set-up today',
          verdict: 'acceptable',
          why: 'It fixes Priyanka, but not the process.',
        },
        {
          id: 'blame',
          label: 'Explain that the form from People & Culture was wrong',
          verdict: 'poor',
          why: 'Partly true, but she still can’t work, and blame doesn’t fix anything.',
          effects: { trust: { hr: -3 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Amara Nwosu',
      title: 'Reply to Amara',
      prompt: 'Apologise, say what you are fixing and when.',
      points: 50,
      minWords: 35,
      mentions: [
        ['sorry', 'apologise', 'apologies'],
        ['today'],
        ['laptop', 'access', 'set-up', 'setup'],
      ],
      avoid: [
        {
          terms: ['HR’s fault', 'not our fault'],
          why: 'Own it: the set-up was ours to check.',
        },
      ],
      model:
        'Hi Amara, I am sorry Priyanka’s first day started badly; the set-up I passed on was not right. I am correcting her laptop, groups and access today, and I have added a check against our standards before every new starter hand-off so it does not happen again. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 1 } },
    fail: { reputation: -2 },
    lapse: { reputation: -3, indicators: { satisfaction: -3 } },
  },
  replies: followUpReplies('Amara'),
  lapseLog: 'Priyanka went a second day without the set-up she needs.',
  skills: { 'customer-service': 15, 'incident-management': 15 },
  xp: 50,
}

// ---------------------------------------------------------------------------
// Finance & Admin: purchase order from an approved request
// ---------------------------------------------------------------------------

const faPurchaseOrder: CaseInput = {
  id: 'wf-fa-purchase-order',
  version: 1,
  careerId: 'office-admin-finance',
  kind: 'workflow',
  minLevel: 2,
  title: 'Raise a purchase order for Operations',
  summary:
    'Operations’ request is approved. Raise the purchase order Accounting will match the invoice to.',
  from: { name: 'Helen Carter', role: 'Operations Director', organisation: 'Operations' },
  trigger: { afterAssignment: 'payment-run' },
  deadlineHours: 6,
  email: {
    subject: 'Approved: new filing cabinets',
    body: `Hi,

Our request for filing cabinets has been approved (attached). Can you raise the purchase order so the supplier can deliver next week?

Helen`,
  },
  whyItMatters:
    'The purchase order is what Accounting later matches the supplier’s invoice against. A wrong amount, code or supplier on the PO causes a mismatch, a held payment and an unhappy supplier.',
  objectives: [
    'Turn an approved request into a correct purchase order',
    'Work out net, VAT and gross',
    'Use the right budget code',
  ],
  evidence: [
    {
      id: 'request',
      title: 'Approved purchase request PR-208',
      table: {
        head: ['Field', 'Value'],
        rows: [
          ['Item', 'Four-drawer filing cabinet, grey'],
          ['Quantity', '3'],
          ['Unit price (excluding VAT)', '£240'],
          ['Supplier (chosen quote)', 'Meadow Office Supplies'],
          ['Department', 'Operations'],
          ['Approved by', 'Helen Carter'],
        ],
      },
    },
    {
      id: 'codes',
      title: 'Budget codes',
      table: {
        head: ['Code', 'Use'],
        rows: [
          ['OPS-FURN', 'Operations: furniture and fittings'],
          ['OPS-SUPP', 'Operations: consumable supplies'],
          ['FIN-FURN', 'Finance: furniture and fittings'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'handoff',
      kind: 'handoff',
      title: 'The purchase order',
      prompt: 'Complete the purchase order for the supplier and Accounting.',
      to: 'Meadow Office Supplies and Accounting',
      points: 100,
      fields: [
        {
          id: 'supplier',
          label: 'Supplier',
          kind: 'choice',
          options: [
            'Meadow Office Supplies',
            'Clearline Telecom',
            'Northbridge IT Hardware',
          ],
          answer: 'Meadow Office Supplies',
          why: 'The approved request names the chosen quote: Meadow Office Supplies.',
        },
        {
          id: 'net',
          label: 'Net total (£)',
          kind: 'number',
          answer: 720,
          tolerance: 0.5,
          unit: '£',
          why: '3 cabinets at £240 = £720 before VAT.',
        },
        {
          id: 'vat',
          label: 'VAT at 20% (£)',
          kind: 'number',
          answer: 144,
          tolerance: 0.5,
          unit: '£',
          why: '20% of £720 = £144.',
        },
        {
          id: 'gross',
          label: 'Total including VAT (£)',
          kind: 'number',
          answer: 864,
          tolerance: 0.5,
          unit: '£',
          why: '£720 + £144 = £864.',
        },
        {
          id: 'code',
          label: 'Budget code',
          kind: 'choice',
          options: ['OPS-FURN', 'OPS-SUPP', 'FIN-FURN'],
          answer: 'OPS-FURN',
          why: 'Filing cabinets are furniture, bought by Operations.',
        },
      ],
    },
  ],
  outcomes: {
    pass: {
      trust: { manager: 2 },
      reputation: 1,
      indicators: { discipline: 2 },
      spend: { operations: 720 },
    },
    fail: { indicators: { risk: 2 } },
    lapse: { indicators: { satisfaction: -3 } },
  },
  replies: replies(
    'Helen',
    'Purchase order received, thanks. The supplier has confirmed delivery for Tuesday.',
    'The supplier has queried some of the details on the order.',
  ),
  lapseLog: 'The filing cabinets were not ordered: the purchase order was never raised.',
  skills: { 'finance-basics': 25, accuracy: 25 },
  xp: 80,
}

const faPurchaseOrderFix: CaseInput = {
  id: 'wf-fa-purchase-order-fix',
  version: 1,
  careerId: 'office-admin-finance',
  kind: 'workflow',
  minLevel: 2,
  title: 'The invoice doesn’t match your purchase order',
  summary:
    'Accounting is holding the supplier’s invoice because it doesn’t match the PO.',
  from: { name: 'Daniel Okoro', role: 'Accounting Manager', organisation: 'Accounting' },
  trigger: {
    afterCase: 'wf-fa-purchase-order',
    onlyIf: { step: 'handoff', outcome: 'wrong' },
  },
  deadlineHours: 4,
  email: {
    subject: 'Invoice on hold: PO mismatch',
    body: `Hi,

Meadow Office Supplies’ invoice for the filing cabinets (£864, three cabinets at £240 plus VAT) doesn’t match your purchase order, so I’ve put it on hold. Can you check the PO and tell me what to do?

Daniel`,
  },
  whyItMatters:
    'A mismatch between a PO and an invoice holds up payment until someone owns and corrects it.',
  objectives: ['Correct a purchase order', 'Release a payment held by your mistake'],
  steps: [
    {
      id: 'action',
      kind: 'decide',
      title: 'What to do',
      prompt: 'The invoice matches the approved request. What do you do?',
      points: 50,
      options: [
        {
          id: 'amend',
          label:
            'Amend the purchase order to match the approved request, and ask Daniel to release the invoice',
          verdict: 'best',
          why: 'The invoice is right; the PO was wrong, so the PO is what changes.',
          effects: { indicators: { satisfaction: 2, risk: -2 } },
        },
        {
          id: 'dispute',
          label: 'Ask the supplier to re-invoice to match the PO',
          verdict: 'poor',
          why: 'The supplier charged what was agreed; the error was ours.',
          effects: { indicators: { satisfaction: -3 } },
        },
        {
          id: 'pay',
          label: 'Tell Daniel to pay it anyway and leave the PO',
          verdict: 'poor',
          why: 'The records would stay wrong, and the next audit would find it.',
          effects: { indicators: { risk: 3 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Daniel Okoro, Accounting',
      title: 'Reply to Daniel',
      prompt: 'Explain and ask him to release the invoice.',
      points: 50,
      minWords: 30,
      mentions: [['amend', 'corrected', 'updated'], ['864'], ['release']],
      avoid: [],
      model:
        'Hi Daniel, sorry, the mistake was on my purchase order. The invoice is right: three cabinets at £240 plus VAT, £864. I have amended the PO to match the approved request, so please release the invoice for payment. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 1 } },
    fail: { reputation: -2 },
    lapse: { reputation: -2, indicators: { satisfaction: -3 } },
  },
  replies: followUpReplies('Daniel'),
  lapseLog: 'The supplier’s invoice stayed on hold and the payment went late.',
  skills: { accuracy: 15, 'finance-basics': 10 },
  xp: 45,
}

// ---------------------------------------------------------------------------
// Accounting: billing schedule from a sales contract
// ---------------------------------------------------------------------------

const accBilling: CaseInput = {
  id: 'wf-acc-billing',
  version: 1,
  careerId: 'accounting',
  kind: 'workflow',
  minLevel: 2,
  title: 'Set up billing for a new contract',
  summary: 'Sales has signed a new client. Set up the billing schedule correctly.',
  from: { name: 'Chloe Martin', role: 'Sales Manager', organisation: 'Sales' },
  trigger: { afterAssignment: 'books-bank-rec' },
  deadlineHours: 6,
  email: {
    subject: 'Signed: Steelway Engineering retainer',
    body: `Hi,

Great news: Steelway Engineering has signed a 12-month advisory retainer (contract summary attached). Can Accounting set up the billing?

Chloe`,
  },
  whyItMatters:
    'Sales agree the terms; Accounting turns them into invoices. Misreading a contract (the fee, the start date, the payment terms) means wrong invoices and a client who loses confidence in you.',
  objectives: [
    'Read a contract for billing terms',
    'Set up a billing schedule correctly',
    'Spot a discount and its end date',
  ],
  evidence: [
    {
      id: 'contract',
      title: 'Contract summary: Steelway Engineering',
      text: '12-month advisory retainer starting **1 May**. Monthly fee **£4,500** excluding VAT, invoiced at the start of each month. **Introductory discount: 10% for the first three months.** Payment terms: **30 days**.',
    },
  ],
  steps: [
    {
      id: 'handoff',
      kind: 'handoff',
      title: 'The billing schedule',
      prompt: 'Complete the billing schedule for invoicing.',
      to: 'Invoicing (Books)',
      points: 70,
      fields: [
        {
          id: 'first',
          label: 'First invoice month',
          kind: 'choice',
          options: ['April', 'May', 'June'],
          answer: 'May',
          why: 'The retainer starts on 1 May, invoiced at the start of the month.',
        },
        {
          id: 'intro',
          label: 'Monthly fee for the first three months, excluding VAT (£)',
          kind: 'number',
          answer: 4050,
          tolerance: 0.5,
          unit: '£',
          why: '£4,500 less 10% = £4,050.',
        },
        {
          id: 'standard',
          label: 'Monthly fee from month four, excluding VAT (£)',
          kind: 'number',
          answer: 4500,
          tolerance: 0.5,
          unit: '£',
          why: 'The discount ends after three months.',
        },
        {
          id: 'terms',
          label: 'Payment terms (days)',
          kind: 'number',
          answer: 30,
          tolerance: 0,
          unit: 'days',
          why: 'The contract says 30 days.',
        },
      ],
    },
    {
      id: 'year',
      kind: 'figure',
      title: 'First-year value',
      prompt: 'What is the contract worth over the 12 months, excluding VAT?',
      points: 30,
      answer: 52650,
      tolerance: 1,
      unit: '£',
      why: '3 × £4,050 + 9 × £4,500 = £12,150 + £40,500 = £52,650.',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 1, indicators: { satisfaction: 2 } },
    fail: { indicators: { risk: 2 } },
    lapse: { indicators: { satisfaction: -3 } },
  },
  replies: replies(
    'Chloe',
    'Brilliant, the client has had their first invoice and it’s exactly what they agreed.',
    'The client has questioned their first invoice.',
  ),
  lapseLog:
    'Steelway Engineering’s first invoice went out late: billing was never set up.',
  skills: { bookkeeping: 25, accuracy: 20 },
  xp: 85,
}

const accBillingFix: CaseInput = {
  id: 'wf-acc-billing-fix',
  version: 1,
  careerId: 'accounting',
  kind: 'workflow',
  minLevel: 2,
  title: 'The new client questions their invoice',
  summary: 'Steelway Engineering says their first invoice doesn’t match the contract.',
  from: {
    name: 'Owen Price',
    role: 'Finance Director',
    organisation: 'Steelway Engineering',
  },
  trigger: { afterCase: 'wf-acc-billing', onlyIf: { step: 'handoff', outcome: 'wrong' } },
  deadlineHours: 4,
  email: {
    subject: 'Our first invoice is wrong',
    body: `Hello,

Our first invoice doesn’t match our contract: we agreed £4,050 a month for the first three months (the 10% introductory discount), from May. Please send a corrected invoice.

Owen Price
Finance Director, Steelway Engineering`,
  },
  whyItMatters:
    'A new client’s first invoice sets the tone of the relationship. Correcting it quickly and gracefully matters.',
  objectives: ['Correct an invoice properly', 'Apologise to a new client professionally'],
  steps: [
    {
      id: 'action',
      kind: 'decide',
      title: 'Correct it',
      prompt: 'How do you correct the invoice?',
      points: 50,
      options: [
        {
          id: 'credit',
          label:
            'Issue a credit note for the wrong invoice and a new invoice for £4,050 plus VAT, and fix the billing schedule',
          verdict: 'best',
          why: 'A credit note keeps the records clean, and fixing the schedule stops the next two invoices being wrong too.',
          effects: { indicators: { satisfaction: 3, risk: -2 } },
        },
        {
          id: 'edit',
          label: 'Edit the original invoice to the right amount',
          verdict: 'poor',
          why: 'Issued invoices must not be edited: it breaks the audit trail.',
          effects: { indicators: { risk: 4 } },
        },
        {
          id: 'next-month',
          label: 'Ask them to pay it and adjust next month’s invoice',
          verdict: 'poor',
          why: 'It makes the client pay more than agreed and complicates every invoice after.',
          effects: { indicators: { satisfaction: -3 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Owen Price, Steelway Engineering',
      title: 'Reply to the client',
      prompt: 'Apologise and explain the correction.',
      points: 50,
      minWords: 35,
      mentions: [['sorry', 'apologise', 'apologies'], ['credit note'], ['4,050', '4050']],
      avoid: [],
      model:
        'Dear Owen, my apologies: your first invoice did not apply the 10% introductory discount. I have issued a credit note for it and a new invoice for £4,050 plus VAT, and corrected your billing schedule so the next two months are right too. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 1 } },
    fail: { reputation: -2 },
    lapse: { reputation: -2, indicators: { satisfaction: -4 } },
  },
  replies: followUpReplies('Owen'),
  lapseLog: 'Steelway Engineering escalated their wrong invoice to {manager}.',
  skills: { bookkeeping: 15, accuracy: 10 },
  xp: 45,
}

// ---------------------------------------------------------------------------
// Digital Marketing: budget request to Finance
// ---------------------------------------------------------------------------

const mktBudget: CaseInput = {
  id: 'wf-mkt-budget-request',
  version: 1,
  careerId: 'digital-marketing',
  kind: 'workflow',
  minLevel: 2,
  title: 'Ask Finance for a campaign budget',
  summary: 'Turn the summer campaign plan into the budget request Finance needs.',
  from: {
    name: 'Sofia Alvarez',
    role: 'Marketing Manager',
    organisation: 'Marketing',
    personId: 'manager',
  },
  trigger: { afterAssignment: 'ab-test' },
  deadlineHours: 6,
  email: {
    subject: 'Summer campaign: budget request to Finance',
    body: `Hi {name},

The summer campaign plan is agreed (attached). Please send Finance the budget request: they need the total, the cost centre, the months and the return we expect.

Sofia`,
  },
  whyItMatters:
    'Marketing gets its money through Finance’s process. A clear, correct request with the expected return is approved quickly; a vague or wrong one is sent back.',
  objectives: [
    'Turn a plan into a budget request',
    'Calculate the expected return',
    'Use Finance’s codes and periods',
  ],
  evidence: [
    {
      id: 'plan',
      title: 'Summer campaign plan',
      table: {
        head: ['Line', 'June', 'July', 'August'],
        rows: [
          ['Search ads', '£2,000', '£2,000', '£1,500'],
          ['Social ads', '£1,200', '£1,200', '£1,000'],
          ['Design and video', '£1,600', '', ''],
        ],
      },
    },
    {
      id: 'forecast',
      title: 'Forecast',
      text: 'Expected: **210 leads**; about 1 in 7 becomes a client, worth **£1,500** each on average.',
    },
    {
      id: 'finance',
      title: 'Finance: how to request budget',
      text: 'Marketing cost centre: **MKT-200**. Give the total, the months, and the expected revenue.',
    },
  ],
  steps: [
    {
      id: 'handoff',
      kind: 'handoff',
      title: 'The budget request',
      prompt: 'Complete the request for Finance.',
      to: 'Finance (budget requests)',
      points: 70,
      fields: [
        {
          id: 'total',
          label: 'Total budget (£)',
          kind: 'number',
          answer: 10500,
          tolerance: 0.5,
          unit: '£',
          why: 'Search £5,500 + social £3,400 + design £1,600 = £10,500.',
        },
        {
          id: 'centre',
          label: 'Cost centre',
          kind: 'text',
          accept: ['mkt-200', 'mkt200'],
          why: 'Marketing’s cost centre is MKT-200.',
        },
        {
          id: 'months',
          label: 'Months',
          kind: 'choice',
          options: ['June', 'June to August', 'July to September'],
          answer: 'June to August',
          why: 'The plan runs June, July and August.',
        },
        {
          id: 'revenue',
          label: 'Expected revenue (£)',
          kind: 'number',
          answer: 45000,
          tolerance: 1,
          unit: '£',
          why: '210 leads ÷ 7 = 30 clients × £1,500 = £45,000.',
        },
      ],
    },
    {
      id: 'roi',
      kind: 'figure',
      title: 'Return on the spend',
      prompt:
        'How many pounds of revenue are expected for every £1 spent (to 1 decimal place)?',
      points: 30,
      answer: 4.3,
      tolerance: 0.05,
      unit: '',
      why: '£45,000 ÷ £10,500 ≈ 4.3.',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 1, indicators: { discipline: 2 } },
    fail: { indicators: { discipline: -1 } },
    lapse: { indicators: { discipline: -2 } },
  },
  replies: replies(
    'Sofia',
    'Finance approved it the same day: they said it was the clearest request they’ve had this year.',
    'Finance has sent the request back with questions.',
  ),
  lapseLog: 'The summer campaign budget request was never sent to Finance.',
  skills: { 'campaign-analytics': 25, 'data-analysis': 10 },
  xp: 80,
}

const mktBudgetFix: CaseInput = {
  id: 'wf-mkt-budget-request-fix',
  version: 1,
  careerId: 'digital-marketing',
  kind: 'workflow',
  minLevel: 2,
  title: 'Finance sends the budget request back',
  summary: 'Finance can’t approve the summer campaign request as it is.',
  from: {
    name: 'Priya Raman',
    role: 'Finance & Administration Manager',
    organisation: 'Finance & Administration',
  },
  trigger: {
    afterCase: 'wf-mkt-budget-request',
    onlyIf: { step: 'handoff', outcome: 'wrong' },
  },
  deadlineHours: 4,
  email: {
    subject: 'Summer campaign request: returned',
    body: `Hi,

I can’t approve the summer campaign request: some of it doesn’t match the plan you attached. Please correct and resubmit. Approvals close on Friday.

Priya`,
  },
  whyItMatters:
    'Rework costs everyone time; correcting a request promptly keeps the campaign on schedule.',
  objectives: [
    'Correct and resubmit a request',
    'Check figures against the source before sending',
  ],
  steps: [
    {
      id: 'action',
      kind: 'decide',
      title: 'Next step',
      prompt: 'What do you do?',
      points: 50,
      options: [
        {
          id: 'correct',
          label:
            'Recheck every figure against the plan, correct the request and resubmit before Friday',
          verdict: 'best',
          why: 'It fixes the request and meets Finance’s deadline.',
          effects: { indicators: { discipline: 2 } },
        },
        {
          id: 'round-up',
          label: 'Resubmit with a round £12,000 to be safe',
          verdict: 'poor',
          why: 'Asking for more than the plan without saying why undermines trust in every future request.',
          effects: { indicators: { discipline: -3 } },
        },
        {
          id: 'argue',
          label: 'Ask Priya to approve it anyway',
          verdict: 'poor',
          why: 'Finance can’t approve figures that don’t match the plan.',
          effects: { trust: { manager: -1 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Priya Raman, Finance',
      title: 'Reply to Priya',
      prompt: 'Thank her and confirm the corrected request.',
      points: 50,
      minWords: 30,
      mentions: [['10,500', '10500'], ['MKT-200'], ['corrected', 'resubmit']],
      avoid: [],
      model:
        'Hi Priya, thanks for catching it, and sorry for the extra work. I have corrected the request to match the plan: £10,500 on cost centre MKT-200, June to August, with £45,000 expected revenue, and resubmitted it today. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 1 } },
    fail: { reputation: -2 },
    lapse: { reputation: -2, indicators: { discipline: -3 } },
  },
  replies: followUpReplies('Priya'),
  lapseLog: 'The summer campaign missed Finance’s approval round.',
  skills: { 'campaign-analytics': 10, accuracy: 10 },
  xp: 45,
}

// ---------------------------------------------------------------------------
// Data Analysis: a dashboard specification for Operations
// ---------------------------------------------------------------------------

const dataSpec: CaseInput = {
  id: 'wf-data-kpi-spec',
  version: 1,
  careerId: 'data-analytics',
  kind: 'workflow',
  minLevel: 2,
  title: 'Turn Operations’ request into a dashboard spec',
  summary:
    'Operations wants a delivery dashboard. Write the specification for the data engineers.',
  from: { name: 'Helen Carter', role: 'Operations Director', organisation: 'Operations' },
  trigger: { afterAssignment: 'studio-dashboard' },
  deadlineHours: 6,
  email: {
    subject: 'Delivery dashboard',
    body: `Hi,

I want a dashboard showing how well we deliver: are jobs on time, and how long do they take? Weekly, please, for the last quarter. The details of how we measure it are in our operations manual (extract attached).

Helen`,
  },
  whyItMatters:
    'A dashboard is only as good as its definitions. Turning a manager’s request into precise metrics (what counts, over what period, from which data) is what lets the data engineers build the right thing first time.',
  objectives: [
    'Define metrics precisely',
    'Translate a business request into a specification',
    'Choose the right data source and period',
  ],
  evidence: [
    {
      id: 'manual',
      title: 'Operations manual (extract)',
      text: 'A job is **on time** if it is completed **on or before** its promised date. Cancelled jobs are **excluded** from delivery measures. Cycle time is measured in **working days** from booking to completion.',
    },
    {
      id: 'sources',
      title: 'Available data',
      table: {
        head: ['Table', 'Contents'],
        rows: [
          ['jobs', 'Booking date, promised date, completed date, status'],
          ['invoices', 'Invoice dates and amounts'],
          ['staff', 'Who worked on what'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'handoff',
      kind: 'handoff',
      title: 'The specification',
      prompt: 'Complete the specification for the data engineers.',
      to: 'Data engineering',
      points: 75,
      fields: [
        {
          id: 'source',
          label: 'Source table',
          kind: 'choice',
          options: ['jobs', 'invoices', 'staff'],
          answer: 'jobs',
          why: 'Delivery dates are in the jobs table.',
        },
        {
          id: 'on-time',
          label: 'On-time rule',
          kind: 'choice',
          options: [
            'Completed before the promised date',
            'Completed on or before the promised date',
            'Completed within 5 days of booking',
          ],
          answer: 'Completed on or before the promised date',
          why: 'The manual says on or before the promised date.',
        },
        {
          id: 'cancelled',
          label: 'Cancelled jobs',
          kind: 'choice',
          options: ['Included', 'Excluded'],
          answer: 'Excluded',
          why: 'The manual excludes cancelled jobs from delivery measures.',
        },
        {
          id: 'cycle',
          label: 'Cycle time unit',
          kind: 'choice',
          options: ['Calendar days', 'Working days', 'Hours'],
          answer: 'Working days',
          why: 'The manual measures cycle time in working days.',
        },
        {
          id: 'grain',
          label: 'Time grain',
          kind: 'choice',
          options: ['Daily', 'Weekly', 'Monthly'],
          answer: 'Weekly',
          why: 'Helen asked for weekly figures.',
        },
      ],
    },
    {
      id: 'clarify',
      kind: 'decide',
      title: 'Anything to check?',
      prompt:
        'The manual doesn’t say how to treat jobs still open past their promised date. What do you do?',
      points: 25,
      options: [
        {
          id: 'ask',
          label:
            'Ask Helen, and suggest counting them as late (which is what they will be)',
          verdict: 'best',
          why: 'Definitions belong to the business, and a suggestion makes the decision quick.',
          effects: { indicators: { risk: -2 } },
        },
        {
          id: 'ignore',
          label: 'Leave them out: they aren’t finished',
          verdict: 'poor',
          why: 'Leaving out the latest jobs would make delivery look better than it is.',
          effects: { indicators: { risk: 3 } },
        },
        {
          id: 'guess',
          label: 'Count them as on time until they are completed',
          verdict: 'poor',
          why: 'They are already late; counting them as on time hides problems.',
          effects: { indicators: { risk: 4 } },
        },
      ],
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 1, indicators: { satisfaction: 2 } },
    fail: { indicators: { risk: 2 } },
    lapse: { indicators: { satisfaction: -3 } },
  },
  replies: replies(
    'Helen',
    'The engineers built it from your spec without a single question. It’s exactly what I wanted.',
    'The engineers have come back with questions about the spec.',
  ),
  lapseLog: 'The delivery dashboard was never specified.',
  skills: { 'data-analysis': 20, 'data-visualisation': 15, 'insight-communication': 10 },
  xp: 85,
}

const dataSpecFix: CaseInput = {
  id: 'wf-data-kpi-spec-fix',
  version: 1,
  careerId: 'data-analytics',
  kind: 'workflow',
  minLevel: 2,
  title: 'The delivery dashboard shows the wrong numbers',
  summary: 'Operations’ on-time figure doesn’t match their own records.',
  from: { name: 'Helen Carter', role: 'Operations Director', organisation: 'Operations' },
  trigger: {
    afterCase: 'wf-data-kpi-spec',
    onlyIf: { step: 'handoff', outcome: 'wrong' },
  },
  deadlineHours: 4,
  email: {
    subject: 'Dashboard numbers look wrong',
    body: `Hi,

The new dashboard says our on-time rate is quite different from what my team measures. The board sees it next week. What’s going on?

Helen`,
  },
  whyItMatters:
    'A wrong definition in a spec turns into wrong numbers in front of the board. Finding and owning it quickly protects everyone.',
  objectives: [
    'Trace a wrong figure to its definition',
    'Correct the specification',
    'Explain it to the business',
  ],
  steps: [
    {
      id: 'action',
      kind: 'decide',
      title: 'What to do',
      prompt: 'What do you do?',
      points: 50,
      options: [
        {
          id: 'fix-spec',
          label:
            'Compare the spec with the operations manual, correct the definitions, and have the dashboard rebuilt before the board',
          verdict: 'best',
          why: 'It fixes the cause and the figures together.',
          effects: { indicators: { risk: -3, satisfaction: 2 } },
        },
        {
          id: 'note',
          label: 'Add a note to the dashboard explaining the difference',
          verdict: 'acceptable',
          why: 'Honest, but the board should see the right figures, not an explanation of wrong ones.',
        },
        {
          id: 'defend',
          label: 'Explain that the dashboard is right and the team’s measure is wrong',
          verdict: 'poor',
          why: 'The business owns its definitions; the dashboard must follow the manual.',
          effects: { trust: { manager: -2 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Helen Carter, Operations',
      title: 'Reply to Helen',
      prompt: 'Explain what went wrong and when it will be fixed.',
      points: 50,
      minWords: 35,
      mentions: [
        ['definition', 'spec'],
        ['manual'],
        ['before the board', 'next week', 'fixed'],
      ],
      avoid: [
        {
          terms: ['your team is wrong'],
          why: 'The manual is the agreed definition: the spec should have followed it.',
        },
      ],
      model:
        'Hi Helen, sorry about this: the dashboard specification I wrote did not follow the operations manual’s definitions exactly. I have corrected the spec to match the manual, and the engineers will rebuild the dashboard this week, so the figures will be fixed before the board sees them. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 1 } },
    fail: { reputation: -2 },
    lapse: { reputation: -3, indicators: { risk: 3 } },
  },
  replies: followUpReplies('Helen'),
  lapseLog: 'The board saw the wrong delivery figures.',
  skills: { 'data-analysis': 15, 'insight-communication': 10 },
  xp: 45,
}

// ---------------------------------------------------------------------------
// Software Development: a support escalation into an engineering ticket
// ---------------------------------------------------------------------------

const devEscalation: CaseInput = {
  id: 'wf-dev-escalation',
  version: 1,
  careerId: 'software-development',
  kind: 'workflow',
  minLevel: 2,
  title: 'An escalation from the service desk',
  summary:
    'IT Support has escalated a client problem. Turn it into a proper engineering ticket.',
  from: {
    name: 'Ravi Menon',
    role: 'IT Service Desk Manager',
    organisation: 'IT Support',
  },
  trigger: { afterAssignment: 'debug-nan' },
  deadlineHours: 5,
  email: {
    subject: 'Escalation: INC-3318 client portal',
    body: `Hi,

We’ve escalated INC-3318 to Engineering (details attached). Can you raise it in the engineering backlog so it gets picked up properly?

Ravi`,
  },
  whyItMatters:
    'Support and Engineering only work well together when escalations become clear tickets: how to reproduce it, who is affected and how badly. A badly written or wrongly prioritised ticket wastes days.',
  objectives: [
    'Turn a support escalation into an engineering ticket',
    'Set severity from impact',
    'Capture the steps to reproduce',
  ],
  evidence: [
    {
      id: 'incident',
      title: 'INC-3318 (service desk)',
      text: 'Reported by **Harbour Foods** (client). Since **version 2.4** was released on Tuesday, the client portal shows the **wrong invoice totals** (VAT added twice) for every client with discounts. Steps: log in as a client with a discount, open any invoice. Workaround: none; clients are refusing to pay.',
    },
    {
      id: 'severity',
      title: 'Engineering severity levels',
      table: {
        head: ['Severity', 'Meaning'],
        rows: [
          ['S1', 'Many users or clients affected, money or data wrong, no workaround'],
          ['S2', 'Important feature broken, workaround exists'],
          ['S3', 'Minor problem or cosmetic'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'handoff',
      kind: 'handoff',
      title: 'The engineering ticket',
      prompt: 'Complete the ticket for the engineering backlog.',
      to: 'Engineering backlog',
      points: 75,
      fields: [
        {
          id: 'severity',
          label: 'Severity',
          kind: 'choice',
          options: ['S1', 'S2', 'S3'],
          answer: 'S1',
          why: 'Every discounted client sees wrong money, with no workaround: S1.',
        },
        {
          id: 'version',
          label: 'Version where it started',
          kind: 'text',
          accept: ['2.4', 'v2.4', 'version 2.4'],
          why: 'It started with version 2.4 on Tuesday.',
        },
        {
          id: 'affected',
          label: 'Who is affected',
          kind: 'choice',
          options: ['Harbour Foods only', 'Every client with a discount', 'Every client'],
          answer: 'Every client with a discount',
          why: 'The incident says every client with discounts.',
        },
        {
          id: 'expected',
          label: 'Expected behaviour',
          kind: 'choice',
          options: ['VAT added once', 'No VAT on discounted invoices', 'VAT added twice'],
          answer: 'VAT added once',
          why: 'VAT should be added once; it is being added twice.',
        },
      ],
    },
    {
      id: 'communicate',
      kind: 'decide',
      title: 'The clients',
      prompt: 'Clients are refusing to pay. What do you suggest to Ravi?',
      points: 25,
      options: [
        {
          id: 'tell',
          label:
            'Tell affected clients we know about it, the invoices are being corrected, and they’ll get corrected copies',
          verdict: 'best',
          why: 'Clients are told the truth and know what will happen; Support can answer calls consistently.',
          effects: { indicators: { satisfaction: 3 } },
        },
        {
          id: 'quiet',
          label: 'Say nothing until the fix is released',
          verdict: 'poor',
          why: 'Clients keep seeing wrong totals and lose trust.',
          effects: { indicators: { satisfaction: -4 } },
        },
        {
          id: 'rollback-claim',
          label: 'Tell clients it’s fixed today, to calm things down',
          verdict: 'poor',
          why: 'Promising a fix you don’t have makes it worse when it isn’t.',
          effects: { indicators: { satisfaction: -3, risk: 2 } },
        },
      ],
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 2, indicators: { satisfaction: 2 } },
    fail: { indicators: { risk: 2 } },
    lapse: { indicators: { satisfaction: -4, risk: 3 } },
  },
  replies: replies(
    'Ravi',
    'Perfect ticket: Engineering picked it up as S1 within the hour. Clients have been told.',
    'Engineering has questions about the ticket.',
  ),
  lapseLog:
    'INC-3318 sat in Support with no engineering ticket while clients refused to pay.',
  skills: { debugging: 20, 'software-testing': 15 },
  xp: 85,
}

const devEscalationFix: CaseInput = {
  id: 'wf-dev-escalation-fix',
  version: 1,
  careerId: 'software-development',
  kind: 'workflow',
  minLevel: 2,
  title: 'The escalation was picked up too late',
  summary:
    'The invoice bug sat in the backlog for days. Clients are now complaining to the directors.',
  from: {
    name: 'Samuel Adeyemi',
    role: 'Engineering Manager',
    organisation: 'Engineering',
    personId: 'manager',
  },
  trigger: {
    afterCase: 'wf-dev-escalation',
    onlyIf: { step: 'handoff', outcome: 'wrong' },
  },
  deadlineHours: 3,
  email: {
    subject: 'Why did INC-3318 wait so long?',
    body: `Hi {name},

The VAT bug from INC-3318 waited in the backlog for days because the ticket didn’t show how serious it was. Clients have complained to the directors. Let’s fix it and the process.

Samuel`,
  },
  whyItMatters:
    'Getting severity wrong delays the most important work. Owning it and fixing the process stops a repeat.',
  objectives: ['Recover from a mis-prioritised ticket', 'Improve the escalation process'],
  steps: [
    {
      id: 'action',
      kind: 'decide',
      title: 'Recover',
      prompt: 'What do you do?',
      points: 50,
      options: [
        {
          id: 'fix-and-check',
          label:
            'Correct the ticket to S1 so it is fixed now, and agree a checklist with Support for severity and affected clients on every escalation',
          verdict: 'best',
          why: 'It gets the fix moving and prevents the next mis-prioritised escalation.',
          effects: { indicators: { risk: -3 } },
        },
        {
          id: 'fix-only',
          label: 'Correct the ticket to S1',
          verdict: 'acceptable',
          why: 'It fixes this one, but the next escalation could go wrong the same way.',
        },
        {
          id: 'blame-support',
          label: 'Point out that Support’s escalation wasn’t clear enough',
          verdict: 'poor',
          why: 'The details were in the incident; the ticket was ours to get right.',
          effects: { trust: { manager: -2 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Samuel Adeyemi',
      title: 'Reply to Samuel',
      prompt: 'Own it and say what will change.',
      points: 50,
      minWords: 35,
      mentions: [
        ['S1', 'severity'],
        ['checklist', 'process'],
        ['sorry', 'my mistake', 'apologies'],
      ],
      avoid: [{ terms: ['support’s fault'], why: 'Own your part.' }],
      model:
        'Hi Samuel, sorry, my mistake: the ticket did not show the severity the incident described. I have corrected it to S1 so it is being fixed now, and I have agreed a short checklist with Support so every escalation records the severity and the affected clients. {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 1 } },
    fail: { reputation: -2 },
    lapse: { reputation: -3, indicators: { satisfaction: -3 } },
  },
  replies: followUpReplies('Samuel'),
  lapseLog: 'The VAT bug waited even longer, and more clients complained.',
  skills: { 'software-design': 10, debugging: 10 },
  xp: 45,
}

export const WORKFLOW_CASES: CaseInput[] = [
  itOnboarding,
  itOnboardingFix,
  faPurchaseOrder,
  faPurchaseOrderFix,
  accBilling,
  accBillingFix,
  mktBudget,
  mktBudgetFix,
  dataSpec,
  dataSpecFix,
  devEscalation,
  devEscalationFix,
]
