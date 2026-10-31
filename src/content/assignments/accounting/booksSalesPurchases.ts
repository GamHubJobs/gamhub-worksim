import type { AssignmentInput } from '../../schemas'
import { apply, approved, marchBooks, paid } from '../../../tools/books/scenario'

/**
 * Accounting (Assistant Accountant): sales and purchases in Books. Raise
 * invoices from the month's work, record a customer's payment, enter
 * supplier bills (spotting one that is already in the books) and pay an
 * overdue bill. Teaches: receivables and payables, VAT on sales and
 * purchases, income and expense accounts, and avoiding duplicate payments.
 */
const start = marchBooks()

const solution = apply(start, [
  approved('sales', 'c1', {
    number: 'INV-1040',
    date: '2026-03-31',
    dueDate: '2026-04-30',
    lines: [
      {
        description: 'Advisory days',
        quantity: 4,
        unitPrice: 650,
        account: '4000',
        vat: true,
      },
    ],
  }),
  approved('sales', 'c2', {
    number: 'INV-1041',
    date: '2026-03-31',
    dueDate: '2026-04-30',
    lines: [
      {
        description: 'Workshops',
        quantity: 2,
        unitPrice: 900,
        account: '4100',
        vat: true,
      },
      { description: 'Travel', quantity: 1, unitPrice: 180, account: '4000', vat: true },
    ],
  }),
  paid('sales', 'INV-1038', '2026-03-25', 9600),
  approved('purchases', 's1', {
    number: 'MOS-2291',
    date: '2026-03-12',
    dueDate: '2026-04-11',
    lines: [
      {
        description: 'Paper and toner',
        quantity: 1,
        unitPrice: 185,
        account: '6400',
        vat: true,
      },
    ],
  }),
  approved('purchases', 's2', {
    number: 'CL-89017',
    date: '2026-03-20',
    dueDate: '2026-04-19',
    lines: [
      {
        description: 'Broadband and phones, March',
        quantity: 1,
        unitPrice: 240,
        account: '6100',
        vat: true,
      },
    ],
  }),
  paid('purchases', 'FC-2207', '2026-03-31', 4140),
])

export const booksSalesPurchases: AssignmentInput = {
  id: 'books-sales-purchases',
  version: 1,
  careerId: 'accounting',
  levelId: 'assistant-accountant',
  order: 4,
  kind: 'tool',
  title: 'Invoices, bills and payments in Books',
  summary:
    'Invoice the month’s client work, record what came in, and process the supplier bills.',
  estimatedMinutes: 40,
  from: 'manager',
  briefing: {
    subject: 'Sales and purchases for March',
    body: `Hi {name},

Now that you’re an Assistant Accountant, you’ll run sales and purchases. Everything goes through **Books**: approving an invoice or bill posts the journal for you.

**Sales**
1. Invoice **Harbour Foods** for 4 advisory days at **£650** a day (consulting fees, VAT at 20%). Date 31 March, due 30 April, invoice number **INV-1040**.
2. Invoice **Brightpath Clinics** for 2 workshops at **£900** each (training income) and **£180** travel (consulting fees), all with VAT. Same dates, **INV-1041**.
3. **Northgate Motors** paid INV-1038 in full on 25 March. Record the payment.

**Purchases**
4. Enter the bill from **Meadow Office Supplies**, reference **MOS-2291**, dated 12 March: paper and toner, **£185** plus VAT (office supplies).
5. Enter the bill from **Clearline Telecom**, reference **CL-89017**, dated 20 March: broadband and phones, **£240** plus VAT (utilities).
6. Clearline also sent a reminder for **CL-88410**. Check whether it’s already in Books before you do anything with it.
7. Pay **Ferris & Co**’s overdue bill FC-2207 in full on 31 March.

Check the aged receivables and payables when you’re done, then submit it to me.

Daniel`,
  },
  whyItMatters:
    'Invoicing on time keeps cash coming in; entering bills correctly (and only once) keeps it from going out twice. In every finance team, receivables and payables are where accuracy is felt directly by customers and suppliers.',
  objectives: [
    'Raise sales invoices with the right income accounts and VAT',
    'Enter supplier bills and record payments in and out',
    'Spot a duplicate bill before it is paid twice',
  ],
  steps: [
    {
      id: 'invoices',
      title: 'Raise the invoices',
      instructions:
        'Open **Sales**, click **New invoice** and choose the customer. Fill in the number, dates and lines (description, quantity, unit price, account, VAT), check the totals, then click **Approve invoice**.',
      hint: 'Harbour Foods: 4 × £650 = £2,600 + VAT £520 = £3,120.',
    },
    {
      id: 'receipt',
      title: 'Record the payment received',
      instructions:
        'In **Sales**, open INV-1038, enter the date (25 March) and the amount, and click **Record payment**.',
    },
    {
      id: 'bills',
      title: 'Enter the bills',
      instructions:
        'Open **Purchases**, click **New bill**, choose the supplier and enter their reference, dates and lines, then **Approve bill**. Look at the list before you enter anything from the reminder.',
      hint: 'Books warns you if a supplier’s reference has already been entered.',
    },
    {
      id: 'pay',
      title: 'Pay the overdue bill',
      instructions: 'Open FC-2207 in **Purchases** and record the payment on 31 March.',
    },
    {
      id: 'check',
      title: 'Check and hand in',
      instructions:
        'Click **Aged receivables** and **Aged payables** to see who still owes what, then **Submit to {manager}** in the task pane.',
    },
  ],
  tool: {
    id: 'books',
    title: 'Cobalt Ridge books: March sales and purchases',
    start,
    solution,
    checks: [
      {
        id: 'invoices',
        type: 'documents',
        side: 'sales',
        items: [
          { contact: 'Harbour Foods', total: 3120 },
          { contact: 'Brightpath Clinics', total: 2376 },
        ],
        title: 'Invoices raised and approved',
        points: 25,
        why: 'An invoice that is wrong or never approved means the client is not asked to pay.',
        hint: 'Harbour Foods: £3,120 with VAT. Brightpath Clinics: 2 × £900 + £180 = £1,980 + VAT = £2,376.',
      },
      {
        id: 'income-split',
        type: 'balances',
        accounts: ['4000', '4100'],
        title: 'Income on the right accounts',
        points: 10,
        why: 'Training and consulting are reported separately to the directors.',
        hint: 'Workshops are training income (4100); advisory days and travel are consulting fees (4000).',
      },
      {
        id: 'receipt',
        type: 'payments',
        side: 'sales',
        items: [{ number: 'INV-1038', paid: 9600 }],
        title: 'Customer payment recorded',
        points: 10,
        why: 'Unrecorded receipts make customers look overdue and chase people who have paid.',
        hint: 'Open INV-1038 in Sales and record £9,600 on 25 March.',
      },
      {
        id: 'bills',
        type: 'documents',
        side: 'purchases',
        items: [
          { contact: 'Meadow Office Supplies', total: 222 },
          { contact: 'Clearline Telecom', total: 288 },
        ],
        title: 'Supplier bills entered',
        points: 20,
        why: 'Bills must be in the books to be paid on time and for VAT to be reclaimed.',
        hint: 'MOS-2291: £185 + VAT = £222. CL-89017: £240 + VAT = £288.',
      },
      {
        id: 'bill-paid',
        type: 'payments',
        side: 'purchases',
        items: [{ number: 'FC-2207', paid: 4140 }],
        title: 'Overdue bill paid',
        points: 10,
        why: 'Paying suppliers on time protects the company’s reputation and credit.',
        hint: 'Open FC-2207 in Purchases and record £4,140 on 31 March.',
      },
      {
        id: 'balances',
        type: 'balances',
        accounts: ['1100', '1200', '2100', '2200', '6100', '6400'],
        title: 'Receivables, payables, bank and VAT',
        points: 25,
        why: 'These balances show at once if anything was missed, or entered twice.',
        hint: 'If accounts payable is £3,200 too high, the Clearline reminder was entered again: it was already in Books.',
      },
    ],
  },
  passScore: 70,
  xp: 130,
  skills: { bookkeeping: 45, accuracy: 30, 'finance-basics': 20 },
  feedback: {
    excellent: `Hi {name},

Spot on. Both invoices are out, Northgate is cleared, the bills are in, and you didn’t fall for the Clearline reminder: it was already in the books. Paying it twice is exactly the kind of mistake that costs real money.

Daniel`,
    good: `Hi {name},

Good work; a couple of things to fix. See the notes.

Daniel`,
    pass: `Hi {name},

Some invoices, bills or payments are missing or wrong. The notes show which.

Daniel`,
    fail: `Hi {name},

Not yet. Start with the Harbour Foods invoice in Sales, then work down the list.

Daniel`,
  },
}
