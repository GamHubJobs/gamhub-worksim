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
  // Engineering -------------------------------------------------------------
  'eng-steel-order': [
    {
      id: 'eight-beams',
      text: [
        ['6 beams of NB-200', '8 beams of NB-200'],
        ['6 × 6 m = 36 m, plus 10% = 39.6 m.', '8 × 6 m = 48 m, plus 10% = 52.8 m.'],
        ['39.6 m (36 m plus 10%)', '52.8 m (48 m plus 10%)'],
        [
          'Four 12 m lengths (48 m): each cuts into two 6 m beams with no joints',
          'Five 12 m lengths (60 m): each cuts into two 6 m beams with no joints',
        ],
        [
          'Six 6 m beams need three 12 m lengths, plus one spare for the allowance.',
          'Eight 6 m beams need four 12 m lengths, plus one spare for the allowance.',
        ],
        ['Three 12 m lengths (36 m)', 'Four 12 m lengths (48 m)'],
        [
          'please order four, which gives us the six beams with a spare',
          'please order five, which gives us the eight beams with a spare',
        ],
        ['39.6', '52.8'],
      ],
      numbers: [[39.6, 52.8]],
    },
  ],
  'eng-adv-voltage-drop': [
    {
      id: 'longer-run',
      text: [
        ['60 m', '70 m'],
        ['(2 × 60 m)', '(2 × 70 m)'],
        ['32 × 120 × 0.003 = 11.52 V, just over', '32 × 140 × 0.003 = 13.44 V, over'],
        ['11.52', '13.44'],
        ['The drop is just over the 11.5 V limit.', 'The drop is over the 11.5 V limit.'],
        ['it’s only 0.02 V over', 'it’s only 1.94 V over'],
      ],
      numbers: [[11.52, 13.44]],
    },
  ],
  'eng-adv-emissions': [
    {
      id: 'week-four',
      text: [
        ['(180 + 210 + 195 + 199) ÷ 4 = 196.', '(180 + 210 + 195 + 191) ÷ 4 = 194.'],
        ['196', '194'],
      ],
      exact: [['199', '191']],
      numbers: [[196, 194]],
    },
  ],
  'eng-client-change': [{ id: 'press', text: [['packing machine', 'pallet press']] }],
  // Law ---------------------------------------------------------------------
  'law-disbursements': [
    {
      id: 'dearer-courier',
      text: [
        ['£35', '£48'],
        ['550', '563'],
      ],
      numbers: [[550, 563]],
    },
  ],
  'law-adv-settlement': [
    {
      id: 'higher-costs',
      text: [
        ['£6,000', '£8,000'],
        ['15,000', '13,000'],
        ['15000', '13000'],
      ],
      numbers: [[15000, 13000]],
    },
  ],
  'law-adv-costs-estimate': [
    {
      id: 'higher-rate',
      text: [
        ['£160', '£175'],
        ['4,800', '5,250'],
        ['4800', '5250'],
        ['£960', '£1,050'],
        ['£1,600', '£1,750'],
        ['£2,240', '£2,450'],
      ],
      numbers: [[4800, 5250]],
    },
  ],
  'law-will-i-win': [{ id: 'thursday', text: [['next week', 'on Thursday']] }],
  // Healthcare -------------------------------------------------------------
  'hc-supplies-count': [
    {
      // A bigger order and a bigger shortfall.
      id: 'bigger-order',
      text: [
        ['9 boxes arrived instead of 12', '11 boxes arrived instead of 15'],
        ['signed for the 9', 'signed for the 11'],
        ['3 boxes are missing', '4 boxes are missing'],
        ['3 boxes', '4 boxes'],
        ['three boxes', 'four boxes'],
        ['9 boxes', '11 boxes'],
        ['nine boxes', 'eleven boxes'],
        ['30 dressings', '40 dressings'],
        ['30', '40'],
      ],
      exact: [
        ['12', '15'],
        ['9', '11'],
      ],
      numbers: [[30, 40]],
    },
  ],
  'hc-adv-hygiene-audit': [
    {
      id: 'worse-month',
      text: [
        ['84 of 100', '80 of 100'],
        ['84%', '80%'],
        ['12 of 20', '8 of 20'],
        ['84', '80'],
      ],
      exact: [['12', '8']],
      numbers: [[84, 80]],
    },
  ],
  'hc-adv-clinic-dna': [
    {
      id: 'more-missed',
      text: [
        [
          '30 missed out of 180 (150 seen + 30 missed)',
          '45 missed out of 195 (150 seen + 45 missed)',
        ],
        ['30 of 180', '45 of 195'],
        ['16.7%', '23.1%'],
        ['16.7', '23.1'],
      ],
      exact: [['30', '45']],
      numbers: [[16.7, 23.1]],
    },
  ],
  'hc-complaint': [
    {
      id: 'ward-7',
      text: [
        ['Ward 6', 'Ward 7'],
        ['17:00', '18:30'],
        ['5 pm', '6.30 pm'],
      ],
    },
  ],

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
  // Advanced cases (Phase 7) -------------------------------------------------
  'adv-fa-contract-price': [
    {
      // A cheaper contract and cheaper deep cleans: every total and the answer change.
      id: 'brightway',
      text: [
        ['Gareth Pryce', 'Owen Rees'],
        ['Gareth', 'Owen'],
        ['Sparkle Facility Services', 'Brightway Cleaning'],
        ['Sparkle', 'Brightway'],
        ['SFS-5520', 'BWC-6107'],
        ['£450.00', '£430.00'],
        ['£5,850.00', '£5,590.00'],
        ['£180.00', '£150.00'],
        ['£360.00', '£300.00'],
        ['£6,210.00', '£5,890.00'],
        ['£1,242.00', '£1,178.00'],
        ['£7,452.00', '£7,068.00'],
        ['£7,452', '£7,068'],
        ['£420.00', '£400.00'],
        ['£420', '£400'],
        ['£450', '£430'],
        ['£180', '£150'],
        ['£360', '£300'],
        ['£5,460', '£5,200'],
        ['£5,820', '£5,500'],
        ['£6,984', '£6,600'],
        ['6,984', '6,600'],
        ['6984', '6600'],
      ],
      numbers: [[6984, 6600]],
    },
  ],
  'adv-acc-year-end-sale': [
    {
      id: 'tamar',
      text: [
        ['Fiona Marsh', 'Ruth Bailey'],
        ['Fiona', 'Ruth'],
        ['Alder Engineering', 'Tamar Fabrications'],
        ['Calder Pumps', 'Wessex Valves'],
        ['£48,000', '£56,000'],
        ['£4,800', '£5,600'],
        ['£1,260,000', '£1,245,000'],
        ['£40,000', '£55,000'],
        ['40,000', '55,000'],
        ['40000', '55000'],
      ],
      numbers: [[40000, 55000]],
    },
  ],
  'adv-it-priority-pressure': [
    {
      // A smaller outage that has been running longer: less time left.
      id: 'longer-outage',
      text: [
        ['Paula Reid', 'Megan Lloyd'],
        ['Paula', 'Megan'],
        ['INC-3101', 'INC-4211'],
        ['INC-3102', 'INC-4212'],
        ['INC-3103', 'INC-4213'],
        ['40 people', '25 people'],
        ['Forty people', 'Twenty-five people'],
        ['2.5 hours ago', '3 hours ago'],
        ['so there are 1.5 hours left', 'so there is 1 hour left'],
        ['1.5 hours left', '1 hour left'],
      ],
      exact: [['40', '25']],
      numbers: [[1.5, 1]],
    },
  ],
  'adv-mkt-attribution': [
    {
      // A bigger social budget with more assisted bookings: a lower true cost.
      id: 'riverbend',
      text: [
        ['Victor Hale', 'Simon Ashby'],
        ['Victor', 'Simon'],
        ['Hollow Oak Hotels', 'Riverbend Hotels'],
        [
          '£5,000 ÷ (20 + 180) bookings = £25 a booking.',
          '£6,000 ÷ (24 + 276) bookings = £20 a booking.',
        ],
        ['£5,000', '£6,000'],
        ['20 bookings', '24 bookings'],
        ['180 bookings', '276 bookings'],
        ['180 more bookings', '276 more bookings'],
        ['about £25 a booking', 'about £20 a booking'],
      ],
      exact: [
        ['20', '24'],
        ['180', '276'],
        ['25', '20'],
      ],
      numbers: [[25, 20]],
    },
  ],
  'adv-data-survey-bias': [
    {
      // More app users and more responses: a different response rate.
      id: 'bigger-panel',
      text: [
        ['Gemma Ward', 'Laura Kent'],
        ['Gemma', 'Laura'],
        ['250 ÷ 2,000 = 12.5%.', '300 ÷ 2,500 = 12%.'],
        ['2,000', '2,500'],
        ['250 responses', '300 responses'],
        ['250 app users', '300 app users'],
        ['230 (92%)', '276 (92%)'],
        ['12.5%', '12%'],
        ['12.5', '12'],
      ],
      exact: [['250', '300']],
      numbers: [[12.5, 12]],
    },
  ],
  'adv-dev-slow-report': [
    {
      // More invoices, a faster service: the cost of one call per invoice changes.
      id: 'more-invoices',
      text: [
        ['Irene Shaw', 'Carol Dent'],
        ['Irene', 'Carol'],
        [
          '6,000 × 0.085 s = 510 seconds, or 8.5 minutes.',
          '8,000 × 0.06 s = 480 seconds, or 8 minutes.',
        ],
        ['6,000', '8,000'],
        ['about 85 ms per call', 'about 60 ms per call'],
        ['85 ms', '60 ms'],
        ['about 8.5 minutes', 'about 8 minutes'],
      ],
      numbers: [[510, 480]],
    },
  ],
  // Advanced cases (Phase 8) -------------------------------------------------
  'adv-fa-duplicate-payment': [
    {
      id: 'larkspur',
      text: [
        ['Nadine Shah', 'Ruth Akers'],
        ['Nadine', 'Ruth'],
        ['Kestrel Print', 'Larkspur Print'],
        ['KP-3390', 'LP-4471'],
        ['KP3390', 'LP4471'],
        ['KP-3402', 'LP-4480'],
        ['£1,416.00', '£1,758.00'],
        ['£1,416', '£1,758'],
        ['1,416', '1,758'],
        ['1416', '1758'],
        ['£684.00', '£912.00'],
      ],
      numbers: [[1416, 1758]],
    },
  ],
  'adv-acc-prepayment': [
    {
      id: 'walsh',
      text: [
        ['Colin Barker', 'Peter Walsh'],
        ['Colin', 'Peter'],
        ['Barker Joinery', 'Walsh Kitchens'],
        ['£12,000', '£18,000'],
        ['£1,000 a month', '£1,500 a month'],
        ['£9,000', '£13,500'],
        ['9,000', '13,500'],
        ['9000', '13500'],
        ['£3,000', '£4,500'],
      ],
      numbers: [[9000, 13500]],
    },
  ],
  'adv-it-phishing': [
    {
      id: 'bigger-mailout',
      text: [
        ['4 ÷ 64 = 6.25%, or 6.3% to one decimal place.', '6 ÷ 80 = 7.5%.'],
        ['The 4 people', 'The 6 people'],
        ['Reset the 4 passwords', 'Reset the 6 passwords'],
        ['The 4 stolen passwords', 'The 6 stolen passwords'],
        ['the 4 compromised accounts', 'the 6 compromised accounts'],
        ['all 64 recipients', 'all 80 recipients'],
      ],
      exact: [
        ['64', '80'],
        ['9', '12'],
        ['4', '6'],
      ],
      numbers: [[6.3, 7.5]],
    },
  ],
  'adv-mkt-disclosure': [
    {
      id: 'willow',
      text: [
        ['Karen Lowe', 'Holly Dunn'],
        ['Karen', 'Holly'],
        ['Fernleaf Skincare', 'Willow & Moss'],
        ['Mia', 'Zara'],
        ['£2,400', '£3,000'],
        ['9,600', '15,000'],
        ['£0.25', '£0.20'],
        ['0.25', '0.20'],
      ],
      numbers: [[0.25, 0.2]],
    },
  ],
  'adv-data-segments': [
    {
      id: 'foster',
      text: [
        ['Rob Turner', 'Neil Foster'],
        ['Rob', 'Neil'],
      ],
    },
  ],
  'adv-dev-leaked-key': [
    {
      // Pushed earlier in the day, seen by more people: a longer exposure.
      id: 'earlier-push',
      text: [
        ['Hamid Rezaei', 'Tomasz Nowak'],
        ['Hamid', 'Tomasz'],
        [
          'From Tuesday 16:00 to Wednesday 11:00: 19 hours.',
          'From Tuesday 14:30 to Wednesday 11:00: 20.5 hours.',
        ],
        ['Tuesday 16:00', 'Tuesday 14:30'],
        ['40 people', '55 people'],
      ],
      numbers: [[19, 20.5]],
    },
  ],
}
