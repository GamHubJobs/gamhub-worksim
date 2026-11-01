/**
 * Alternative versions of cases (see `game/caseVariants.ts`). Each variant
 * changes the people, organisations, references, circumstances or figures,
 * and the answers with them; the steps and marks stay the same. All text pairs
 * are applied together in one pass, longest first, so they never affect each
 * other. Renamed people keep the same pronouns as the original.
 */

export interface CaseVariant {
  id: string
  /** Text replacements, applied to every text in the case. */
  text: Array<[from: string, to: string]>
  /** Whole-text replacements, e.g. a table cell "2" (too short to replace inside other text). */
  exact?: Array<[from: string, to: string]>
  /** Answer and amount replacements (the numbers grading uses). */
  numbers?: Array<[from: number, to: number]>
}

export const CASE_VARIANTS: Record<string, CaseVariant[]> = {
  // Finance & Admin -------------------------------------------------------
  'fa-short-delivery': [
    {
      // A different supplier, and dearer toner: every total and the answer change.
      id: 'brightline',
      text: [
        ['Karen Holt', 'Dana Whitfield'],
        ['Karen', 'Dana'],
        ['Meadow Office Supplies', 'Brightline Supplies'],
        ['MOS-2291', 'BLS-7716'],
        ['PO-4471', 'PO-4518'],
        ['DN-8820', 'DN-9034'],
        ['£25.00', '£30.00'],
        ['£150.00', '£180.00'],
        ['£510.00', '£540.00'],
        ['£102.00', '£108.00'],
        ['£612.00', '£648.00'],
        ['£612', '£648'],
        ['£552', '£576'],
        ['552', '576'],
        ['£100', '£120'],
        ['£460', '£480'],
        ['£60', '£72'],
      ],
      numbers: [[552, 576]],
    },
  ],
  'fa-expense-query': [
    {
      id: 'train',
      text: [
        ['Owen Clarke', 'Liam Foster'],
        ['Owen', 'Liam'],
        ['EXP-3318', 'EXP-4102'],
        ['£86.40', '£64.80'],
        ['£86', '£65'],
      ],
    },
  ],
  // Accounting -------------------------------------------------------------
  'acc-vat-request': [
    {
      // A different client and different invoices: the VAT answer changes.
      id: 'kingsway',
      text: [
        ['Leah Grant', 'Nadia Price'],
        ['Leah', 'Nadia'],
        ['Brightpath Clinics', 'Kingsway Clinics'],
        ['Brightpath', 'Kingsway'],
        ['INV-1027', 'INV-2027'],
        ['INV-1033', 'INV-2034'],
        ['INV-1042', 'INV-2041'],
        ['£1,800', '£2,100'],
        ['£2,250', '£2,400'],
        ['£1,980', '£1,860'],
        ['£6,030', '£6,360'],
        ['£1,206', '£1,272'],
        ['1,206', '1,272'],
        ['1206', '1272'],
      ],
      numbers: [[1206, 1272]],
    },
  ],
  'acc-statement-dispute': [
    {
      id: 'kestrel',
      text: [
        ['Martin Ellis', 'Graham Doyle'],
        ['Martin', 'Graham'],
        ['Harbour Foods', 'Kestrel Foods'],
        ['Harbour', 'Kestrel'],
      ],
    },
  ],
  // IT Help Desk -----------------------------------------------------------
  'it-ticket-chaser': [
    {
      id: 'novak',
      text: [
        ['Hannah Fischer', 'Ella Novak'],
        ['Hannah', 'Ella'],
        ['INC-1984', 'INC-2041'],
        ['LT-0144', 'LT-0187'],
      ],
    },
  ],
  'it-admin-rights': [
    {
      id: 'depot-planner',
      text: [['RouteWise', 'DepotPlanner']],
    },
  ],
  // Digital Marketing ------------------------------------------------------
  'mkt-unhappy-results': [
    {
      id: 'lang-joinery',
      text: [
        ['Okafor Build', 'Lang Joinery'],
        ['Daniel Okafor', 'Peter Lang'],
        ['Daniel', 'Peter'],
        ['Okafor', 'Lang'],
      ],
    },
  ],
  'mkt-brief-change': [
    {
      id: 'ashdown',
      text: [
        ['Rita Osei', 'Joy Mensah'],
        ['Rita', 'Joy'],
        ['Meadow Care Homes', 'Ashdown Care Homes'],
        ['Meadow', 'Ashdown'],
      ],
    },
  ],
  // Data Analysis ----------------------------------------------------------
  'data-numbers-mismatch': [
    {
      // Smaller figures: the VAT check gives a different answer.
      id: 'smaller-quarter',
      text: [
        ['£30k', '£25k'],
        ['£30,000', '£25,000'],
        ['£150,000', '£125,000'],
        ['£180,000', '£150,000'],
        ['150,000', '125,000'],
        ['180,000', '150,000'],
        ['150k', '125k'],
        ['180k', '150k'],
        ['£150', '£125'],
        ['£180', '£150'],
        ['£30', '£25'],
      ],
      numbers: [[180000, 150000]],
    },
  ],
  'data-extra-analysis': [
    {
      // A smaller survey over fewer regions.
      id: 'ten-regions',
      text: [
        ['312 responses', '287 responses'],
        ['12 regions', '10 regions'],
        ['Six regions', 'Five regions'],
      ],
    },
  ],
  // Software Development ---------------------------------------------------
  'dev-vague-bug': [
    {
      // The same problem, a day later in the week.
      id: 'friday-close',
      text: [
        ['Thursday 5 pm', 'Friday 12 pm'],
        ['payroll runs Friday', 'payroll runs Monday'],
        ['Today is Wednesday', 'Today is Thursday'],
        ['Thursday', 'Friday'],
      ],
    },
  ],
  'dev-feature-deadline': [
    {
      // Bigger estimates: the total changes.
      id: 'bigger-estimates',
      text: [
        [
          '1 + 3 + 2 + 4 = 10 days, more than three times what is available.',
          '1 + 3 + 3 + 5 = 12 days, four times what is available.',
        ],
        ['Ten days in three', 'Twelve days in three'],
        ['10 developer days', '12 developer days'],
        ['10 days', '12 days'],
        ['ten days', 'twelve days'],
      ],
      exact: [
        ['2', '3'],
        ['4', '5'],
      ],
      numbers: [[10, 12]],
    },
  ],
  // Operations: suppliers and references change; amounts stay, because the
  // approval rules (limits and budgets) depend on them.
  'ops-acc-payment-run': [
    {
      id: 'new-suppliers',
      text: [
        ['MOS-2310', 'MOS-2384'],
        ['CL-88410', 'CL-90217'],
        ['FC-2240', 'FC-2311'],
        ['NB-7721', 'NB-7790'],
      ],
    },
  ],
}
