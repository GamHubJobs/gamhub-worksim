/**
 * Everything specific to the accounting career: its tasks, cases and readiness
 * assessments. Loaded only when a save of this career is opened (see `loader.ts`).
 */
import type { CareerPack } from '../loader'
import { bankReconciliation } from '../assignments/accounting/bankReconciliation'
import { booksBankRec } from '../assignments/accounting/booksBankRec'
import { booksJournals } from '../assignments/accounting/booksJournals'
import { booksMonthEndClose } from '../assignments/accounting/booksMonthEndClose'
import { booksPayroll } from '../assignments/accounting/booksPayroll'
import { booksSalesPurchases } from '../assignments/accounting/booksSalesPurchases'
import { depreciation } from '../assignments/accounting/depreciation'
import { journalEntries } from '../assignments/accounting/journalEntries'
import { monthEnd } from '../assignments/accounting/monthEnd'
import {
  quarterCloseAdjustments,
  quarterCloseBoardPack,
  quarterCloseVariances,
} from '../assignments/accounting/projectQuarterClose'
import { ACCOUNTING_CASES } from '../cases/accounting'
import { OPERATIONS_ACCOUNTING } from '../cases/operations/accounting'
import { WORKFLOW_ACCOUNTING } from '../cases/workflows/accounting'
import { MEETING_ACCOUNTING } from '../cases/meetings/accounting'
import { INCIDENT_ACCOUNTING } from '../cases/incidents/accounting'
import { LEADERSHIP_ACCOUNTING } from '../cases/leadership/accounting'
import { PROGRAMME_ACCOUNTING } from '../cases/programme/accounting'
import { ADVANCED_ACCOUNTING } from '../cases/advanced/accounting'
import { ASSESSMENTS_ACCOUNTING } from '../assessments/accounting'

export const PACK: CareerPack = {
  careerId: 'accounting',
  assignments: [
    bankReconciliation,
    booksBankRec,
    booksJournals,
    booksMonthEndClose,
    booksPayroll,
    booksSalesPurchases,
    depreciation,
    journalEntries,
    monthEnd,
    quarterCloseAdjustments,
    quarterCloseBoardPack,
    quarterCloseVariances,
  ],
  cases: [
    ...ACCOUNTING_CASES,
    ...OPERATIONS_ACCOUNTING,
    ...WORKFLOW_ACCOUNTING,
    ...MEETING_ACCOUNTING,
    ...INCIDENT_ACCOUNTING,
    ...LEADERSHIP_ACCOUNTING,
    ...PROGRAMME_ACCOUNTING,
    ...ADVANCED_ACCOUNTING,
  ],
  assessments: ASSESSMENTS_ACCOUNTING,
}
