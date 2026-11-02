/** Workflows cases: office-admin-finance. */
import type { CaseInput } from '../schema'
import { replies, followUpReplies } from './shared'

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

export const WORKFLOW_FINANCE: CaseInput[] = [faPurchaseOrder, faPurchaseOrderFix]
