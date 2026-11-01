/** Accounting cases. */
import type { CaseInput } from '../schema'

const statementDispute: CaseInput = {
  id: 'acc-statement-dispute',
  version: 1,
  careerId: 'accounting',
  kind: 'client',
  title: 'A client disputes their statement',
  summary: 'Harbour Foods says they owe £2,400 less than our statement shows.',
  from: { name: 'Martin Ellis', role: 'Finance Manager', organisation: 'Harbour Foods' },
  trigger: { afterAssignment: 'books-sales-purchases' },
  deadlineHours: 7,
  email: {
    subject: 'Your statement is wrong: we paid INV-1031',
    body: `Hello,

Your March statement says we owe **£9,600**. We paid invoice **INV-1031 (£2,400)** on 4 March by bank transfer, so by our records we owe **£7,200**. Please correct the statement; our directors will not approve further payments until it agrees with our ledger.

Our remittance advice is attached.

Martin Ellis
Finance Manager, Harbour Foods`,
  },
  whyItMatters:
    'A wrong statement damages trust and delays payment. Investigating calmly, finding where the money went, correcting it and telling the client clearly is a core part of credit control.',
  objectives: [
    'Trace a client payment through the bank and the ledger',
    'Correct a misallocated payment',
    'Explain a correction to a client clearly',
  ],
  evidence: [
    {
      id: 'statement',
      title: 'Our statement for Harbour Foods (31 March)',
      table: {
        head: ['Invoice', 'Date', 'Amount', 'Paid'],
        rows: [
          ['INV-1031', '10 Feb', '£2,400', 'No'],
          ['INV-1039', '27 Feb', '£7,200', 'No'],
          ['Balance owed', '', '£9,600', ''],
        ],
      },
    },
    {
      id: 'remittance',
      title: 'Harbour Foods remittance advice',
      text: 'Payment of £2,400.00 for INV-1031, sent 4 March by bank transfer, reference “HF INV1031”.',
    },
    {
      id: 'bank',
      title: 'Our bank statement, 4 March',
      table: {
        head: ['Date', 'Reference', 'Amount in', 'Allocated to'],
        rows: [['4 Mar', 'HF INV1031', '£2,400.00', 'Northgate Motors (INV-1038)']],
      },
    },
    {
      id: 'northgate',
      title: 'Northgate Motors account',
      text: 'INV-1038 (£8,000) shows a part payment of £2,400 on 4 March. Northgate has not paid anything since February.',
    },
  ],
  steps: [
    {
      id: 'trace',
      kind: 'review',
      title: 'Find what happened',
      prompt: 'Which of these are true?',
      points: 30,
      findings: [
        {
          id: 'misallocated',
          text: 'Harbour Foods’ payment arrived, but it was allocated to Northgate Motors.',
          issue: true,
          why: 'The bank reference says HF INV1031 but the payment was matched to INV-1038.',
        },
        {
          id: 'northgate-wrong',
          text: 'Northgate Motors’ balance is now understated by £2,400.',
          issue: true,
          why: 'Their account shows a payment they never made, so it must be reversed too.',
        },
        {
          id: 'not-received',
          text: 'The payment never reached our bank account.',
          issue: false,
          why: 'The bank statement shows £2,400 received on 4 March.',
        },
        {
          id: 'invoice-wrong',
          text: 'Invoice INV-1031 was raised for the wrong amount.',
          issue: false,
          why: 'The invoice and the payment are both £2,400.',
        },
      ],
    },
    {
      id: 'balance',
      kind: 'figure',
      title: 'The correct balance',
      prompt: 'What does Harbour Foods really owe us after the correction?',
      points: 20,
      answer: 7200,
      tolerance: 0.5,
      unit: '£',
      why: 'Only INV-1039 (£7,200) is unpaid once their £2,400 payment is allocated to INV-1031.',
    },
    {
      id: 'fix',
      kind: 'decide',
      title: 'The correction',
      prompt: 'How do you put it right?',
      points: 25,
      options: [
        {
          id: 'reallocate',
          label:
            'Move the £2,400 from Northgate’s INV-1038 to Harbour Foods’ INV-1031, then send Harbour Foods a corrected statement',
          verdict: 'best',
          why: 'Both accounts become correct and the client gets written proof.',
          effects: { indicators: { satisfaction: 3, risk: -3 } },
        },
        {
          id: 'credit-note',
          label: 'Issue Harbour Foods a £2,400 credit note to make the balance agree',
          verdict: 'poor',
          why: 'A credit note says we gave money back: the books would be wrong twice and Northgate still looks as if it paid.',
          effects: { indicators: { risk: 5 } },
        },
        {
          id: 'statement-only',
          label:
            'Send a corrected statement to Harbour Foods and fix the ledger at month end',
          verdict: 'acceptable',
          why: 'The client is happy, but Northgate’s account stays wrong for weeks and could be chased for the wrong amount.',
          effects: { indicators: { satisfaction: 2, risk: 2 } },
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Martin Ellis, Harbour Foods',
      title: 'Reply to the client',
      prompt: 'Apologise, explain what happened and give the correct balance.',
      points: 25,
      minWords: 50,
      mentions: [['sorry', 'apologise', 'apologies'], ['7,200', '7200'], ['INV-1031']],
      avoid: [
        {
          terms: ['your reference', 'you should have'],
          why: 'Their reference was clear: the mistake was ours, so don’t shift the blame.',
        },
      ],
      model:
        'Dear Martin, thank you for your remittance and apologies for the confusion. Your payment of £2,400 on 4 March was received but allocated to the wrong account by mistake. We have now allocated it to INV-1031, so the only invoice outstanding is INV-1039 and your balance is £7,200. A corrected statement is attached. Kind regards, {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 3 }, reputation: 2, indicators: { satisfaction: 2 } },
    fail: { indicators: { satisfaction: -2 } },
    lapse: { indicators: { satisfaction: -5 }, reputation: -2 },
  },
  replies: {
    excellent: `Dear {name},

Thank you for finding it so quickly and for the corrected statement. Our directors have approved payment of INV-1039.

Martin`,
    good: `Dear {name},

Thank you. We will check the corrected statement and pay what is due.

Martin`,
    pass: `Dear {name},

Thanks; some of this is still unclear to us. Could you confirm the balance in writing?

Martin`,
    fail: `Dear {name},

This does not answer our question. Please ask your manager to call me.

Martin`,
  },
  lapseLog:
    'Harbour Foods escalated the statement dispute to your manager: it was not answered in time.',
  skills: { reconciliation: 30, bookkeeping: 20, accuracy: 15 },
  xp: 90,
}

const vatRequest: CaseInput = {
  id: 'acc-vat-request',
  version: 1,
  careerId: 'accounting',
  kind: 'client',
  title: 'A client asks for their VAT figures',
  summary: 'Brightpath Clinics needs the VAT we charged them this quarter, today.',
  from: {
    name: 'Leah Grant',
    role: 'Practice Manager',
    organisation: 'Brightpath Clinics',
  },
  trigger: { afterAssignment: 'journal-entries' },
  deadlineHours: 5,
  email: {
    subject: 'VAT on your invoices this quarter',
    body: `Hi,

Our accountant is finishing our VAT return today and needs the **total VAT you charged us** in January to March. Could you send it this afternoon? Also, could you send me the same figures for Okafor Build? We share an office with them and they asked me to collect theirs too.

Thanks,
Leah Grant
Practice Manager, Brightpath Clinics`,
  },
  whyItMatters:
    'Clients rely on accurate figures for their own tax returns. Answering quickly helps them; keeping other clients’ information confidential is a legal duty.',
  objectives: [
    'Calculate VAT from invoice records',
    'Protect other clients’ confidential information',
    'Answer a client request accurately and quickly',
  ],
  evidence: [
    {
      id: 'invoices',
      title: 'Invoices to Brightpath Clinics, January to March',
      text: 'All amounts are net (before VAT). VAT is charged at 20%.',
      table: {
        head: ['Invoice', 'Date', 'Net'],
        rows: [
          ['INV-1027', '14 Jan', '£1,800'],
          ['INV-1033', '11 Feb', '£2,250'],
          ['INV-1042', '31 Mar', '£1,980'],
        ],
      },
    },
  ],
  steps: [
    {
      id: 'vat',
      kind: 'figure',
      title: 'VAT charged',
      prompt: 'How much VAT did we charge Brightpath Clinics in January to March?',
      points: 35,
      answer: 1206,
      tolerance: 0.5,
      unit: '£',
      why: 'Net invoices total £6,030; 20% of that is £1,206.',
    },
    {
      id: 'okafor',
      kind: 'decide',
      title: 'The request for another client’s figures',
      prompt: 'What do you do about Okafor Build’s figures?',
      points: 35,
      options: [
        {
          id: 'decline',
          label:
            'Decline politely: we can only send Okafor Build’s figures to Okafor Build',
          verdict: 'best',
          why: 'Client information is confidential, however friendly the request. Okafor can ask us directly.',
          effects: { indicators: { risk: -2 } },
        },
        {
          id: 'send',
          label: 'Send them too: the two businesses share an office',
          verdict: 'poor',
          why: 'Sharing an office does not give consent. This would be a data breach.',
          effects: { indicators: { risk: 8 }, reputation: -3 },
        },
        {
          id: 'ask-okafor',
          label: 'Email Okafor Build to ask if they want their figures sent to Leah',
          verdict: 'acceptable',
          why: 'Checking consent is safer than sending, but the simplest safe answer is to send Okafor their own figures.',
        },
      ],
    },
    {
      id: 'reply',
      kind: 'reply',
      to: 'Leah Grant, Brightpath Clinics',
      title: 'Reply to the client',
      prompt: 'Give the VAT figure and deal with the request for Okafor Build’s figures.',
      points: 30,
      minWords: 40,
      mentions: [
        ['1,206', '1206'],
        ['Okafor'],
        ['confidential', 'directly', 'only send'],
      ],
      avoid: [
        {
          terms: ['attached are Okafor', 'here are Okafor'],
          why: 'Never include another client’s figures.',
        },
      ],
      model:
        'Hi Leah, the total VAT we charged Brightpath Clinics from January to March is £1,206, on net invoices of £6,030 (INV-1027, INV-1033 and INV-1042). I am afraid we can only send Okafor Build’s figures to Okafor Build, as client information is confidential; they can email us directly and we will reply today. Best wishes, {name}',
    },
  ],
  outcomes: {
    pass: { trust: { manager: 2 }, reputation: 1, indicators: { satisfaction: 2 } },
    fail: { indicators: { satisfaction: -1 } },
    lapse: { indicators: { satisfaction: -4 } },
  },
  replies: {
    excellent: `Hi {name},

Perfect, thank you, and that makes sense about Okafor. They will email you themselves.

Leah`,
    good: `Hi {name},

Thanks, that is what we needed.

Leah`,
    pass: `Hi {name},

Thanks; our accountant has a couple of questions about the figure.

Leah`,
    fail: `Hi {name},

That doesn’t look right. Could someone else check it?

Leah`,
  },
  lapseLog:
    'Brightpath Clinics filed their VAT return late: they didn’t get the figures in time.',
  skills: { accuracy: 25, bookkeeping: 20, 'financial-reporting': 15 },
  xp: 70,
}

export const ACCOUNTING_CASES: CaseInput[] = [vatRequest, statementDispute]
