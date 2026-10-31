/**
 * Payroll, with simplified UK rules (a monthly personal allowance, basic-rate
 * income tax, employee National Insurance above a monthly threshold, and an
 * employee pension contribution). Posting a pay run records:
 *
 *   Dr Wages and salaries (gross)
 *   Cr PAYE and NI payable (tax + NI, paid to the tax office later)
 *   Cr Pension payable (paid to the pension provider later)
 *   Cr Bank (net pay, paid to the employees)
 */
import { addPostedJournal, round2 } from './ledger'
import type { BooksState, Employee, PayRun, Payslip } from './schema'
import { BANK } from './trade'

export const WAGES = '7000'
export const PAYE_NI = '2210'
export const PENSION = '2220'

/** One month's payslip for an employee. */
export function calculatePayslip(state: BooksState, employee: Employee): Payslip {
  const rules = state.settings.payroll
  const gross = round2(employee.annualSalary / 12)
  const taxable = Math.max(0, gross - rules.personalAllowance / 12)
  const tax = round2(taxable * rules.basicRate)
  const ni = round2(Math.max(0, gross - rules.niThresholdMonthly) * rules.niRate)
  const pension = round2(gross * employee.pensionRate)
  return {
    employee: employee.id,
    gross,
    tax,
    ni,
    pension,
    net: round2(gross - tax - ni - pension),
  }
}

export function payRunTotals(run: Pick<PayRun, 'payslips'>) {
  const sum = (key: keyof Omit<Payslip, 'employee'>) =>
    round2(run.payslips.reduce((s, p) => s + p[key], 0))
  return {
    gross: sum('gross'),
    tax: sum('tax'),
    ni: sum('ni'),
    pension: sum('pension'),
    net: sum('net'),
  }
}

/** A draft pay run for a month, with a payslip for every employee. */
export function createPayRun(
  state: BooksState,
  period: string,
  payDate: string,
): { state: BooksState; id: string; problems: string[] } {
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return { state, id: '', problems: ['Choose the month to pay.'] }
  }
  if (state.payRuns.some((r) => r.period === period)) {
    return { state, id: '', problems: [`There is already a pay run for ${period}.`] }
  }
  if (state.employees.length === 0) {
    return { state, id: '', problems: ['There are no employees to pay.'] }
  }
  let n = state.payRuns.length + 1
  while (state.payRuns.some((r) => r.id === `pay${n}`)) n++
  const run: PayRun = {
    id: `pay${n}`,
    period,
    payDate,
    payslips: state.employees.map((e) => calculatePayslip(state, e)),
    status: 'draft',
  }
  return {
    state: { ...state, payRuns: [...state.payRuns, run] },
    id: run.id,
    problems: [],
  }
}

/** Recalculates a draft pay run (after an employee's details change). */
export function recalculatePayRun(state: BooksState, id: string): BooksState {
  return {
    ...state,
    payRuns: state.payRuns.map((r) =>
      r.id === id && r.status === 'draft'
        ? { ...r, payslips: state.employees.map((e) => calculatePayslip(state, e)) }
        : r,
    ),
  }
}

export function deleteDraftPayRun(state: BooksState, id: string): BooksState {
  return {
    ...state,
    payRuns: state.payRuns.filter((r) => !(r.id === id && r.status === 'draft')),
  }
}

/** Posts a draft pay run's journal. */
export function postPayRun(
  state: BooksState,
  id: string,
): { state: BooksState; problems: string[] } {
  const run = state.payRuns.find((r) => r.id === id)
  if (!run || run.status !== 'draft') return { state, problems: [] }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(run.payDate)) {
    return { state, problems: ['Enter the pay date.'] }
  }
  const t = payRunTotals(run)
  const journal = addPostedJournal(state, {
    date: run.payDate,
    memo: `Payroll for ${run.period}`,
    source: 'payroll',
    sourceId: run.id,
    lines: [
      { account: WAGES, description: 'Gross pay', debit: t.gross, credit: 0 },
      {
        account: PAYE_NI,
        description: 'Income tax and NI',
        debit: 0,
        credit: round2(t.tax + t.ni),
      },
      { account: PENSION, description: 'Employee pension', debit: 0, credit: t.pension },
      { account: BANK, description: 'Net pay', debit: 0, credit: t.net },
    ].filter((l) => l.debit !== 0 || l.credit !== 0),
  })
  return {
    state: {
      ...journal.state,
      payRuns: journal.state.payRuns.map((r) =>
        r.id === id ? { ...r, status: 'posted' as const, journalId: journal.id } : r,
      ),
    },
    problems: [],
  }
}

/** Adds or changes an employee. Returns problems if the details are not valid. */
export function saveEmployee(
  state: BooksState,
  employee: Omit<Employee, 'id'> & { id?: string },
): { state: BooksState; problems: string[] } {
  const problems: string[] = []
  if (employee.name.trim() === '') problems.push('Enter the employee’s name.')
  if (!(employee.annualSalary > 0)) problems.push('Enter the annual salary.')
  if (employee.pensionRate < 0 || employee.pensionRate > 0.5) {
    problems.push('The pension contribution must be between 0% and 50%.')
  }
  if (problems.length > 0) return { state, problems }
  if (employee.id) {
    return {
      state: {
        ...state,
        employees: state.employees.map((e) =>
          e.id === employee.id ? { ...e, ...employee, id: e.id } : e,
        ),
      },
      problems,
    }
  }
  let n = state.employees.length + 1
  while (state.employees.some((e) => e.id === `e${n}`)) n++
  return {
    state: {
      ...state,
      employees: [
        ...state.employees,
        { ...employee, name: employee.name.trim(), id: `e${n}` },
      ],
    },
    problems,
  }
}
