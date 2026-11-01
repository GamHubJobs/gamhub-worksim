/** Finance & Administration cases. */
import type { CaseInput } from '../schema'

/** A supplier chases an invoice that should not be paid in full. */
const shortDelivery: CaseInput = {
  id: 'fa-short-delivery',
  version: 1,
  careerId: 'office-admin-finance',
  kind: 'client',
  title: 'A supplier chases an unpaid invoice',
  summary: 'Meadow Office Supplies wants paying in full, but the delivery was short.',
  from: {
    name: 'Karen Holt',
    role: 'Credit Controller',
    organisation: 'Meadow Office Supplies',
  },
  trigger: { afterAssignment: 'invoice-check' },
  deadlineHours: 6,
  email: {
    subject: 'Overdue: invoice MOS-2291 (£612.00)',
    body: `Dear Accounts team,

Our invoice **MOS-2291** for **£612.00** (including VAT) is now 5 days overdue. Please arrange payment today, or we will have to put your account on hold, which would stop your next delivery.

The invoice, your purchase order and our delivery note are attached.

Kind regards,

Karen Holt
Credit Controller, Meadow Office Supplies`,
  },
  whyItMatters:
    'Paying suppliers on time protects the relationship; paying only for what was received protects the company’s money. Good finance teams do both: they check the paperwork (the “three-way match”), pay what is owed, and resolve differences politely and quickly.',
  objectives: [
    'Match an invoice against the purchase order and delivery note',
    'Work out what is actually owed',
    'Resolve a dispute with a supplier politely and firmly',
  ],
  evidence: [
    {
      id: 'invoice',
      title: 'Invoice MOS-2291',
      text: 'Invoice date: 12 March. Payment terms: 30 days. All prices exclude VAT; VAT is charged at 20%.',
      table: {
        head: ['Item', 'Quantity', 'Unit price', 'Line total'],
        rows: [
          ['A4 paper (box of 5 reams)', '20', '£18.00', '£360.00'],
          ['Toner cartridge, black', '6', '£25.00', '£150.00'],
          ['Net total', '', '', '£510.00'],
          ['VAT (20%)', '', '', '£102.00'],
          ['Total due', '', '', '£612.00'],
        ],
      },
    },
    {
      id: 'po',
      title: 'Purchase order PO-4471 (Cobalt Ridge)',
      text: 'Raised by Facilities, approved by {manager}.',
      table: {
        head: ['Item', 'Quantity', 'Agreed unit price'],
        rows: [
          ['A4 paper (box of 5 reams)', '20', '£18.00'],
          ['Toner cartridge, black', '6', '£25.00'],
        ],
      },
    },
    {
      id: 'delivery',
      title: 'Delivery note DN-8820, signed by reception',
      text: 'Received 12 March by Tom Becker (Facilities). Note on the delivery: “Toner: 4 delivered, 2 to follow.” No second delivery has been received since.',
      table: {
        head: ['Item', 'Quantity delivered'],
        rows: [
          ['A4 paper (box of 5 reams)', '20'],
          ['Toner cartridge, black', '4'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'match',
      kind: 'review',
      title: 'Match the three documents',
      prompt:
        'Compare the invoice, the purchase order and the delivery note. Which of these are problems?',
      points: 30,
      findings: [
        {
          id: 'toner-short',
          text: 'The invoice charges for 6 toner cartridges, but only 4 were delivered.',
          issue: true,
          why: 'We pay for what we received: the delivery note shows 4, with 2 still to follow.',
        },
        {
          id: 'paper-price',
          text: 'The paper is charged at £18.00 a box, the price on the purchase order.',
          issue: false,
          why: 'The price matches the purchase order, so this line is fine.',
        },
        {
          id: 'vat',
          text: 'VAT is charged at 20% on the net total.',
          issue: false,
          why: '20% is the standard rate for office supplies.',
        },
        {
          id: 'overdue',
          text: 'The invoice is 5 days past its 30-day terms.',
          issue: true,
          why: 'Late payment is our problem too: it risks the account being put on hold, so it needs resolving today.',
        },
      ],
    },
    {
      id: 'owed',
      kind: 'figure',
      title: 'What we owe today',
      prompt:
        'How much should we pay today, including VAT, for what was actually delivered?',
      points: 25,
      answer: 552,
      tolerance: 0.5,
      unit: '£',
      why: '20 boxes of paper (£360) and 4 toner cartridges (£100) make £460 net; with 20% VAT, £552.',
    },
    {
      id: 'action',
      kind: 'decide',
      title: 'What to do',
      prompt: 'How do you resolve the invoice?',
      points: 25,
      options: [
        {
          id: 'pay-delivered',
          label:
            'Pay £552 today for what was delivered, and ask for a credit note (or the 2 missing cartridges) for the rest',
          verdict: 'best',
          why: 'The supplier is paid promptly for what we received, the account stays open, and the difference is resolved properly.',
          effects: { indicators: { satisfaction: 2, risk: -2 } },
        },
        {
          id: 'pay-full',
          label: 'Pay the full £612 now to avoid the account being put on hold',
          verdict: 'poor',
          why: 'We would pay £60 for goods we never received, and it is much harder to get money back than not to pay it.',
          effects: { indicators: { risk: 4 }, spend: { finance: 60 } },
        },
        {
          id: 'hold-all',
          label: 'Hold the whole payment until the missing cartridges arrive',
          verdict: 'acceptable',
          why: 'It protects the company’s money, but withholding payment for goods we did receive is unfair and the account may be put on hold.',
          effects: { indicators: { satisfaction: -3 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Karen Holt, Meadow Office Supplies',
      title: 'Reply to the supplier',
      prompt:
        'Write to Karen: what you are paying and why, and what you need from her for the rest.',
      points: 20,
      minWords: 50,
      model:
        'Dear Karen, thank you for your email, and sorry for the delay. We have checked invoice MOS-2291 against our purchase order and your delivery note: the paper arrived in full, but only 4 of the 6 toner cartridges were delivered. We are paying £552 today for everything delivered. Please send the two missing cartridges, or a credit note for £60 if you cannot supply them. Kind regards, {name}',
      mentions: [
        ['552'],
        ['credit note', 'missing', 'two cartridges', '2 cartridges'],
        ['delivery note', 'delivered'],
      ],
      avoid: [
        {
          terms: ['your fault', 'incompetent', 'unacceptable'],
          why: 'Stay polite: the supplier is a partner, and the delivery note already says the rest will follow.',
        },
      ],
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 2, indicators: { discipline: 2 } },
    fail: { indicators: { risk: 2 } },
    lapse: { indicators: { satisfaction: -4, risk: 3 }, reputation: -2 },
  },
  replies: {
    excellent: `Dear {name},

Thank you for checking so carefully, and apologies: our driver’s note was right, and the two cartridges are still in our warehouse. We have received your £552 and will send the cartridges tomorrow; no further invoice will be needed. Your account is in good standing.

Kind regards,
Karen`,
    good: `Dear {name},

Thank you. We have noted the payment and will look into the missing cartridges.

Kind regards,
Karen`,
    pass: `Dear {name},

Thank you for your reply. Some of this needs clarifying; our accounts team will be in touch.

Kind regards,
Karen`,
    fail: `Dear {name},

We are not clear what you are paying or why. Please call us so we can sort this out before the account goes on hold.

Kind regards,
Karen`,
  },
  lapseLog:
    'Meadow Office Supplies put the account on hold: the overdue invoice was not answered.',
  skills: { accuracy: 30, 'finance-basics': 30 },
  xp: 80,
}

/** An employee queries a rejected expense claim. */
const expenseQuery: CaseInput = {
  id: 'fa-expense-query',
  version: 1,
  careerId: 'office-admin-finance',
  kind: 'internal',
  title: 'An employee queries a rejected expense claim',
  summary: 'Owen wants to know why his taxi claim was turned down, and is not happy.',
  from: { name: 'Owen Clarke', role: 'Consultant', organisation: 'Advisory team' },
  trigger: { afterAssignment: 'payment-run' },
  deadlineHours: 6,
  email: {
    subject: 'Why was my taxi claim rejected?',
    body: `Hi,

My taxi claim of **£86.40** from the Northgate Motors workshop on 18 March was rejected and I don’t understand why. I was carrying the projector and two boxes of workshop materials, and the client is an hour from the station. Everyone takes taxis to that site.

Can you sort this out? I’m £86 out of pocket.

Owen`,
  },
  whyItMatters:
    'Expense policies protect the company’s money, but they only work if they are applied consistently and explained fairly. A good finance team explains the rule, applies any exception the policy allows, and tells people exactly how to fix their claim.',
  objectives: [
    'Apply an expense policy, including its exceptions',
    'Find what is missing from a claim',
    'Explain a decision to a colleague fairly and helpfully',
  ],
  evidence: [
    {
      id: 'policy',
      title: 'Expenses policy, section 4: travel',
      text: 'Use public transport where reasonable. **Taxis** are allowed after 9 pm, or when carrying **heavy or bulky equipment** for work, or where no public transport is available.\n\nEvery claim needs an **itemised receipt** and the **business reason**. Claims without a receipt are rejected and can be resubmitted within 30 days.',
    },
    {
      id: 'claim',
      title: 'Owen’s claim EXP-3318',
      table: {
        head: ['Field', 'Value'],
        rows: [
          ['Date', '18 March'],
          ['Description', 'Taxi, station to Northgate Motors and back'],
          ['Amount', '£86.40'],
          ['Business reason', '(blank)'],
          ['Receipt', 'Not attached'],
          ['Decision', 'Rejected: no receipt'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'why',
      kind: 'review',
      title: 'Why the claim was rejected',
      prompt: 'Which of these are real problems with the claim?',
      points: 30,
      findings: [
        {
          id: 'receipt',
          text: 'There is no receipt.',
          issue: true,
          why: 'Every claim needs an itemised receipt.',
        },
        {
          id: 'reason',
          text: 'The business reason is blank.',
          issue: true,
          why: 'The reason is what shows the taxi was allowed.',
        },
        {
          id: 'taxi-banned',
          text: 'Taxis are never allowed for daytime trips.',
          issue: false,
          why: 'They are allowed when carrying bulky equipment, which Owen was.',
        },
        {
          id: 'too-late',
          text: 'It is too late to resubmit.',
          issue: false,
          why: 'Claims can be resubmitted within 30 days; 18 March is well within that.',
        },
      ],
    },
    {
      id: 'decision',
      kind: 'decide',
      title: 'What to do',
      prompt: 'How do you resolve it?',
      points: 35,
      options: [
        {
          id: 'resubmit',
          label:
            'Explain the rule: resubmit with the receipt and the reason (carrying the projector and materials), and it will be approved',
          verdict: 'best',
          why: 'The taxi is allowed under the equipment exception; the claim just needs the evidence every claim needs.',
          effects: { trust: { senior: 2 }, indicators: { satisfaction: 2 } },
        },
        {
          id: 'pay-anyway',
          label: 'Approve it now without a receipt: the reason is obviously fine',
          verdict: 'poor',
          why: 'Paying without a receipt breaks the policy for everyone and fails an audit; consistency is what makes rules fair.',
          effects: { indicators: { discipline: -4, risk: 3 } },
        },
        {
          id: 'refuse',
          label: 'Keep it rejected: taxis should be avoided',
          verdict: 'poor',
          why: 'The policy allows taxis when carrying equipment. Refusing a valid expense is unfair and damages trust.',
          effects: { indicators: { satisfaction: -3 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Owen Clarke',
      title: 'Reply to Owen',
      prompt: 'Explain why it was rejected and exactly what he needs to do.',
      points: 35,
      minWords: 45,
      mentions: [['receipt'], ['reason', 'equipment', 'projector'], ['resubmit']],
      avoid: [
        {
          terms: ['your fault', 'should have known'],
          why: 'Be helpful, not blaming: many people miss the receipt rule.',
        },
      ],
      model:
        'Hi Owen, sorry for the hassle. Your claim was rejected only because there was no receipt and the business reason was blank. Taxis are allowed when you are carrying equipment, so the trip itself is fine: please resubmit EXP-3318 with the receipt (the taxi firm can email a copy) and the reason, carrying the projector and workshop materials, and I will make sure it is approved this week. Thanks, {name}',
    },
  ],
  outcomes: {
    pass: {
      trust: { manager: 2, senior: 1 },
      reputation: 1,
      indicators: { satisfaction: 2 },
    },
    fail: { indicators: { satisfaction: -2 } },
    lapse: { indicators: { satisfaction: -3 }, reputation: -1 },
  },
  replies: {
    excellent: `Hi {name},

Thanks, that’s really clear. Receipt found and claim resubmitted!

Owen`,
    good: `Hi {name},

Thanks, I’ll resubmit it.

Owen`,
    pass: `Hi {name},

OK, but I’m still not sure what I need to send.

Owen`,
    fail: `Hi {name},

That doesn’t really help. I’ll ask Priya.

Owen`,
  },
  lapseLog: 'Owen complained to {manager} that nobody answered about his expenses.',
  skills: { 'finance-basics': 25, accuracy: 15 },
  xp: 70,
}

export const FINANCE_CASES: CaseInput[] = [shortDelivery, expenseQuery]
